'use strict';

const { Inventory } = require('../models');
const { Op } = require('sequelize');

class InventoryService {
  /**
   * Buscar repuestos por criterios
   * @param {string} query - Término de búsqueda
   * @param {Object} filters - Filtros adicionales
   * @returns {Promise<Object>} - Lista de repuestos
   */
  async searchParts(query, filters = {}) {
    try {
      const {
        category,
        location,
        inStockOnly = true,
        minQuantity = 0,
        page = 1,
        limit = 20
      } = filters;

      // Construir condiciones de búsqueda
      const whereConditions = {};

      // Búsqueda por texto en nombre y detalles
      if (query && query.trim() !== '') {
        const searchTerm = `%${query.trim()}%`;
        whereConditions[Op.or] = [
          { part_name: { [Op.like]: searchTerm } },
          { details: { [Op.like]: searchTerm } }
        ];
      }

      // Filtro por categoría
      if (category) {
        whereConditions.category = category;
      }

      // Filtro por ubicación
      if (location) {
        whereConditions.location = location;
      }

      // Filtro de stock
      if (inStockOnly) {
        whereConditions.quantity = { [Op.gt]: 0 };
        whereConditions.status = 'disponible';
      }

      if (minQuantity > 0) {
        whereConditions.quantity = { [Op.gte]: minQuantity };
      }

      // Consultar inventario
      const { rows: inventories, count: total } = await Inventory.findAndCountAll({
        where: whereConditions,
        order: [['part_name', 'ASC']],
        limit: limit,
        offset: (page - 1) * limit
      });

      return {
        success: true,
        data: {
          parts: inventories.map(inv => ({
            id: inv.id,
            partName: inv.part_name,
            details: inv.details,
            quantity: inv.quantity,
            location: inv.location,
            status: inv.status,
            category: inv.category,
            imageUrl: inv.image_url,
            lastUpdated: inv.updatedAt
          })),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            limit: limit
          }
        }
      };

    } catch (error) {
      console.error('❌ Error buscando repuestos:', error);
      throw new Error(`Error al buscar repuestos: ${error.message}`);
    }
  }

  /**
   * Consultar disponibilidad específica
   * @param {number} id - ID del repuesto en inventario
   * @param {number} quantity - Cantidad solicitada (opcional)
   * @returns {Promise<Object>} - Disponibilidad
   */
  async checkAvailability(id, quantity = 1) {
    try {
      // Verificar que el repuesto existe
      const inventoryItem = await Inventory.findByPk(id);
      if (!inventoryItem) {
        throw new Error(`Repuesto con ID ${id} no encontrado`);
      }

      const isAvailable = inventoryItem.quantity >= quantity && inventoryItem.status === 'disponible';

      return {
      success: true,
      data: {
        inventoryId: inventoryItem.id,
        partName: inventoryItem.part_name,
        requestedQuantity: quantity,
        availableQuantity: inventoryItem.quantity,
        isAvailable: isAvailable,
        location: inventoryItem.location,
        status: inventoryItem.status,
        imageUrl: inventoryItem.image_url,
        recommendation: isAvailable ? 'AVAILABLE' : 'INSUFFICIENT_STOCK'
      }
    };

    } catch (error) {
      console.error('❌ Error consultando disponibilidad:', error);
      throw new Error(`Error al consultar disponibilidad: ${error.message}`);
    }
  }

  /**
   * Obtener inventario por ubicación
   * @param {string} location - Ubicación
   * @param {boolean} lowStockOnly - Solo productos con stock bajo
   * @returns {Promise<Object>} - Inventario de la ubicación
   */
  async getInventoryByLocation(location, lowStockOnly = false) {
    try {
      // Construir condiciones
      const whereConditions = { location: location };
      
      if (lowStockOnly) {
        whereConditions.quantity = { [Op.lte]: 2 }; // Stock bajo definido como <= 2
      }

      const inventories = await Inventory.findAll({
        where: whereConditions,
        order: [['quantity', 'ASC'], ['part_name', 'ASC']]
      });

      // Calcular estadísticas
      const totalParts = inventories.length;
      const lowStockCount = inventories.filter(inv => inv.quantity <= 2).length;

      return {
        success: true,
        data: {
          location: location,
          totalParts: totalParts,
          lowStockCount: lowStockCount,
          inventory: inventories.map(inv => ({
            id: inv.id,
            partName: inv.part_name,
            details: inv.details,
            quantity: inv.quantity,
            status: inv.status,
            category: inv.category,
            imageUrl: inv.image_url,
            lastUpdated: inv.updatedAt,
            isLowStock: inv.quantity <= 2
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo inventario por ubicación:', error);
      throw new Error(`Error al obtener inventario: ${error.message}`);
    }
  }

  /**
   * Descontar stock (usar repuesto)
   * @param {number} id - ID del repuesto en inventario
   * @param {number} quantity - Cantidad a descontar
   * @param {string} reason - Razón del descuento
   * @param {number} requestedBy - ID del usuario que solicita
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async deductStock(id, quantity, reason, requestedBy) {
    try {
      // Validaciones
      if (!id || !quantity || quantity <= 0) {
        throw new Error('id y quantity (> 0) son requeridos');
      }

      // Buscar inventario
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        throw new Error(`Repuesto con ID ${id} no encontrado`);
      }

      // Verificar stock suficiente
      if (inventory.quantity < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${inventory.quantity}, Solicitado: ${quantity}`);
      }

      // Descontar stock
      const newQuantity = inventory.quantity - quantity;
      const newStatus = newQuantity === 0 ? 'agotado' : 'disponible';

      await inventory.update({
        quantity: newQuantity,
        status: newStatus
      });

      console.log(`✅ Stock descontado - Item: ${inventory.part_name}, Qty: ${quantity}, Reason: ${reason}`);

      return {
        success: true,
        data: {
          inventoryId: inventory.id,
          partName: inventory.part_name,
          location: inventory.location,
          quantityDeducted: quantity,
          quantityBefore: inventory.quantity + quantity,
          quantityAfter: newQuantity,
          status: newStatus,
          reason: reason,
          requestedBy: requestedBy,
          deductedAt: new Date()
        },
        message: 'Stock descontado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error descontando stock:', error);
      throw new Error(`Error al descontar stock: ${error.message}`);
    }
  }

  /**
   * Registrar entrada de stock
   * @param {number} id - ID del repuesto en inventario (opcional)
   * @param {string} partName - Nombre del repuesto (si es nuevo)
   * @param {string} details - Detalles del repuesto
   * @param {number} quantity - Cantidad a agregar
   * @param {string} location - Ubicación
   * @param {string} category - Categoría
   * @param {string} imageUrl - URL de la imagen (opcional)
   * @param {string} source - Fuente de la entrada
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async addStock(id, partName, details, quantity, location, category, source, metadata = {}) {
    try {
      // Validaciones
      if (!quantity || quantity <= 0) {
        throw new Error('quantity (> 0) es requerido');
      }

      if (!location) {
        throw new Error('location es requerido');
      }

      let inventory;
      let isNewItem = false;

      if (id) {
        // Buscar item existente
        inventory = await Inventory.findByPk(id);
        if (!inventory) {
          throw new Error(`Repuesto con ID ${id} no encontrado`);
        }
      } else if (partName) {
        // Crear nuevo item
        isNewItem = true;
        const imageUrl = metadata.imageUrl || null;
        inventory = await Inventory.create({
          part_name: partName,
          details: details || '',
          quantity: 0,
          location: location,
          status: 'disponible',
          category: category || 'herramientas',
          image_url: imageUrl
        });
      } else {
        throw new Error('Debe proporcionar id de item existente o partName para item nuevo');
      }

      // Obtener cantidad antes
      const quantityBefore = inventory.quantity;

      // Agregar stock
      const newQuantity = inventory.quantity + quantity;
      await inventory.update({
        quantity: newQuantity,
        status: 'disponible' // Siempre disponible al agregar stock
      });

      console.log(`✅ Stock agregado - Item: ${inventory.part_name}, Qty: ${quantity}, Source: ${source}`);

      return {
        success: true,
        data: {
          inventoryId: inventory.id,
          partName: inventory.part_name,
          location: inventory.location,
          quantityAdded: quantity,
          quantityBefore: quantityBefore,
          quantityAfter: newQuantity,
          status: 'disponible',
          source: source,
          unitCost: metadata.unitCost,
          totalValue: metadata.unitCost ? metadata.unitCost * quantity : null,
          notes: metadata.notes,
          addedAt: new Date(),
          isNewItem: isNewItem
        },
        message: 'Stock agregado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error agregando stock:', error);
      throw new Error(`Error al agregar stock: ${error.message}`);
    }
  }

  /**
   * Transferir stock entre ubicaciones
   * @param {number} id - ID del repuesto en inventario
   * @param {string} toLocation - Ubicación destino
   * @param {number} quantity - Cantidad a transferir
   * @param {string} reason - Razón de la transferencia
   * @param {number} requestedBy - ID del usuario que solicita
   * @returns {Promise<Object>} - Resultado de la transferencia
   */
  async transferStock(id, toLocation, quantity, reason, requestedBy) {
    try {
      // Validaciones
      if (!id || !toLocation || !quantity || quantity <= 0) {
        throw new Error('id, toLocation y quantity (> 0) son requeridos');
      }

      // Verificar stock en ubicación origen
      const fromInventory = await Inventory.findByPk(id);
      if (!fromInventory) {
        throw new Error(`Repuesto con ID ${id} no encontrado`);
      }

      if (fromInventory.quantity < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${fromInventory.quantity}, Solicitado: ${quantity}`);
      }

      if (fromInventory.location === toLocation) {
        throw new Error('La ubicación origen y destino deben ser diferentes');
      }

      // Buscar o crear item en ubicación destino
      let toInventory = await Inventory.findOne({
        where: {
          part_name: fromInventory.part_name,
          location: toLocation
        }
      });

      const isNewDestination = !toInventory;

      if (isNewDestination) {
        // Crear nuevo item en destino
        toInventory = await Inventory.create({
          part_name: fromInventory.part_name,
          details: fromInventory.details,
          quantity: 0,
          location: toLocation,
          status: 'disponible',
          category: fromInventory.category
        });
      }

      // Ejecutar transferencia en transacción
      const quantityBeforeFrom = fromInventory.quantity;
      const quantityBeforeTo = toInventory.quantity;

      // Descontar de origen
      await fromInventory.update({
        quantity: fromInventory.quantity - quantity,
        status: fromInventory.quantity - quantity === 0 ? 'agotado' : 'disponible'
      });

      // Agregar a destino
      await toInventory.update({
        quantity: toInventory.quantity + quantity,
        status: 'disponible'
      });

      // Generar ID de transferencia
      const transferId = this.generateTransferId();

      console.log(`✅ Transferencia completada - TransferID: ${transferId}, Item: ${fromInventory.part_name}, Qty: ${quantity}, From: ${fromInventory.location} -> To: ${toLocation}`);

      return {
        success: true,
        data: {
          transferId: transferId,
          inventoryId: fromInventory.id,
          partName: fromInventory.part_name,
          fromLocation: {
            location: fromInventory.location,
            quantityBefore: quantityBeforeFrom,
            quantityAfter: fromInventory.quantity - quantity
          },
          toLocation: {
            location: toLocation,
            quantityBefore: quantityBeforeTo,
            quantityAfter: toInventory.quantity,
            isNew: isNewDestination
          },
          quantity: quantity,
          reason: reason,
          requestedBy: requestedBy,
          transferredAt: new Date()
        },
        message: 'Transferencia completada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en transferencia:', error);
      throw new Error(`Error en transferencia: ${error.message}`);
    }
  }

  /**
   * Obtener alertas de stock bajo
   * @param {string} location - Ubicación (opcional)
   * @param {string} severity - Nivel de severidad (ALL, CRITICAL, WARNING)
   * @returns {Promise<Object>} - Alertas de stock
   */
  async getLowStockAlerts(location, severity = 'ALL') {
    try {
      // Construir condiciones
      const whereConditions = {};
      
      if (location) {
        whereConditions.location = location;
      }

      // Definir niveles de severidad
      const severityLevels = {
        CRITICAL: 1,  // Stock <= 1
        WARNING: 5    // Stock <= 5
      };

      if (severity === 'CRITICAL') {
        whereConditions.quantity = { [Op.lte]: severityLevels.CRITICAL };
      } else if (severity === 'WARNING') {
        whereConditions.quantity = { [Op.lte]: severityLevels.WARNING };
      } else {
        whereConditions.quantity = { [Op.lte]: severityLevels.WARNING };
      }

      // Consultar inventarios con stock bajo
      const lowStockInventories = await Inventory.findAll({
        where: whereConditions,
        order: [['quantity', 'ASC'], ['part_name', 'ASC']]
      });

      // Procesar alertas
      const alerts = lowStockInventories.map(inventory => {
        const currentStock = inventory.quantity;
        let severityLevel = 'WARNING';
        let estimatedDaysUntilEmpty = null;

        if (currentStock <= 1) {
          severityLevel = 'CRITICAL';
        }

        // Estimar días hasta agotarse (simplificado)
        if (currentStock <= 1) {
          estimatedDaysUntilEmpty = currentStock === 0 ? 0 : 1;
        } else {
          estimatedDaysUntilEmpty = Math.ceil(currentStock / 2); // Estimación simple
        }

        return {
          inventoryId: inventory.id,
          partName: inventory.part_name,
          details: inventory.details,
          currentStock: currentStock,
          category: inventory.category,
          imageUrl: inventory.image_url,
          severity: severityLevel,
          location: inventory.location,
          lastUpdated: inventory.updatedAt,
          estimatedDaysUntilEmpty: estimatedDaysUntilEmpty
        };
      });

      // Calcular resumen
      const summary = {
        totalAlerts: alerts.length,
        critical: alerts.filter(alert => alert.severity === 'CRITICAL').length,
        warning: alerts.filter(alert => alert.severity === 'WARNING').length,
        locationsAffected: [...new Set(alerts.map(alert => alert.location))].length
      };

      return {
        success: true,
        data: {
          alerts: alerts,
          summary: summary
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo alertas de stock:', error);
      throw new Error(`Error al obtener alertas: ${error.message}`);
    }
  }

  /**
   * Generar ID único para transferencia
   * @returns {string} - ID único
   */
  generateTransferId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `TRF-${year}-${timestamp}`;
  }

  /**
   * Obtener estadísticas de inventario
   * @param {string} location - Ubicación (opcional)
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStatistics(location) {
    try {
      const whereConditions = location ? { location: location } : {};

      const [
        totalInventoryItems,
        lowStockCount,
        outOfStockCount,
        availableCount
      ] = await Promise.all([
        // Total de ítems en inventario
        Inventory.count({ where: whereConditions }),

        // Ítems con stock bajo
        Inventory.count({
          where: {
            ...whereConditions,
            quantity: { [Op.lte]: 2 }
          }
        }),

        // Ítems sin stock
        Inventory.count({
          where: {
            ...whereConditions,
            status: 'agotado'
          }
        }),

        // Ítems disponibles
        Inventory.count({
          where: {
            ...whereConditions,
            status: 'disponible'
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalInventoryItems: totalInventoryItems,
          lowStockCount: lowStockCount,
          outOfStockCount: outOfStockCount,
          availableCount: availableCount,
          location: location || null
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de inventario:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Buscar en inventario con filtros específicos para gestión de fallas
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} - Resultados de búsqueda
   */
  async searchInventory(filters = {}) {
    try {
      const { partName, category, location } = filters;
      
      const whereConditions = {};
      
      // Búsqueda por nombre del repuesto
      if (partName && partName.trim()) {
        const searchTerm = `%${partName.trim()}%`;
        whereConditions[Op.or] = [
          { part_name: { [Op.like]: searchTerm } },
          { details: { [Op.like]: searchTerm } }
        ];
      }
      
      // Filtro por categoría
      if (category) {
        whereConditions.category = category;
      }
      
      // Filtro por ubicación
      if (location) {
        whereConditions.location = location;
      }
      
      // Solo items disponibles con stock
      whereConditions.status = 'disponible';
      whereConditions.quantity = { [Op.gt]: 0 };
      
      const inventories = await Inventory.findAll({
        where: whereConditions,
        order: [['quantity', 'DESC'], ['part_name', 'ASC']]
      });
      
      return inventories.map(inv => ({
        inventory_id: inv.id,
        item_name: inv.part_name,
        description: inv.details,
        quantity_available: inv.quantity,
        location: inv.location,
        category: inv.category,
        status: inv.status,
        image_url: inv.image_url,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt
      }));
    } catch (error) {
      console.error('Error buscando en inventario:', error);
      throw error;
    }
  }

  /**
   * Verificar disponibilidad automática de repuesto
   * @param {Object} params - Parámetros de búsqueda
   * @returns {Promise<Array>} - Items disponibles
   */
  async checkAvailability(params = {}) {
    try {
      const { partName, category } = params;
      
      const whereConditions = {
        status: 'disponible',
        quantity: { [Op.gt]: 0 }
      };
      
      if (partName && partName.trim()) {
        const searchTerm = `%${partName.trim()}%`;
        whereConditions[Op.or] = [
          { part_name: { [Op.like]: searchTerm } }
        ];
      }
      
      if (category) {
        whereConditions.category = category;
      }
      
      const items = await Inventory.findAll({
        where: whereConditions,
        order: [['quantity', 'DESC'], ['part_name', 'ASC']]
      });
      
      return items.map(item => ({
        inventory_id: item.id,
        item_name: item.part_name,
        description: item.details,
        quantity_available: item.quantity,
        location: item.location,
        category: item.category,
        status: item.status,
        image_url: item.image_url
      }));
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      throw error;
    }
  }

  /**
   * Usar repuesto del inventario (descuento automático)
   * @param {Object} params - Parámetros de uso
   * @returns {Promise<Object>} - Resultado del uso
   */
  async usePartFromInventory(params = {}) {
    try {
      const { partId, quantity, userId, reason, partData } = params;
      
      // Validar existencia del repuesto
      const inventory = await Inventory.findByPk(partId);
      if (!inventory) {
        throw new Error(`Repuesto con ID ${partId} no encontrado`);
      }
      
      // Validar disponibilidad
      if (inventory.quantity < quantity) {
        throw new Error(`Cantidad insuficiente. Disponible: ${inventory.quantity}, Solicitado: ${quantity}`);
      }
      
      // Realizar descuento
      const newQuantity = inventory.quantity - quantity;
      const newStatus = newQuantity === 0 ? 'agotado' : 'disponible';
      
      await inventory.update({
        quantity: newQuantity,
        status: newStatus
      });
      
      return {
        success: true,
        updatedInventory: {
          id: inventory.id,
          part_name: inventory.part_name,
          quantity: newQuantity,
          status: newStatus,
          location: inventory.location
        }
      };
    } catch (error) {
      console.error('Error usando repuesto del inventario:', error);
      throw error;
    }
  }

  /**
   * Crear registro de uso de repuesto
   * @param {Object} params - Datos del registro
   * @returns {Promise<Object>} - Registro creado
   */
  async createUsageRecord(params = {}) {
    try {
      const { inventoryId, userId, quantityUsed, reason, partData, usageType } = params;
      
      // Si no existe el modelo InventoryUsage, crear registro en una tabla temporal
      // o registrar en logs para auditoría
      const usageRecord = {
        id: `USAGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        inventory_id: inventoryId,
        user_id: userId,
        quantity_used: quantityUsed,
        reason: reason,
        part_data: JSON.stringify(partData),
        usage_type: usageType || 'FALLA_CHECKLIST',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Aquí deberías guardar en una tabla de uso de inventario si existe
      console.log('Registro de uso de repuesto:', usageRecord);
      
      return usageRecord;
    } catch (error) {
      console.error('Error creando registro de uso:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de uso de repuestos
   * @param {Object} params - Parámetros de búsqueda
   * @returns {Promise<Array>} - Historial de usos
   */
  async getUsageHistory(params = {}) {
    try {
      const { inventoryId, userId, limit = 50 } = params;
      
      // Simulación de historial de uso (debería consultarse de una tabla real)
      const mockHistory = [
        {
          id: 'USAGE_001',
          inventory_id: inventoryId,
          user_id: userId,
          quantity_used: 1,
          reason: 'Falla en checklist',
          usage_type: 'FALLA_CHECKLIST',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
          part_data: { name: 'Motor 12V', category: 'Motor' }
        }
      ];
      
      return mockHistory.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo historial de uso:', error);
      throw error;
    }
  }

  /**
   * Obtener item de inventario por ID
   * @param {number} id - ID del item
   * @returns {Promise<Object|null>} - Item encontrado
   */
  async getInventoryById(id) {
    try {
      const inventory = await Inventory.findByPk(id);
      return inventory;
    } catch (error) {
      console.error('Error obteniendo inventario por ID:', error);
      throw error;
    }
  }

  /**
   * Obtener registro de uso por ID
   * @param {string} usageId - ID del registro de uso
   * @returns {Promise<Object|null>} - Registro encontrado
   */
  async getUsageRecordById(usageId) {
    try {
      // Simulación - debería consultarse de una tabla real
      const mockRecord = {
        id: usageId,
        inventory_id: 1,
        user_id: 1,
        quantity_used: 1,
        reason: 'Falla en checklist',
        usage_type: 'FALLA_CHECKLIST',
        created_at: new Date()
      };
      
      return mockRecord;
    } catch (error) {
      console.error('Error obteniendo registro de uso:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();
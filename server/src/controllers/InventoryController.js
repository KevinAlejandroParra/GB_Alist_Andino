'use strict';

const InventoryService = require('../services/InventoryService');

class InventoryController {
  /**
   * Buscar repuestos en inventario
   * GET /api/inventory/search
   */
  async searchParts(req, res) {
    try {
      const {
        q = '',
        category,
        location,
        locationId,
        inStockOnly = 'true',
        minQuantity = '0',
        page = '1',
        limit = '20'
      } = req.query;

      // Construir filtros
      const filters = {
        category,
        // Preferir `location` (nombre/etiqueta). Mantener `locationId` por compatibilidad,
        // pero el servicio actualmente espera `location` como cadena.
        location: location || undefined,
        locationId: locationId ? parseInt(locationId) : undefined,
        inStockOnly: inStockOnly === 'true',
        minQuantity: parseInt(minQuantity),
        page: parseInt(page),
        limit: parseInt(limit)
      };

      // Llamar al servicio
      const result = await InventoryService.searchParts(q, filters);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en searchParts:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_PARTS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Consultar disponibilidad específica
   * GET /api/inventory/:partId/availability
   */
  async checkAvailability(req, res) {
    try {
      const { partId } = req.params;
      const { locationId, quantity = '1' } = req.query;

      if (isNaN(parseInt(partId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PART_ID',
            message: 'ID de repuesto inválido'
          }
        });
      }

      // Llamar al servicio
      const result = await InventoryService.checkAvailability(
        parseInt(partId),
        locationId ? parseInt(locationId) : undefined,
        parseInt(quantity)
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en checkAvailability:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_AVAILABILITY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener inventario por ubicación
   * GET /api/inventory/location/:locationId
   */
  async getInventoryByLocation(req, res) {
    try {
      const { locationId } = req.params;
      const { lowStockOnly = 'false' } = req.query;

      if (isNaN(parseInt(locationId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LOCATION_ID',
            message: 'ID de ubicación inválido'
          }
        });
      }

      // Llamar al servicio
      const result = await InventoryService.getInventoryByLocation(
        parseInt(locationId),
        lowStockOnly === 'true'
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getInventoryByLocation:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_INVENTORY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Descontar stock (usar repuesto)
   * POST /api/inventory/deduct
   */
  async deductStock(req, res) {
    try {
      const {
        partId,
        quantity,
        reason,
        requestedBy
      } = req.body;

      if (!partId || !quantity || !reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'partId, quantity y reason son requeridos'
          }
        });
      }

      if (isNaN(parseInt(partId)) || isNaN(parseInt(quantity))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'Los campos partId y quantity deben ser números'
          }
        });
      }

      const finalRequestedBy = requestedBy || req.user.user_id;

      // Llamar al servicio
      const result = await InventoryService.deductStock(
        parseInt(partId),
        parseInt(quantity),
        reason,
        finalRequestedBy
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en deductStock:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DEDUCT_STOCK_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Registrar entrada de stock
   * POST /api/inventory/stock-in
   */
  async addStock(req, res) {
    try {
      const {
        partId,
        partName,
        details,
        location,
        category,
        quantity,
        source,
        unitCost,
        notes
      } = req.body;

      if ((!partId && !partName) || !location || !quantity || !source) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'partId o partName, location, quantity y source son requeridos'
          }
        });
      }

      if (partId && isNaN(parseInt(partId)) || isNaN(parseInt(quantity))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'Los campos partId y quantity deben ser números'
          }
        });
      }

      // Llamar al servicio
      const result = await InventoryService.addStock(
        partId ? parseInt(partId) : undefined,
        partName,
        details,
        parseInt(quantity),
        location,
        category,
        source,
        { unitCost, notes }
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en addStock:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ADD_STOCK_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Transferir stock entre ubicaciones
   * POST /api/inventory/transfer
   */
  async transferStock(req, res) {
    try {
      const {
        partId,
        toLocation,
        quantity,
        reason,
        requestedBy
      } = req.body;

      if (!partId || !toLocation || !quantity || !reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'partId, toLocation, quantity y reason son requeridos'
          }
        });
      }

      if (isNaN(parseInt(partId)) || isNaN(parseInt(quantity))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'Los campos partId y quantity deben ser válidos'
          }
        });
      }

      const finalRequestedBy = requestedBy || req.user.user_id;

      // Llamar al servicio
      const result = await InventoryService.transferStock(
        parseInt(partId),
        toLocation,
        parseInt(quantity),
        reason,
        finalRequestedBy
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en transferStock:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'TRANSFER_STOCK_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Actualizar metadata de un item de inventario
   * PUT /api/inventory/:id
   */
  async updateInventory(req, res) {
    try {
      const { id } = req.params;
      const { partName, details, location, category, quantity } = req.body;

      if (isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INVENTORY_ID',
            message: 'ID de inventario inválido'
          }
        });
      }

      const result = await InventoryService.updateInventoryItem(parseInt(id), {
        part_name: partName,
        details,
        location,
        category,
        quantity
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en updateInventory:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_INVENTORY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener alertas de stock bajo
   * GET /api/inventory/low-stock-alerts
   */
  async getLowStockAlerts(req, res) {
    try {
      const { locationId, severity = 'ALL' } = req.query;

      // Llamar al servicio
      const result = await InventoryService.getLowStockAlerts(
        locationId ? parseInt(locationId) : undefined,
        severity
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getLowStockAlerts:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LOW_STOCK_ALERTS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener estadísticas de inventario
   * GET /api/inventory/statistics
   */
  async getStatistics(req, res) {
    try {
      const { locationId } = req.query;

      // Llamar al servicio
      const result = await InventoryService.getStatistics(
        locationId ? parseInt(locationId) : undefined
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getStatistics:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_INVENTORY_STATISTICS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener inventario general (método de compatibilidad)
   * GET /api/inventory/
   */
  async getInventory(req, res) {
    try {
      const { page = '1', limit = '20' } = req.query;

      // Llamar al servicio para obtener todo el inventario
      const result = await InventoryService.searchParts('', {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getInventory:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_INVENTORY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Buscar inventario (alias de searchParts)
   * GET /api/inventory/search
   */
  async searchInventory(req, res) {
    return this.searchParts(req, res);
  }

  /**
   * Obtener repuesto por ID (alias de checkAvailability)
   * GET /api/inventory/part/:id
   */
  async getPartById(req, res) {
    try {
      const { id } = req.params;
      const { locationId, quantity = '1' } = req.query;

      if (isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PART_ID',
            message: 'ID de repuesto inválido'
          }
        });
      }

      // Llamar al servicio
      const result = await InventoryService.checkAvailability(
        parseInt(id),
        locationId ? parseInt(locationId) : undefined,
        parseInt(quantity)
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getPartById:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_PART_BY_ID_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Usar repuesto (alias de deductStock)
   * POST /api/inventory/use
   */
  async usePart(req, res) {
    return this.deductStock(req, res);
  }

  /**
   * Verificar disponibilidad de repuesto para gestión automática
   * GET /api/inventory/check-availability
   */
  async checkAvailability(req, res) {
    try {
      const { partName, category } = req.query;
      
      if (!partName && !category) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Se requiere partName o category para la búsqueda'
          }
        });
      }

      // Usar el servicio extendido para búsqueda avanzada
      const results = await InventoryService.searchInventory({
        partName,
        category,
        location: req.query.location
      });

      res.status(200).json({
        success: true,
        data: results,
        available: results.length > 0,
        message: `Se encontraron ${results.length} resultados`
      });

    } catch (error) {
      console.error('❌ Error en checkAvailability:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_AVAILABILITY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Usar repuesto para falla (gestión automática)
   * POST /api/inventory/use-part
   */
  async usePartForFailure(req, res) {
    try {
      const { partId, quantity, partData, reason } = req.body;
      const userId = req.user.user_id;

      if (!partId || !quantity || !reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'partId, quantity y reason son requeridos'
          }
        });
      }

      if (isNaN(parseInt(partId)) || isNaN(parseInt(quantity))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'Los campos partId y quantity deben ser números'
          }
        });
      }

      // Validar existencia del repuesto
      const inventoryItem = await InventoryService.getInventoryById(partId);
      if (!inventoryItem) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Repuesto no encontrado en inventario'
          }
        });
      }

      // Validar disponibilidad
      if (inventoryItem.quantity < quantity) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cantidad insuficiente en inventario',
            available: inventoryItem.quantity,
            requested: quantity
          }
        });
      }

      // Realizar descuento del inventario
      const usageResult = await InventoryService.usePartFromInventory({
        partId,
        quantity,
        userId,
        reason,
        partData
      });

      // Crear registro de uso
      const usageRecord = await InventoryService.createUsageRecord({
        inventoryId: partId,
        userId,
        quantityUsed: quantity,
        reason,
        partData,
        usageType: 'FALLA_CHECKLIST'
      });

      res.status(200).json({
        success: true,
        data: {
          usageId: usageRecord.id,
          inventoryUsageId: usageRecord.id,
          updatedInventory: usageResult.updatedInventory,
          usageRecord
        },
        message: `Se usaron ${quantity} unidad(es) del repuesto`
      });

    } catch (error) {
      console.error('❌ Error usando repuesto para falla:', error);
      res.status(400).json({
        success: false,
        error: {
          message: 'Error al usar repuesto del inventario',
          details: error.message
        }
      });
    }
  }

  /**
   * Obtener historial de uso de repuestos
   * GET /api/inventory/usage-history
   */
  async getUsageHistory(req, res) {
    try {
      const { inventoryId, userId, limit = 50 } = req.query;

      // Usar el servicio extendido para historial
      const history = await InventoryService.getUsageHistory({
        inventoryId,
        userId,
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        data: history,
        message: `Historial de ${history.length} usos`
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial de uso:', error);
      res.status(400).json({
        success: false,
        error: {
          message: 'Error al obtener historial de uso',
          details: error.message
        }
      });
    }
  }

  /**
   * Decrementar cantidad de inventario
   * PUT /api/inventory/:id/decrement
   */
  async decrementQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason, workOrderId } = req.body;
      const inventoryId = parseInt(id);

      if (isNaN(inventoryId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INVENTORY_ID',
            message: 'ID de inventario inválido'
          }
        });
      }

      if (!quantity || isNaN(parseInt(quantity))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Cantidad inválida'
          }
        });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: 'Razón es requerida'
          }
        });
      }

      const result = await InventoryService.deductStock(
        inventoryId,
        parseInt(quantity),
        reason,
        req.user.user_id
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Se descontaron ${quantity} unidades del inventario`
      });

    } catch (error) {
      console.error('❌ Error decrementando cantidad:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DECREMENT_QUANTITY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Incrementar cantidad de inventario
   * PUT /api/inventory/:id/increment
   */
  async incrementQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason, workOrderId } = req.body;
      const inventoryId = parseInt(id);

      if (isNaN(inventoryId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INVENTORY_ID',
            message: 'ID de inventario inválido'
          }
        });
      }

      if (!quantity || isNaN(parseInt(quantity))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Cantidad inválida'
          }
        });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: 'Razón es requerida'
          }
        });
      }

      // Incrementar inventario
      const inventoryItem = await InventoryService.getInventoryById(inventoryId);
      if (!inventoryItem) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'INVENTORY_NOT_FOUND',
            message: 'Item de inventario no encontrado'
          }
        });
      }

      const currentQuantity = inventoryItem.quantity_available !== undefined
        ? inventoryItem.quantity_available
        : inventoryItem.quantity || 0;

      const newQuantity = currentQuantity + parseInt(quantity);
      
      const updateField = inventoryItem.quantity_available !== undefined
        ? { quantity_available: newQuantity }
        : { quantity: newQuantity };

      await inventoryItem.update(updateField);

      res.status(200).json({
        success: true,
        data: {
          inventoryId,
          previousQuantity: currentQuantity,
          addedQuantity: parseInt(quantity),
          newQuantity: newQuantity
        },
        message: `Se agregaron ${quantity} unidades al inventario. Stock actual: ${newQuantity}`
      });

    } catch (error) {
      console.error('❌ Error incrementando cantidad:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'INCREMENT_QUANTITY_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = new InventoryController();
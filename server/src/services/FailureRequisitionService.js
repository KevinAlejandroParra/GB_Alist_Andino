'use strict';

const { FailureOrder, WorkOrder, Requisition, Inventory, User, RepairExecution, WorkOrderPart, ChecklistItem, Checklist } = require('../models');
const repairExecutionService = require('./repairExecutionService');
const InventoryService = require('./InventoryService');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

class FailureRequisitionService {
  /**
   * Crear una falla con requisición automática
   * @param {Object} data - Datos de la falla
   * @returns {Promise<Object>} - Resultado de la creación
   */
  async createFailureWithRequisition(data) {
    const transaction = await FailureOrder.sequelize.transaction();

    try {
      // 📥 DEBUG: Log de datos recibidos en el servicio
      console.log('📋 [FailureRequisitionService] createFailureWithRequisition - Datos recibidos:')
      console.log('  - data:', data)

      const {
        checklist_item_id,
        description,
        severity = 'LEVE',
        evidenceUrl = null,
        requires_replacement = false,
        part_info = null,
        reported_by_id,
        assigned_technician
      } = data;

      // 📤 DEBUG: Log de valores extraídos y preparados
      console.log('🔍 [FailureRequisitionService] Valores a usar para crear falla:')
      console.log('  - checklist_item_id:', checklist_item_id, typeof checklist_item_id)
      console.log('  - description:', description)
      console.log('  - severity:', severity)
      console.log('  - evidenceUrl:', evidenceUrl)
      console.log('  - requires_replacement:', requires_replacement, typeof requires_replacement)
      console.log('  - part_info:', part_info)

      // 1. Generar IDs únicos
      const failure_order_id = `OF-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const work_order_id = `OT-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

      // 2. Crear FailureOrder
      console.log('📤 [FailureRequisitionService] Creando FailureOrder con requires_replacement =', requires_replacement)
      
      const failureOrder = await FailureOrder.create({
        failure_order_id,
        description,
        severity,
        evidence_url: evidenceUrl,
        requires_replacement,
        requested_part_info: requires_replacement ? part_info : null,
        reported_by_id,
        assigned_technician: assigned_technician || 'TECNICO',
        checklist_item_id,
        status: 'REPORTADO'
      }, { transaction });

      // 📤 DEBUG: Log después de crear para verificar el valor guardado
      console.log('✅ [FailureRequisitionService] FailureOrder creada:')
      console.log('  - ID:', failureOrder.id)
      console.log('  - requires_replacement guardado:', failureOrder.requires_replacement, typeof failureOrder.requires_replacement)
      console.log('  - requested_part_info:', failureOrder.requested_part_info)

      // 3. Crear AR (siempre) y OT formal solo si hay repuesto
      const repairExecution = await RepairExecution.create({
        repair_execution_id: work_order_id.replace(/^OT-/, 'AR-'),
        failure_order_id: failureOrder.id,
        status: 'EN_PROCESO',
        linked_failure_ids: JSON.stringify([failureOrder.id])
      }, { transaction });

      let workOrder = null;
      if (requires_replacement) {
        workOrder = await WorkOrder.create({
          work_order_id,
          failure_order_id: failureOrder.id,
          repair_execution_id: repairExecution.id,
          requiere_replacement: true,
          status: 'EN_PROCESO',
          linked_failure_ids: JSON.stringify([failureOrder.id])
        }, { transaction });
      }

      let requisition = null;

      // 4. Si requiere repuesto, crear Requisition
      if (requires_replacement && part_info && workOrder) {
        // Permitir both camelCase `imageUrl` y snake_case `image_url`
        const imageUrlValue = part_info.image_url || part_info.imageUrl || null;
        requisition = await Requisition.create({
          status: 'SOLICITADO',
          part_reference: part_info.name || 'Repuesto no especificado',
          quantity_requested: part_info.quantity || 1,
          image_url: imageUrlValue,
          work_order_id: workOrder.id,
          requested_by_id: reported_by_id
        }, { transaction });
      }

      // 5. Confirmar transacción
      await transaction.commit();

      // 6. Retornar resultado con relaciones (fuera de la transacción)
      const result = {
        success: true,
        data: {
          failure_order_id: failureOrder.failure_order_id,
          failure_order: failureOrder,
          work_order_id: workOrder.work_order_id,
          work_order: workOrder,
          requisition: requisition ? {
            id: requisition.id,
            status: requisition.status,
            part_reference: requisition.part_reference
          } : null
        },
        message: 'Falla creada exitosamente con requisición automática'
      };

      return result;

    } catch (error) {
      // Solo hacer rollback si la transacción no ha sido completada
      if (transaction.finished !== 'committed' && transaction.finished !== 'uncommitted') {
        await transaction.rollback();
      }
      console.error('❌ Error creando falla con requisición:', error);
      throw new Error(`Error al crear falla con requisición: ${error.message}`);
    }
  }

  /**
   * Aprobar requisición y agregar al inventario
   * @param {number} requisitionId - ID de la requisición
   * @param {Object} data - Datos para agregar al inventario
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async approveAndAddToInventory(requisitionId, data) {
    const transaction = await Requisition.sequelize.transaction();
    
    try {
      // 1. Buscar requisición
      const requisition = await Requisition.findByPk(requisitionId);
      if (!requisition) {
        throw new Error(`Requisición con ID ${requisitionId} no encontrada`);
      }

      if (requisition.status !== 'SOLICITADO') {
        throw new Error('Solo se pueden aprobar requisiciones en estado SOLICITADO');
      }

      const {
        action, // 'create_new' o 'add_to_existing'
        part_name,
        details,
        quantity,
        location,
        category,
        image_url,
        inventory_id
      } = data;

      let inventoryItem = null;
      const currentTime = new Date();

      // 2. Si action = 'create_new', crear nuevo item en inventario
      if (action === 'create_new') {
        inventoryItem = await Inventory.create({
          part_name,
          details,
          quantity,
          location,
          category,
          image_url: image_url || requisition.image_url,
          status: quantity > 0 ? 'disponible' : 'agotado'
        }, { transaction });
      }
      // 3. Si action = 'add_to_existing', actualizar item existente
      else if (action === 'add_to_existing') {
        if (!inventory_id) {
          throw new Error('inventory_id es requerido para agregar a item existente');
        }

        inventoryItem = await Inventory.findByPk(inventory_id);
        if (!inventoryItem) {
          throw new Error(`Item de inventario con ID ${inventory_id} no encontrado`);
        }

        // Actualizar cantidad
        const newQuantity = inventoryItem.quantity + quantity;
        await inventoryItem.update({
          quantity: newQuantity,
          status: newQuantity > 0 ? 'disponible' : 'agotado'
        }, { transaction });
      } else {
        throw new Error('action debe ser "create_new" o "add_to_existing"');
      }

      // 4. Actualizar requisición (solo campos que existen)
      await requisition.update({
        status: 'RECIBIDO',
        notes: `${requisition.notes || ''} [AGREGADO AL INVENTARIO: ${inventoryItem.part_name}]`
      }, { transaction });

      // 5. Actualizar failure_order a través del work_order si existe
      if (requisition.work_order_id) {
        const workOrder = await WorkOrder.findByPk(requisition.work_order_id);
        if (workOrder && workOrder.failure_order_id) {
          const failureOrder = await FailureOrder.findByPk(workOrder.failure_order_id);
          if (failureOrder) {
            await failureOrder.update({
              status: 'EN_REPARACION'
            }, { transaction });
          }
        }
      }

      // 6. Confirmar transacción
      await transaction.commit();

      // 7. Retornar resultado
      return {
        success: true,
        data: {
          requisition: await Requisition.findByPk(requisitionId, {
            include: [
              { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
              {
                model: WorkOrder,
                as: 'workOrder',
                include: [
                  { model: FailureOrder, as: 'failureOrder', attributes: ['id', 'failure_order_id', 'description'] }
                ]
              }
            ]
          }),
          inventory_item: inventoryItem
        },
        message: 'Requisición aprobada y agregada al inventario exitosamente'
      };

    } catch (error) {
      // Revertir transacción en caso de error
      await transaction.rollback();
      console.error('❌ Error aprobando requisición:', error);
      throw new Error(`Error al aprobar requisición: ${error.message}`);
    }
  }

  /**
   * Resolver falla usando repuesto del inventario
   * @param {number} failureOrderId - ID de la orden de falla
   * @param {Object} data - Datos de la resolución
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async resolveFailureWithPart(failureOrderId, data) {
    const transaction = await FailureOrder.sequelize.transaction();

    try {
      // 1. Buscar failure order con relaciones
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [
          { model: WorkOrder, as: 'workOrder' },
          { model: ChecklistItem, as: 'checklistItem' }
        ]
      });
      if (!failureOrder) {
        throw new Error(`Orden de falla con ID ${failureOrderId} no encontrada`);
      }

      if (failureOrder.status === 'RESUELTO' || failureOrder.status === 'CERRADO') {
        throw new Error('La falla ya está resuelta o cerrada');
      }

      const {
        inventory_id,
        quantity_used,
        resolution_details,
        completed_by_id
      } = data;

      // 2. Descontar del inventario usando InventoryService
      const deductResult = await InventoryService.deductStock(
        inventory_id,
        quantity_used,
        `Resolución de falla OF-${failureOrder.failure_order_id}`,
        completed_by_id
      );

      // 3. Actualizar failure order
      await failureOrder.update({
        status: 'RESUELTO',
        resolution_details,
        resolved_at: new Date()
      }, { transaction });

      // 4. Actualizar work order si existe y crear WorkOrderPart
      const workOrder = await WorkOrder.findOne({
        where: { failure_order_id: failureOrderId }
      });

      if (workOrder) {
        await workOrder.update({
          status: 'COMPLETADO',
          completed_at: new Date()
        }, { transaction });

        // Crear WorkOrderPart para registrar el repuesto usado
        await WorkOrderPart.create({
          work_order_id: workOrder.id,
          inventory_id: inventory_id,
          quantity_used: quantity_used
        }, { transaction });
      }

      // 5. Poblar checklist_id en requisiciones asociadas
      if (workOrder) {
        const requisitions = await Requisition.findAll({
          where: { work_order_id: workOrder.id, checklist_id: null }
        });
        if (requisitions.length > 0) {
          let checklistId = null;
          if (failureOrder.checklistItem) {
            const checklist = await Checklist.findOne({
              where: { checklist_type_id: failureOrder.checklistItem.checklist_type_id },
              attributes: ['checklist_id'],
              order: [['createdAt', 'DESC']],
              transaction
            });
            if (checklist) {
              checklistId = checklist.checklist_id;
            }
          }
          if (checklistId) {
            await Requisition.update(
              { checklist_id: checklistId },
              { where: { id: { [Op.in]: requisitions.map(r => r.id) } }, transaction }
            );
          }
        }
      }

      // 6. Confirmar transacción
      await transaction.commit();

      // 7. Retornar resultado
      return {
        success: true,
        data: {
          failure_order: await FailureOrder.findByPk(failureOrderId, {
            include: [
              { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
              { model: User, as: 'technician', attributes: ['user_id', 'user_name'] },
              { model: WorkOrder, as: 'workOrder', include: [{ model: WorkOrderPart, as: 'parts' }] }
            ]
          }),
          inventory_item: await Inventory.findByPk(inventory_id),
          work_order: workOrder
        },
        message: 'Falla resuelta exitosamente usando repuesto del inventario'
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error resolviendo falla:', error);
      throw new Error(`Error al resolver falla: ${error.message}`);
    }
  }

  /**
   * Obtener repuestos disponibles para una falla
   * @param {number} failureOrderId - ID de la orden de falla
   * @returns {Promise<Object>} - Repuestos disponibles
   */
  async getAvailablePartsForFailure(failureOrderId) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId);
      if (!failureOrder) {
        throw new Error(`Orden de falla con ID ${failureOrderId} no encontrada`);
      }

      // Buscar items de inventario disponibles
      const availableItems = await Inventory.findAll({
        where: {
          quantity: { [Op.gt]: 0 },
          status: 'disponible'
        },
        order: [['part_name', 'ASC']]
      });

      const requestedPart = failureOrder.requested_part_info;

      // Marcar cuáles son similares al solicitado
      const itemsWithSimilarity = availableItems.map(item => {
        let isRequested = false;
        let similarity = 0;

        if (requestedPart) {
          // Verificar si el nombre es similar
          const itemName = item.part_name.toLowerCase();
          const requestedName = requestedPart.name ? requestedPart.name.toLowerCase() : '';
          
          if (itemName.includes(requestedName) || requestedName.includes(itemName)) {
            isRequested = true;
            similarity = 0.8;
          }
        }

        return {
          id: item.id,
          part_name: item.part_name,
          details: item.details,
          quantity: item.quantity,
          location: item.location,
          category: item.category,
          image_url: item.image_url,
          is_requested: isRequested,
          similarity: similarity,
          lastUpdated: item.updatedAt
        };
      });

      return {
        success: true,
        data: {
          requested_part: requestedPart,
          available_in_inventory: itemsWithSimilarity
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo repuestos disponibles:', error);
      throw new Error(`Error al obtener repuestos disponibles: ${error.message}`);
    }
  }
}

module.exports = new FailureRequisitionService();
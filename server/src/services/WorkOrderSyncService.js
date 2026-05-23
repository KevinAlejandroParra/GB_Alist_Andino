'use strict';

const { WorkOrder, WorkOrderPart, Inventory } = require('../models');

/**
 * Servicio para sincronizar WorkOrders enlazadas
 * Cuando múltiples fallas comparten información de OT, este servicio
 * mantiene sincronizadas todas las WorkOrders relacionadas
 */
class WorkOrderSyncService {
  /**
   * Sincronizar todas las WorkOrders enlazadas cuando una se actualiza
   * @param {number} workOrderId - ID de la WorkOrder que se actualizó
   * @param {Object} updateData - Datos que se actualizaron
   */
  async syncLinkedWorkOrders(workOrderId, updateData) {
    try {
      console.log('🔄 [SYNC] Iniciando sincronización de WorkOrders enlazadas');
      console.log('🔄 [SYNC] WorkOrder ID:', workOrderId);

      // Obtener la WorkOrder actualizada
      const workOrder = await WorkOrder.findByPk(workOrderId);
      
      if (!workOrder) {
        console.log('❌ [SYNC] WorkOrder no encontrada');
        return { success: false, message: 'WorkOrder no encontrada' };
      }

      // Verificar si tiene fallas enlazadas
      if (!workOrder.linked_failure_ids) {
        console.log('ℹ️ [SYNC] No hay fallas enlazadas, no se requiere sincronización');
        return { success: true, message: 'No hay fallas enlazadas', synced: 0 };
      }

      let linkedFailureIds = [];
      try {
        linkedFailureIds = JSON.parse(workOrder.linked_failure_ids);
      } catch (e) {
        console.error('❌ [SYNC] Error parseando linked_failure_ids:', e);
        return { success: false, message: 'Error parseando linked_failure_ids' };
      }

      console.log('🔄 [SYNC] Fallas enlazadas encontradas:', linkedFailureIds);

      // Obtener todas las WorkOrders de las fallas enlazadas (excepto la actual)
      const linkedWorkOrders = await WorkOrder.findAll({
        where: {
          failure_order_id: linkedFailureIds,
          id: { [require('sequelize').Op.ne]: workOrderId } // Excluir la actual
        }
      });

      console.log('🔄 [SYNC] WorkOrders a sincronizar:', linkedWorkOrders.length);

      // Campos sincronizables (excluir campos únicos como id, work_order_id, failure_order_id)
      const syncableFields = [
        'status',
        'requiere_replacement',
        'activity_performed',
        'evidence_url',
        'closure_signature',
        'start_time',
        'end_time',
        'resolved_by_id'
      ];

      // Filtrar solo los campos que están en updateData y son sincronizables
      const fieldsToSync = {};
      for (const field of syncableFields) {
        if (updateData.hasOwnProperty(field)) {
          fieldsToSync[field] = updateData[field];
        }
      }

      console.log('🔄 [SYNC] Campos a sincronizar:', Object.keys(fieldsToSync));

      // Actualizar todas las WorkOrders enlazadas
      let syncedCount = 0;
      for (const linkedWO of linkedWorkOrders) {
        await linkedWO.update(fieldsToSync);
        syncedCount++;
        console.log(`✅ [SYNC] WorkOrder ${linkedWO.work_order_id} sincronizada`);
      }

      console.log(`✅ [SYNC] Sincronización completada: ${syncedCount} WorkOrders actualizadas`);

      return {
        success: true,
        message: `${syncedCount} WorkOrders sincronizadas exitosamente`,
        synced: syncedCount,
        fields: Object.keys(fieldsToSync)
      };

    } catch (error) {
      console.error('❌ [SYNC] Error sincronizando WorkOrders:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Sincronizar repuestos entre WorkOrders enlazadas
   * @param {number} workOrderId - ID de la WorkOrder que se actualizó
   */
  async syncLinkedWorkOrderParts(workOrderId) {
    try {
      console.log('🔄 [SYNC PARTS] Iniciando sincronización de repuestos');

      // Obtener la WorkOrder actualizada con sus repuestos
      const workOrder = await WorkOrder.findByPk(workOrderId, {
        include: [
          {
            model: WorkOrderPart,
            as: 'parts',
            include: [
              {
                model: Inventory,
                as: 'inventory'
              }
            ]
          }
        ]
      });

      if (!workOrder || !workOrder.linked_failure_ids) {
        return { success: true, message: 'No hay fallas enlazadas', synced: 0 };
      }

      const linkedFailureIds = JSON.parse(workOrder.linked_failure_ids);

      // Obtener todas las WorkOrders enlazadas
      const linkedWorkOrders = await WorkOrder.findAll({
        where: {
          failure_order_id: linkedFailureIds,
          id: { [require('sequelize').Op.ne]: workOrderId }
        }
      });

      console.log('🔄 [SYNC PARTS] WorkOrders a sincronizar:', linkedWorkOrders.length);

      let syncedCount = 0;
      for (const linkedWO of linkedWorkOrders) {
        // Eliminar repuestos existentes
        await WorkOrderPart.destroy({
          where: { work_order_id: linkedWO.id }
        });

        // Copiar los repuestos de la WorkOrder original
        if (workOrder.parts && workOrder.parts.length > 0) {
          for (const part of workOrder.parts) {
            await WorkOrderPart.create({
              work_order_id: linkedWO.id,
              inventory_id: part.inventory_id,
              quantity_used: part.quantity_used
            });
          }
        }

        syncedCount++;
        console.log(`✅ [SYNC PARTS] Repuestos sincronizados para WO ${linkedWO.work_order_id}`);
      }

      return {
        success: true,
        message: `Repuestos sincronizados en ${syncedCount} WorkOrders`,
        synced: syncedCount
      };

    } catch (error) {
      console.error('❌ [SYNC PARTS] Error:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Obtener todas las fallas enlazadas a una WorkOrder
   * @param {number} workOrderId - ID de la WorkOrder
   */
  async getLinkedFailures(workOrderId) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      
      if (!workOrder || !workOrder.linked_failure_ids) {
        return { success: true, data: [] };
      }

      const linkedFailureIds = JSON.parse(workOrder.linked_failure_ids);
      
      const { FailureOrder, User, Inspectable } = require('../models');
      
      const failures = await FailureOrder.findAll({
        where: {
          id: linkedFailureIds
        },
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name']
          },
          {
            model: Inspectable,
            as: 'affectedInspectable',
            attributes: ['ins_id', 'name', 'description']
          }
        ]
      });

      return {
        success: true,
        data: failures,
        count: failures.length
      };

    } catch (error) {
      console.error('❌ Error obteniendo fallas enlazadas:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }
}

module.exports = new WorkOrderSyncService();

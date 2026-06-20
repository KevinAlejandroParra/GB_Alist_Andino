'use strict';

const {
  FailureOrder,
  RepairExecution,
  WorkOrder,
  WorkOrderPart,
  Requisition,
  Inventory,
  User,
  Sequelize,
  connection
} = require('../models');
const { Op } = Sequelize;
const RepairExecutionSyncService = require('./RepairExecutionSyncService');

/**
 * Ciclo de vida de fallas: cancelar, reactivar, devolver inventario.
 * Reemplaza la eliminación permanente.
 */
class FailureLifecycleService {
  generateRepairExecutionId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `AR-${year}-${timestamp}`;
  }

  async _loadFailureWithRelations(failureOrderId, transaction) {
    return FailureOrder.findByPk(failureOrderId, {
      include: [
        {
          model: RepairExecution,
          as: 'repairExecution',
          required: false
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          required: false,
          include: [
            { model: WorkOrderPart, as: 'parts' },
            { model: Requisition, as: 'requisitions' }
          ]
        }
      ],
      transaction
    });
  }

  /** Devuelve repuestos usados al inventario */
  async _returnPartsToInventory(workOrder, transaction) {
    if (!workOrder?.parts?.length) return;

    for (const part of workOrder.parts) {
      const inventoryItem = await Inventory.findByPk(part.inventory_id, { transaction });
      if (inventoryItem) {
        await inventoryItem.update({
          quantity: inventoryItem.quantity + part.quantity_used
        }, { transaction });
      }
    }

    await WorkOrderPart.destroy({
      where: { work_order_id: workOrder.id },
      transaction
    });
  }

  /** Cancela requisiciones abiertas vinculadas a la OT */
  async _cancelOpenRequisitions(workOrder, transaction) {
    if (!workOrder) return;

    await Requisition.update(
      { status: 'CANCELADO' },
      {
        where: {
          work_order_id: workOrder.id,
          status: { [Op.in]: ['SOLICITADO', 'PENDIENTE'] }
        },
        transaction
      }
    );
  }

  async _ensureRepairExecution(failureOrder, transaction) {
    if (failureOrder.repairExecution) {
      return failureOrder.repairExecution;
    }

    const workOrder = failureOrder.workOrder;
    const payload = {
      repair_execution_id: this.generateRepairExecutionId(),
      failure_order_id: failureOrder.id,
      status: workOrder?.status || 'EN_PROCESO',
      activity_performed: workOrder?.activity_performed || null,
      evidence_url: workOrder?.evidence_url || null,
      closure_signature: workOrder?.closure_signature || null,
      start_time: workOrder?.start_time || null,
      end_time: workOrder?.end_time || null,
      resolved_by_id: workOrder?.resolved_by_id || null,
      linked_failure_ids: workOrder?.linked_failure_ids || JSON.stringify([failureOrder.id])
    };

    const repairExecution = await RepairExecution.create(payload, { transaction });

    if (workOrder && !workOrder.repair_execution_id) {
      await workOrder.update({ repair_execution_id: repairExecution.id }, { transaction });
    }

    return repairExecution;
  }

  /** Cancela una falla conservando historial */
  async cancelFailureOrder(failureOrderId, { reason, cancelledById }) {
    if (!reason || !String(reason).trim()) {
      throw new Error('El motivo de cancelación es obligatorio');
    }

    const transaction = await connection.transaction();

    try {
      const failureOrder = await this._loadFailureWithRelations(failureOrderId, transaction);
      if (!failureOrder) {
        throw new Error(`Orden de falla ${failureOrderId} no encontrada`);
      }

      const repairExecution = await this._ensureRepairExecution(failureOrder, transaction);
      const workOrder = failureOrder.workOrder;

      if (repairExecution.status === 'CANCELADO') {
        throw new Error('Esta falla ya está cancelada');
      }

      if (workOrder) {
        await this._returnPartsToInventory(workOrder, transaction);
        await this._cancelOpenRequisitions(workOrder, transaction);
      }

      const cancelPayload = {
        status: 'CANCELADO',
        cancellation_reason: String(reason).trim(),
        cancelled_at: new Date(),
        cancelled_by_id: cancelledById || null
      };

      await repairExecution.update(cancelPayload, { transaction });

      if (workOrder) {
        await workOrder.update(cancelPayload, { transaction });
      }

      await RepairExecutionSyncService.syncLinkedRepairExecutions(
        repairExecution.id,
        cancelPayload,
        transaction
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Falla cancelada exitosamente',
        data: await this._loadFailureWithRelations(failureOrderId)
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /** Reactiva una falla cancelada — accesible para todos los roles autenticados */
  async reactivateFailureOrder(failureOrderId, { reactivatedById }) {
    const transaction = await connection.transaction();

    try {
      const failureOrder = await this._loadFailureWithRelations(failureOrderId, transaction);
      if (!failureOrder) {
        throw new Error(`Orden de falla ${failureOrderId} no encontrada`);
      }

      const repairExecution = failureOrder.repairExecution
        || await this._ensureRepairExecution(failureOrder, transaction);

      if (repairExecution.status !== 'CANCELADO') {
        throw new Error('Solo se pueden reactivar fallas en estado cancelado');
      }

      const reactivatePayload = {
        status: 'EN_PROCESO',
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_id: null,
        start_time: repairExecution.start_time || new Date()
      };

      await repairExecution.update(reactivatePayload, { transaction });

      if (failureOrder.workOrder) {
        await failureOrder.workOrder.update(reactivatePayload, { transaction });
      }

      await RepairExecutionSyncService.syncLinkedRepairExecutions(
        repairExecution.id,
        reactivatePayload,
        transaction
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Falla reactivada exitosamente',
        data: await this._loadFailureWithRelations(failureOrderId)
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new FailureLifecycleService();

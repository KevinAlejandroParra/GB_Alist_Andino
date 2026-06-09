'use strict';

const { RepairExecution, WorkOrder } = require('../models');

/** Servicio de Actas de Reparación (AR) */
class RepairExecutionService {
  generateRepairExecutionId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `AR-${year}-${timestamp}`;
  }

  async createForFailure(failureOrderId, options = {}) {
    const { transaction, status = 'EN_PROCESO', startTime = new Date() } = options;

    const existing = await RepairExecution.findOne({
      where: { failure_order_id: failureOrderId },
      transaction
    });
    if (existing) return existing;

    const existingWorkOrder = await WorkOrder.findOne({
      where: { failure_order_id: failureOrderId },
      transaction
    });
    if (existingWorkOrder?.repair_execution_id) {
      return RepairExecution.findByPk(existingWorkOrder.repair_execution_id, { transaction });
    }

    const repairExecution = await RepairExecution.create({
      repair_execution_id: this.generateRepairExecutionId(),
      failure_order_id: failureOrderId,
      status,
      start_time: startTime,
      linked_failure_ids: JSON.stringify([failureOrderId])
    }, { transaction });

    if (existingWorkOrder) {
      await existingWorkOrder.update(
        { repair_execution_id: repairExecution.id },
        { transaction }
      );
    }

    return repairExecution;
  }

  /** Estado efectivo: AR es fuente de verdad, WO legacy como respaldo */
  getEffectiveStatus(failureOrder) {
    return failureOrder?.repairExecution?.status
      || failureOrder?.workOrder?.status
      || null;
  }

  isClosed(failureOrder) {
    return ['RESUELTA', 'CANCELADO'].includes(this.getEffectiveStatus(failureOrder));
  }
}

module.exports = new RepairExecutionService();

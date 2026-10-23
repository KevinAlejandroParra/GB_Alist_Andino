'use strict';

const { RepairExecution, WorkOrder } = require('../models');
const RepairExecutionSyncService = require('./RepairExecutionSyncService');

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

  generateWorkOrderId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `OT-${year}-${timestamp}`;
  }

  /** Crea OT formal vinculada a una AR existente (repuestos/requisiciones) */
  async createFormalWorkOrder(repairExecutionId, options = {}) {
    const { transaction } = options;
    const repairExecution = await RepairExecution.findByPk(repairExecutionId, { transaction });
    if (!repairExecution) {
      throw new Error(`Acta de reparación ${repairExecutionId} no encontrada`);
    }

    // La bandera de repuestos queda fijada en la AR en cuanto se abre una OT formal
    if (!repairExecution.requiere_replacement) {
      await repairExecution.update({ requiere_replacement: true }, { transaction });
    }

    const existing = await WorkOrder.findOne({
      where: { repair_execution_id: repairExecutionId },
      transaction
    });
    if (existing) return existing;

    const byFailure = await WorkOrder.findOne({
      where: { failure_order_id: repairExecution.failure_order_id },
      transaction
    });
    if (byFailure) {
      if (!byFailure.repair_execution_id) {
        await byFailure.update(
          { repair_execution_id: repairExecutionId, requiere_replacement: true },
          { transaction }
        );
      }
      return byFailure;
    }

    return WorkOrder.create({
      work_order_id: this.generateWorkOrderId(),
      failure_order_id: repairExecution.failure_order_id,
      repair_execution_id: repairExecutionId,
      status: repairExecution.status || 'EN_PROCESO',
      requiere_replacement: true,
      activity_performed: repairExecution.activity_performed,
      evidence_url: repairExecution.evidence_url,
      closure_signature: repairExecution.closure_signature,
      start_time: repairExecution.start_time,
      end_time: repairExecution.end_time,
      resolved_by_id: repairExecution.resolved_by_id,
      linked_failure_ids: repairExecution.linked_failure_ids
    }, { transaction });
  }

  /** Indica si la AR ya decidió que requiere repuestos (bandera propia o su OT) */
  async requiresReplacement(repairExecutionId, transaction) {
    const repairExecution = await RepairExecution.findByPk(repairExecutionId, { transaction });
    if (!repairExecution) return false;
    if (repairExecution.requiere_replacement) return true;

    const formalWorkOrder = await WorkOrder.findOne({
      where: { repair_execution_id: repairExecutionId },
      transaction
    });
    return Boolean(formalWorkOrder && formalWorkOrder.requiere_replacement);
  }

  /**
   * Enciende la bandera de repuestos en la AR y, si existe, en su OT formal.
   * Se usa cuando el técnico confirma "Sí requiere repuestos".
   */
  async markRequiresReplacement(repairExecutionId, transaction) {
    const repairExecution = await RepairExecution.findByPk(repairExecutionId, { transaction });
    if (!repairExecution) {
      throw new Error(`Acta de reparación ${repairExecutionId} no encontrada`);
    }

    if (!repairExecution.requiere_replacement) {
      await repairExecution.update({ requiere_replacement: true }, { transaction });
    }
    repairExecution.requiere_replacement = true;

    const formalWorkOrder = await WorkOrder.findOne({
      where: { repair_execution_id: repairExecutionId },
      transaction
    });
    if (formalWorkOrder && !formalWorkOrder.requiere_replacement) {
      await formalWorkOrder.update({ requiere_replacement: true }, { transaction });
    }
    if (formalWorkOrder) formalWorkOrder.requiere_replacement = true;

    return repairExecution;
  }

  async updateFields(repairExecutionId, updateData) {
    const repairExecution = await RepairExecution.findByPk(repairExecutionId);
    if (!repairExecution) {
      throw new Error(`Acta de reparación ${repairExecutionId} no encontrada`);
    }

    if (updateData.status === 'RESUELTA') {
      const validationErrors = [];
      const activity = updateData.activity_performed ?? repairExecution.activity_performed;
      const evidence = updateData.evidence_url ?? repairExecution.evidence_url;
      const signature = updateData.closure_signature ?? repairExecution.closure_signature;
      const startTime = updateData.start_time ?? repairExecution.start_time;
      const endTime = updateData.end_time ?? repairExecution.end_time;

      if (!activity || !String(activity).trim()) {
        validationErrors.push('La descripción de la actividad realizada es obligatoria');
      }
      if (!evidence || !String(evidence).trim()) {
        validationErrors.push('La evidencia de la solución es obligatoria');
      }
      if (!signature || !String(signature).trim()) {
        validationErrors.push('La firma digital es obligatoria');
      }
      if (!startTime) validationErrors.push('La hora de inicio es obligatoria');
      if (!endTime) validationErrors.push('La hora de finalización es obligatoria');

      if (validationErrors.length) {
        throw new Error(`Campos obligatorios faltantes: ${validationErrors.join(', ')}`);
      }
    }

    await repairExecution.update(updateData);

    // La bandera de repuestos es fuente de verdad de la AR y se refleja en su OT formal
    if (updateData.requiere_replacement === true) {
      await this.markRequiresReplacement(repairExecutionId);
    }

    await RepairExecutionSyncService.syncLinkedRepairExecutions(
      repairExecutionId,
      updateData
    );

    let formalWorkOrder = await WorkOrder.findOne({
      where: { repair_execution_id: repairExecutionId }
    });

    // Si la AR confirmó que requiere repuestos pero su OT formal aún no existe
    // (p. ej. quedó creada por una versión anterior que no la enlazaba), la creamos/enlazamos.
    if (!formalWorkOrder && updateData.requiere_replacement === true) {
      formalWorkOrder = await this.createFormalWorkOrder(repairExecutionId);
    }

    if (formalWorkOrder) {
      const woFields = {};
      ['status', 'activity_performed', 'evidence_url', 'closure_signature', 'start_time', 'end_time', 'resolved_by_id', 'requiere_replacement']
        .forEach((f) => { if (updateData[f] !== undefined) woFields[f] = updateData[f]; });
      if (Object.keys(woFields).length) {
        await formalWorkOrder.update(woFields);
        const WorkOrderSyncService = require('./WorkOrderSyncService');
        await WorkOrderSyncService.syncLinkedWorkOrders(formalWorkOrder.id, woFields);
      }
    }

    return RepairExecution.findByPk(repairExecutionId, {
      include: [{ model: WorkOrder, as: 'formalWorkOrder' }]
    });
  }
}

module.exports = new RepairExecutionService();

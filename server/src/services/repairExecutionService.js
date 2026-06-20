'use strict';

const { RepairExecution, WorkOrder, FailureOrder, User, connection } = require('../models');
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

  async loadFailureWithRelations(failureOrderId, options = {}) {
    const { transaction } = options;

    return FailureOrder.findByPk(failureOrderId, {
      include: [
        {
          model: RepairExecution,
          as: 'repairExecution',
          required: false,
          include: [
            { model: User, as: 'resolver', attributes: ['user_id', 'user_name'], required: false },
            { model: User, as: 'cancelledBy', attributes: ['user_id', 'user_name'], required: false }
          ]
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          required: false,
          include: [
            { model: User, as: 'resolver', attributes: ['user_id', 'user_name'], required: false },
            { model: User, as: 'cancelledBy', attributes: ['user_id', 'user_name'], required: false }
          ]
        }
      ],
      transaction
    });
  }

  validateResolutionPayload(entity, updateData) {
    const mergedData = {
      activity_performed: updateData.activity_performed ?? entity.activity_performed,
      evidence_url: updateData.evidence_url ?? entity.evidence_url,
      closure_signature: updateData.closure_signature ?? entity.closure_signature,
      start_time: updateData.start_time ?? entity.start_time,
      end_time: updateData.end_time ?? entity.end_time
    };

    const validationErrors = [];

    if (!mergedData.activity_performed || String(mergedData.activity_performed).trim() === '') {
      validationErrors.push('La descripción de la actividad realizada es obligatoria');
    }

    if (!mergedData.evidence_url || String(mergedData.evidence_url).trim() === '') {
      validationErrors.push('La evidencia de la solución (imagen/foto) es obligatoria');
    }

    if (!mergedData.closure_signature || String(mergedData.closure_signature).trim() === '') {
      validationErrors.push('La firma digital es obligatoria');
    }

    if (!mergedData.start_time) {
      validationErrors.push('La hora de inicio es obligatoria');
    }

    if (!mergedData.end_time) {
      validationErrors.push('La hora de finalización es obligatoria');
    }

    if (validationErrors.length > 0) {
      throw new Error(`Campos obligatorios faltantes: ${validationErrors.join(', ')}`);
    }
  }

  async ensureFormalWorkOrder(failureOrder, repairExecution, transaction) {
    if (failureOrder.workOrder) {
      return failureOrder.workOrder;
    }

    return WorkOrder.create({
      work_order_id: this.generateWorkOrderId(),
      failure_order_id: failureOrder.id,
      repair_execution_id: repairExecution.id,
      requiere_replacement: true,
      status: repairExecution.status || 'EN_PROCESO',
      activity_performed: repairExecution.activity_performed || null,
      evidence_url: repairExecution.evidence_url || null,
      closure_signature: repairExecution.closure_signature || null,
      start_time: repairExecution.start_time || null,
      end_time: repairExecution.end_time || null,
      resolved_by_id: repairExecution.resolved_by_id || null,
      linked_failure_ids: repairExecution.linked_failure_ids || JSON.stringify([failureOrder.id])
    }, { transaction });
  }

  async updateForFailure(failureOrderId, updateData = {}) {
    const transaction = await connection.transaction();

    try {
      const failureOrder = await this.loadFailureWithRelations(failureOrderId, { transaction });

      if (!failureOrder) {
        throw new Error(`Orden de falla ${failureOrderId} no encontrada`);
      }

      const repairExecution = failureOrder.repairExecution
        || await this.createForFailure(failureOrderId, { transaction });

      let workOrder = failureOrder.workOrder || null;

      if (updateData.requiere_replacement === true && !workOrder) {
        workOrder = await this.ensureFormalWorkOrder(failureOrder, repairExecution, transaction);
      }

      if (updateData.status === 'RESUELTA') {
        this.validateResolutionPayload(workOrder || repairExecution, updateData);
      }

      const syncableFields = [
        'status',
        'activity_performed',
        'evidence_url',
        'closure_signature',
        'start_time',
        'end_time',
        'resolved_by_id'
      ];

      const repairExecutionPayload = {};
      syncableFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          repairExecutionPayload[field] = updateData[field];
        }
      });

      if (Object.keys(repairExecutionPayload).length > 0) {
        await repairExecution.update(repairExecutionPayload, { transaction });
        await RepairExecutionSyncService.syncLinkedRepairExecutions(
          repairExecution.id,
          repairExecutionPayload,
          transaction
        );
      }

      if (workOrder) {
        const workOrderPayload = {};
        syncableFields.forEach((field) => {
          if (updateData[field] !== undefined) {
            workOrderPayload[field] = updateData[field];
          }
        });

        if (updateData.requiere_replacement !== undefined) {
          workOrderPayload.requiere_replacement = updateData.requiere_replacement;
        }

        if (Object.keys(workOrderPayload).length > 0) {
          await workOrder.update(workOrderPayload, { transaction });
        }
      }

      await transaction.commit();

      const updatedFailure = await this.loadFailureWithRelations(failureOrderId);
      return {
        success: true,
        data: updatedFailure,
        effectiveExecution: updatedFailure.workOrder || updatedFailure.repairExecution
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new RepairExecutionService();

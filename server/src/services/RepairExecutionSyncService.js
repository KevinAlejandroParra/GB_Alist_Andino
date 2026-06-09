'use strict';

const { RepairExecution } = require('../models');

/**
 * Sincroniza actas de reparación (AR) enlazadas — reemplazo lógico de OT espejo.
 * Cuando varios reportes comparten la misma reparación, mantiene los campos alineados.
 */
class RepairExecutionSyncService {
  async syncLinkedRepairExecutions(repairExecutionId, updateData, transaction = null) {
    const repairExecution = await RepairExecution.findByPk(repairExecutionId, { transaction });
    if (!repairExecution?.linked_failure_ids) {
      return { success: true, synced: 0 };
    }

    let linkedFailureIds = [];
    try {
      linkedFailureIds = JSON.parse(repairExecution.linked_failure_ids);
    } catch (_) {
      return { success: false, message: 'linked_failure_ids inválido' };
    }

    const syncableFields = [
      'status',
      'activity_performed',
      'evidence_url',
      'closure_signature',
      'start_time',
      'end_time',
      'resolved_by_id',
      'cancellation_reason',
      'cancelled_at',
      'cancelled_by_id'
    ];

    const fieldsToSync = {};
    for (const field of syncableFields) {
      if (Object.prototype.hasOwnProperty.call(updateData, field)) {
        fieldsToSync[field] = updateData[field];
      }
    }

    if (!Object.keys(fieldsToSync).length) {
      return { success: true, synced: 0 };
    }

    const linkedExecutions = await RepairExecution.findAll({
      where: {
        failure_order_id: linkedFailureIds,
        id: { [require('sequelize').Op.ne]: repairExecutionId }
      },
      transaction
    });

    for (const linked of linkedExecutions) {
      await linked.update(fieldsToSync, { transaction });
    }

    return { success: true, synced: linkedExecutions.length };
  }
}

module.exports = new RepairExecutionSyncService();

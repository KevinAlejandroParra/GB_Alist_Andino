'use strict';

const { RepairExecution, WorkOrder, WorkOrderPart, FailureOrder, Inventory } = require('../models');
const RepairExecutionSyncService = require('./RepairExecutionSyncService');
const WorkOrderSyncService = require('./WorkOrderSyncService');

/**
 * Servicio para sincronizar la solución completa (AR + OT) de una falla ya resuelta
 * hacia otra falla que aún no tiene solución, evitando re-registrar manualmente.
 *
 * Flujo:
 *  1. Busca la falla fuente (resuelta) y su AR/OT
 *  2. Crea AR espejo para la falla destino con los mismos datos
 *  3. Crea OT espejo para la falla destino si la fuente tiene OT
 *  4. Actualiza linked_failure_ids en ambos lados para sincronización futura
 */
class SolutionSyncService {
  async syncSolution(targetFailureId, sourceFailureId, resolvedById = null) {
    if (targetFailureId === sourceFailureId) {
      return { success: false, message: 'No se puede sincronizar una falla consigo misma' };
    }

    // Validar falla destino
    const targetFailure = await FailureOrder.findByPk(targetFailureId);
    if (!targetFailure) {
      return { success: false, message: `Falla destino #${targetFailureId} no encontrada` };
    }

    // Validar falla fuente
    const sourceFailure = await FailureOrder.findByPk(sourceFailureId, {
      include: [
        { model: RepairExecution, as: 'repairExecution' },
        { model: WorkOrder, as: 'workOrder' }
      ]
    });
    if (!sourceFailure) {
      return { success: false, message: `Falla fuente #${sourceFailureId} no encontrada` };
    }

    const sourceAR = sourceFailure.repairExecution;
    const sourceOT = sourceFailure.workOrder;

    if (!sourceAR) {
      return { success: false, message: 'La falla fuente no tiene un Acta de Reparación (AR) para sincronizar' };
    }

    const isResolved = ['RESUELTA', 'CANCELADO'].includes(sourceAR.status);
    if (!isResolved) {
      return { success: false, message: 'La falla fuente debe estar resuelta o cancelada para sincronizar su solución' };
    }

    console.log('🔄 [SOLUTION SYNC] Iniciando sincronización');
    console.log('   Fuente:', sourceFailure.id, `(${sourceFailure.failure_order_id})`);
    console.log('   Destino:', targetFailure.id, `(${targetFailure.failure_order_id || `OF-${targetFailure.id}`})`);

    // Verificar si el destino ya tiene AR
    const existingTargetAR = await RepairExecution.findOne({
      where: { failure_order_id: targetFailureId }
    });
    if (existingTargetAR) {
      return { success: false, message: 'La falla destino ya tiene un Acta de Reparación. No se puede sobrescribir.' };
    }

    // Calcular linked_failure_ids unificados
    const sourceLinkedIds = sourceAR.linked_failure_ids
      ? JSON.parse(sourceAR.linked_failure_ids)
      : [sourceFailureId];

    if (!sourceLinkedIds.includes(targetFailureId)) {
      sourceLinkedIds.push(targetFailureId);
    }
    if (!sourceLinkedIds.includes(sourceFailureId)) {
      sourceLinkedIds.push(sourceFailureId);
    }

    const linkedIdsStr = JSON.stringify(sourceLinkedIds);
    console.log('   linked_failure_ids:', sourceLinkedIds);

    // 1. Crear AR espejo para la falla destino
    const targetAR = await RepairExecution.create({
      repair_execution_id: `AR-SYNC-${Date.now().toString().slice(-6)}`,
      failure_order_id: targetFailureId,
      status: sourceAR.status,
      activity_performed: sourceAR.activity_performed,
      evidence_url: sourceAR.evidence_url,
      closure_signature: sourceAR.closure_signature,
      start_time: sourceAR.start_time,
      end_time: sourceAR.end_time,
      resolved_by_id: resolvedById || sourceAR.resolved_by_id,
      linked_failure_ids: linkedIdsStr
    });
    console.log('   ✅ AR espejo creada:', targetAR.repair_execution_id);

    // 2. Actualizar AR fuente con linked_failure_ids unificado
    await sourceAR.update({ linked_failure_ids: linkedIdsStr });
    console.log('   ✅ AR fuente actualizada con linked_failure_ids');

    // 3. Si la fuente tiene OT, crear OT espejo
    let targetOT = null;
    if (sourceOT) {
      // Verificar si destino ya tiene OT
      const existingTargetOT = await WorkOrder.findOne({
        where: { failure_order_id: targetFailureId }
      });
      if (!existingTargetOT) {
        const otSuffix = `-L${targetFailureId}`;
        const linkedWorkOrderId = `${sourceOT.work_order_id}${otSuffix}`;

        targetOT = await WorkOrder.create({
          work_order_id: linkedWorkOrderId,
          failure_order_id: targetFailureId,
          repair_execution_id: targetAR.id,
          status: sourceOT.status,
          requiere_replacement: sourceOT.requiere_replacement,
          activity_performed: sourceOT.activity_performed,
          evidence_url: sourceOT.evidence_url,
          closure_signature: sourceOT.closure_signature,
          start_time: sourceOT.start_time,
          end_time: sourceOT.end_time,
          resolved_by_id: resolvedById || sourceOT.resolved_by_id,
          linked_failure_ids: linkedIdsStr
        });
        console.log('   ✅ OT espejo creada:', targetOT.work_order_id);

        // Copiar repuestos si existen
        const sourceParts = await WorkOrderPart.findAll({
          where: { work_order_id: sourceOT.id },
          include: [{ model: Inventory, as: 'inventory' }]
        });
        if (sourceParts.length > 0) {
          for (const part of sourceParts) {
            await WorkOrderPart.create({
              work_order_id: targetOT.id,
              inventory_id: part.inventory_id,
              quantity_used: part.quantity_used
            });
          }
          console.log(`   ✅ ${sourceParts.length} repuestos copiados`);
        }

        // Actualizar linked_failure_ids en OT fuente
        await sourceOT.update({ linked_failure_ids: linkedIdsStr });
      }
    }

    console.log('🔄 [SOLUTION SYNC] Sincronización completada exitosamente');

    return {
      success: true,
      message: 'Solución sincronizada exitosamente',
      data: {
        targetFailureId,
        sourceFailureId,
        repairExecution: targetAR,
        workOrder: targetOT,
        linkedFailureIds: sourceLinkedIds
      }
    };
  }
}

module.exports = new SolutionSyncService();

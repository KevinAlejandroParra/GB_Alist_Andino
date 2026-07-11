'use strict';

const CLOSED_STATUSES = ['RESUELTA', 'CANCELADO'];

/**
 * Utilidades de trazabilidad AR / OT para PDF y API.
 * AR = Acta de Reparación (sin repuestos)
 * OT = Orden de Trabajo (con repuestos solicitados o usados)
 */
function sameCalendarDay(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function resolveExecutionStatus(repairExecution, workOrder) {
  return repairExecution?.status || workOrder?.status || null;
}

function hasOtIndicators(workOrder, requisitions = [], parts = []) {
  if (!workOrder) return false;
  if (workOrder.requiere_replacement) return true;
  if (parts.length > 0) return true;
  if (requisitions.length > 0) return true;
  return false;
}

function computeTraceability({ repairExecution, workOrder, requisitions = [], parts = [], pdfGeneratedAt = new Date() }) {
  const status = resolveExecutionStatus(repairExecution, workOrder);

  if (!repairExecution && !workOrder) {
    return {
      code: 'NONE',
      label: 'Sin seguimiento',
      shortLabel: 'Sin seguimiento',
      color: '#9ca3af',
      bgColor: '#f3f4f6',
      status: null
    };
  }

  if (status === 'CANCELADO') {
    const cancelledAt = repairExecution?.cancelled_at || workOrder?.cancelled_at || repairExecution?.updatedAt || workOrder?.updatedAt;
    const showCancelled = sameCalendarDay(cancelledAt, pdfGeneratedAt);

    return {
      code: 'CANCELLED',
      label: 'Falla cancelada',
      shortLabel: 'Falla cancelada',
      color: '#dc2626',
      bgColor: '#fef2f2',
      showInPdf: showCancelled,
      cancellation_reason: repairExecution?.cancellation_reason || workOrder?.cancellation_reason || null,
      cancelled_at: cancelledAt,
      status: 'CANCELADO'
    };
  }

  if (hasOtIndicators(workOrder, requisitions, parts)) {
    const hasPendingReq = requisitions.some(r => ['SOLICITADO', 'PENDIENTE'].includes(r.status));
    return {
      code: 'OT',
      label: 'Orden de Trabajo',
      shortLabel: 'Orden de Trabajo',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      requisitions,
      parts,
      activity: repairExecution?.activity_performed || workOrder?.activity_performed,
      status
    };
  }

  return {
    code: 'AR',
    label: 'Acta de Reparación',
    shortLabel: 'Acta de Reparación',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    activity: repairExecution?.activity_performed || workOrder?.activity_performed,
    status,
    repair_execution_id: repairExecution?.repair_execution_id,
    work_order_id: workOrder?.work_order_id
  };
}

function shouldIncludeFailureInPdf(failureOrder, traceability, cutoffDate, pdfGeneratedAt = new Date()) {
  if (traceability.code === 'CANCELLED') {
    return traceability.showInPdf === true;
  }

  const status = traceability.status;
  if (!status || !CLOSED_STATUSES.includes(status)) {
    return true;
  }

  const execution = failureOrder.repairExecution || failureOrder.workOrder;
  if (!execution) return true;

  const closedAt = new Date(execution.updatedAt);
  if (closedAt > cutoffDate) {
    return true;
  }

  return false;
}

module.exports = {
  CLOSED_STATUSES,
  sameCalendarDay,
  resolveExecutionStatus,
  hasOtIndicators,
  computeTraceability,
  shouldIncludeFailureInPdf
};

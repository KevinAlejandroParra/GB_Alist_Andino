'use client'

import React from 'react';
import { formatLocalDateWithOptions } from '../../utils/dateUtils';

/**
 * Componente de tarjeta de falla con diseño mejorado
 * - Borde de color según severidad
 * - Información prioritaria visible
 * - Badges para estado de OT y repuestos
 * - Botones de acción contextuales
 */
const FailureCard = ({ failure, onViewDetail, onResolve, onLinkToWorkOrder, userRole }) => {
  
  // Calcular días abierta
  const getDaysOpen = () => {
    if (!failure.createdAt) return 0;
    const startDate = new Date(failure.createdAt);
    const endDate = failure.repairExecution?.end_time
      ? new Date(failure.repairExecution.end_time)
      : failure.workOrder?.end_time
        ? new Date(failure.workOrder.end_time)
        : new Date();
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Configuración de alerta por días abierta
  const getDaysAlertConfig = () => {
    const days = getDaysOpen();
    if (days <= 7) return { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-clock' };
    if (days <= 30) return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'fa-exclamation-circle' };
    if (days <= 60) return { color: 'text-orange-600', bg: 'bg-orange-50', icon: 'fa-exclamation-triangle' };
    return { color: 'text-red-600', bg: 'bg-red-50', icon: 'fa-fire' };
  };

  // Color del borde según severidad
  const getBorderColor = () => {
    const severityColors = {
      'LEVE': 'border-l-green-500',
      'MODERADA': 'border-l-yellow-500',
      'CRITICA': 'border-l-red-500'
    };
    return severityColors[failure.severity] || 'border-l-gray-300';
  };

  // Verificar si tiene Acta de Reparación u Orden de Trabajo
  const hasWorkOrder = !!failure.workOrder;
  const hasRepairExecution = !!failure.repairExecution;

  // Verificar si tiene repuestos
  const hasParts = hasWorkOrder && failure.workOrder.parts && failure.workOrder.parts.length > 0;

  // Verificar si está resuelta o cancelada
  const isResolved = (hasWorkOrder && ['RESUELTA', 'CANCELADO'].includes(failure.workOrder.status)) ||
    (hasRepairExecution && ['RESUELTA', 'CANCELADO'].includes(failure.repairExecution.status));

  const daysAlert = getDaysAlertConfig();
  const daysOpen = getDaysOpen();

  const formatDate = (dateString) => {
    return formatLocalDateWithOptions(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }, 'es-ES');
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${getBorderColor()} border-r border-t border-b border-gray-200 p-4 hover:shadow-md transition-all duration-200`}>
      
      {/* Header: ID y badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-mono font-bold text-gray-700">
            {failure.failure_order_id || `OF-${failure.id}`}
          </span>
          <div className="flex flex-wrap gap-1">
            {/* Badge: Sin OT / Con OT / Con AR */}
            {!hasWorkOrder && !hasRepairExecution ? (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium border border-orange-200">
                <i className="fas fa-exclamation-circle mr-1"></i>
                Sin OT ni AR
              </span>
            ) : null}

            {hasRepairExecution && (
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium border border-teal-200">
                <i className="fas fa-file-signature mr-1"></i>
                Acta de Reparación
              </span>
            )}

            {hasWorkOrder && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                <i className="fas fa-clipboard-check mr-1"></i>
                Orden de Trabajo
              </span>
            )}

            {/* Badge: Con Repuestos */}
            {hasParts && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium border border-purple-200">
                <i className="fas fa-box mr-1"></i>
                Con Repuestos
              </span>
            )}

            {/* Badge: Persistencia */}
            {failure.recurrence_count > 1 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-200">
                <i className="fas fa-redo mr-1"></i>
                x{failure.recurrence_count}
              </span>
            )}

            {/* ✅ P7: Badge sin firma de reporte */}
            {!failure.report_signature && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-300">
                ⚠️ Sin firma
              </span>
            )}

            {/* Badge: Falla Enlazada (Sincronizada) */}
            {hasWorkOrder && failure.workOrder.linked_failure_ids && (
              (() => {
                try {
                  const linkedIds = JSON.parse(failure.workOrder.linked_failure_ids);
                  if (linkedIds && linkedIds.length > 1) {
                    return (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-300 flex items-center gap-1">
                        <i className="fas fa-link"></i>
                        <span>Sincronizada ({linkedIds.length})</span>
                      </span>
                    );
                  }
                } catch (e) {
                  return null;
                }
                return null;
              })()
            )}
          </div>
        </div>

        {/* Días abierta con alerta visual */}
        <div className={`${daysAlert.bg} ${daysAlert.color} px-3 py-2 rounded-lg text-center`}>
          <i className={`fas ${daysAlert.icon} text-lg mb-1`}></i>
          <div className="text-xs font-medium">
            {daysOpen} {daysOpen === 1 ? 'día' : 'días'}
          </div>
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-3">
        <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">
          {failure.description}
        </p>
      </div>

      {/* Info adicional */}
      <div className="mb-3 space-y-1">
        {/* Área asignada */}
        {failure.assigned_to && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <i className="fas fa-user-tag w-4"></i>
            <span className="font-medium">Área:</span>
            <span className={`px-2 py-0.5 rounded ${
              failure.assigned_to === 'TECNICA' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {failure.assigned_to}
            </span>
          </div>
        )}

        {/* Inspectable */}
        {failure.affectedInspectable && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <i className="fas fa-map-marker-alt w-4"></i>
            <span className="font-medium">Ubicación:</span>
            <span>{failure.affectedInspectable.name}</span>
          </div>
        )}

        {/* Reportado por */}
        {failure.reporter && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <i className="fas fa-user w-4"></i>
            <span className="font-medium">Reportó:</span>
            <span>{failure.reporter.user_name}</span>
          </div>
        )}

        {/* Fecha de reporte */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <i className="fas fa-calendar w-4"></i>
          <span className="font-medium">Fecha:</span>
          <span>{formatDate(failure.createdAt)}</span>
        </div>

        {/* Estado de OT si existe */}
        {hasWorkOrder && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <i className="fas fa-tasks w-4"></i>
            <span className="font-medium">Estado OT:</span>
            <span className={`px-2 py-0.5 rounded ${
              failure.workOrder.status === 'RESUELTA' ? 'bg-green-100 text-green-800' :
              failure.workOrder.status === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
              failure.workOrder.status === 'CANCELADO' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {failure.workOrder.status}
            </span>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
        {/* Botón Ver Detalles (siempre visible) */}
        <button
          onClick={() => onViewDetail(failure)}
          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <i className="fas fa-eye mr-1"></i>
          Ver Detalles
        </button>

        {/* Botones contextuales según estado */}
        {!hasWorkOrder && onViewDetail && (
          <button
            onClick={() => onViewDetail(failure)}
            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <i className="fas fa-wrench mr-1"></i>
            Gestionar
          </button>
        )}

        {!hasWorkOrder && onLinkToWorkOrder && (userRole === 1 || userRole === 2 || userRole === 3) && (
          <button
            onClick={() => onLinkToWorkOrder(failure)}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors text-sm font-medium"
          >
            <i className="fas fa-link mr-1"></i>
            Enlazar OT
          </button>
        )}
      </div>
    </div>
  );
};

export default FailureCard;

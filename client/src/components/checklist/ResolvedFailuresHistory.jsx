'use client'

import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ResolvedFailuresHistory = ({ resolvedFailures }) => {
  const [expandedCard, setExpandedCard] = useState(null);

  if (!resolvedFailures || resolvedFailures.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-medium text-green-800 mb-2">No hay fallas resueltas</h3>
        <p className="text-green-600">No se han resuelto fallas para este tipo de checklist.</p>
      </div>
    );
  }

  const toggleExpanded = (workOrderId) => {
    setExpandedCard(expandedCard === workOrderId ? null : workOrderId);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'RESUELTO':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Resuelto</span>;
      case 'CERRADO':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Cerrado</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getSeverityChip = (severity) => {
    switch (severity) {
      case 'crítica':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Crítica</span>;
      case 'leve':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Leve</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{severity || 'N/A'}</span>;
    }
  };

  const getRecurrenceChip = (recurrenceCount) => {
    const count = recurrenceCount || 1;
    if (count === 1) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Primera vez</span>;
    } else if (count === 2) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Recurrente</span>;
    } else {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Múltiple ({count})</span>;
    }
  };

  const renderEvidenceImage = (evidenceUrl, title = "Evidencia") => {
    if (!evidenceUrl) return null;
    
    const cleanUrl = evidenceUrl.trim();
    if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined') {
      return (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-700">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {title} no disponible
          </p>
        </div>
      );
    }

    const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
    const absoluteUrl = cleanUrl.startsWith('http') ? cleanUrl : `${API_URL}${cleanUrl}`;
    
    const isImageUrl = (url) => {
      return url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    };

    if (isImageUrl(cleanUrl)) {
      return (
        <div className="mt-2">
          <div className="bg-gray-50 p-2 rounded border">
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <img
              src={absoluteUrl}
              alt={title}
              className="max-w-sm max-h-48 rounded border border-gray-200 shadow-sm"
              onError={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded">
                      <p class="text-sm text-red-600">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Error al cargar imagen
                      </p>
                      <p class="text-xs text-red-500 mt-1 truncate">URL: ${cleanUrl}</p>
                      <a href="${absoluteUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline">Ver en nueva pestaña</a>
                    </div>
                  `;
                }
              }}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-700 mb-2">{title}</p>
        <a
          href={absoluteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Ver evidencia
        </a>
        <p className="text-xs text-blue-600 mt-1 truncate">URL: {absoluteUrl}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Historial de Fallas Resueltas ({resolvedFailures.length})
        </h3>
      </div>

      <div className="space-y-4">
        {resolvedFailures.map((workOrder) => (
          <div 
            key={workOrder.id} 
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            {/* Header del card */}
            <div 
              className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpanded(workOrder.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {workOrder.work_order_id || `OT-${workOrder.id}`}
                    </h4>
                    {getStatusChip(workOrder.status)}
                    {getSeverityChip(workOrder.severity)}
                    {getRecurrenceChip(workOrder.recurrence_count)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Item:</span>{' '}
                    {`${workOrder.checklistItem?.item_number || ''} - ${workOrder.checklistItem?.question_text || 'N/A'}`}
                  </p>
                  
                  <p className="text-sm text-gray-500 truncate">
                    {workOrder.description}
                  </p>
                  
                  <p className="text-xs text-gray-400">
                    Recurrencia #{workOrder.recurrence_count || 1} - {formatDate(workOrder.first_reported_date)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <div className="text-right text-xs text-gray-500">
                    <div>Resuelto:</div>
                    <div>{formatDate(workOrder.resolved_at)}</div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedCard === workOrder.id ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Contenido expandido */}
            {expandedCard === workOrder.id && (
              <div className="px-6 pb-6 border-t border-gray-200 bg-gray-50">
                <div className="mt-4 space-y-4">
                  {/* Información del reporte */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Información del Reporte</h5>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Reportado por:</span>{' '}
                          <span className="text-gray-900">{workOrder.reporter?.user_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Fecha de reporte:</span>{' '}
                          <span className="text-gray-900">{formatDate(workOrder.first_reported_date)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Recurrencias:</span>{' '}
                          <span className="text-gray-900">{getRecurrenceChip(workOrder.recurrence_count)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Área responsable:</span>{' '}
                          <span className="text-gray-900">{workOrder.responsible_area || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Número de orden:</span>{' '}
                          <span className="text-gray-900">{workOrder.work_order_id || `OT-${workOrder.id}`}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Información de Resolución</h5>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Resuelto por:</span>{' '}
                          <span className="text-gray-900">{workOrder.closer?.user_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Fecha de resolución:</span>{' '}
                          <span className="text-gray-900">{formatDate(workOrder.resolved_at)}</span>
                        </div>
                        {workOrder.closed_at && (
                          <div>
                            <span className="font-medium text-gray-600">Fecha de cierre:</span>{' '}
                            <span className="text-gray-900">{formatDate(workOrder.closed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Descripción de la falla */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Descripción de la Falla</h5>
                    <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                      {workOrder.description}
                    </p>
                  </div>

                  {/* Solución implementada */}
                  {workOrder.solution_text && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Solución Implementada</h5>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {workOrder.solution_text}
                      </p>
                    </div>
                  )}

                  {/* Detalles técnicos */}
                  {workOrder.resolution_details && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Detalles Técnicos</h5>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {workOrder.resolution_details}
                      </p>
                    </div>
                  )}

                  {/* Evidencia de la solución */}
                  {workOrder.evidence_solution_url && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Evidencia de Solución</h5>
                      {renderEvidenceImage(workOrder.evidence_solution_url)}
                    </div>
                  )}

                  {/* Evidencia del reporte inicial */}
                  {workOrder.initialResponse?.evidence_url && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Evidencia del Reporte Inicial</h5>
                      {renderEvidenceImage(workOrder.initialResponse.evidence_url)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResolvedFailuresHistory;
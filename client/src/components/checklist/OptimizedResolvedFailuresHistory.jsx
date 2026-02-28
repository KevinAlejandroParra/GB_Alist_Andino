'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const OptimizedResolvedFailuresHistory = ({ resolvedFailures }) => {
  const [expandedCard, setExpandedCard] = useState(null)

  if (!resolvedFailures || resolvedFailures.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-double text-2xl text-green-600"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay fallas resueltas</h3>
          <p className="text-sm text-gray-600">No se han resuelto fallas para este checklist.</p>
        </div>
      </div>
    )
  }

  const toggleExpanded = (failureId) => {
    setExpandedCard(expandedCard === failureId ? null : failureId)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible'
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
  }

  const getStatusChip = (status) => {
    const statusConfig = {
      'RESUELTA': { color: 'bg-green-100 text-green-800', icon: 'fa-check-circle' },
      'CERRADO': { color: 'bg-slate-100 text-slate-800', icon: 'fa-lock' },
      'COMPLETADO': { color: 'bg-blue-100 text-blue-800', icon: 'fa-flag-checkered' }
    }
    const config = statusConfig[status] || statusConfig['RESUELTA']
    return config
  }

  const getSeverityChip = (severity) => {
    const severityConfig = {
      'CRITICA': { color: 'bg-red-100 text-red-800', icon: 'fa-exclamation-triangle' },
      'MODERADA': { color: 'bg-orange-100 text-orange-800', icon: 'fa-exclamation-circle' },
      'LEVE': { color: 'bg-yellow-100 text-yellow-800', icon: 'fa-info-circle' }
    }
    const config = severityConfig[severity] || severityConfig['LEVE']
    return config
  }

  const getRecurrenceChip = (recurrenceCount) => {
    const count = recurrenceCount || 1
    if (count === 1) {
      return { color: 'bg-blue-100 text-blue-800', text: 'Primera vez', icon: 'fa-star' }
    } else if (count === 2) {
      return { color: 'bg-orange-100 text-orange-800', text: 'Recurrente', icon: 'fa-repeat' }
    } else {
      return { color: 'bg-red-100 text-red-800', text: `Múltiple (${count})`, icon: 'fa-history' }
    }
  }

  const getReporterName = (failure) => {
    // Intentar diferentes formas de acceder al nombre del reporter
    return failure.reporter?.user_name || 
           failure.reporter?.name || 
           failure.reported_by_user_name || 
           `Usuario ${failure.reported_by_id || 'N/A'}`
  }

  const renderEvidenceImage = (evidenceUrl, title = "Evidencia") => {
    if (!evidenceUrl) return null
    
    const cleanUrl = evidenceUrl.trim()
    if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined') {
      return null
    }

    const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
    const absoluteUrl = cleanUrl.startsWith('http') ? cleanUrl : `${API_URL}${cleanUrl}`
    
    const isImageUrl = (url) => {
      return url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    }

    if (isImageUrl(cleanUrl)) {
      return (
        <div className="mt-2">
          <img
            src={absoluteUrl}
            alt={title}
            className="max-w-sm max-h-48 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.open(absoluteUrl, '_blank')}
            onError={(e) => {
              const parent = e.target.parentElement
              parent.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-sm text-red-600">
                    <i class="fas fa-image mr-2"></i>
                    Error al cargar imagen
                  </p>
                </div>
              `
            }}
          />
        </div>
      )
    }
    
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 mb-2">{title}</p>
        <a
          href={absoluteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <i className="fas fa-external-link-alt mr-2"></i>
          Ver evidencia
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-double text-white"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Historial de Fallas Resueltas</h3>
            <p className="text-sm text-gray-600">{resolvedFailures.length} fallas han sido resueltas</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <i className="fas fa-history"></i>
          <span>Última actualización {format(new Date(), 'HH:mm')}</span>
        </div>
      </div>

      <div className="grid gap-4">
        {resolvedFailures.map((failure) => (
          <div key={failure.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header del card */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-purple-600">OF-{failure.failure_order_id}</span>
                      {failure.workOrder && (
                        <span className="text-sm font-medium text-blue-600">OT-{failure.workOrder.work_order_id}</span>
                      )}
                    </div>
                    {failure.workOrder && (
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusChip(failure.workOrder.status).color}`}>
                        <i className={`fas ${getStatusChip(failure.workOrder.status).icon} mr-1.5`}></i>
                        {failure.workOrder.status.replace('_', ' ')}
                      </div>
                    )}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityChip(failure.severity).color}`}>
                      <i className={`fas ${getSeverityChip(failure.severity).icon} mr-1.5`}></i>
                      {failure.severity || 'LEVE'}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRecurrenceChip(failure.recurrence_count).color}`}>
                      <i className={`fas ${getRecurrenceChip(failure.recurrence_count).icon} mr-1.5`}></i>
                      {getRecurrenceChip(failure.recurrence_count).text}
                    </div>
                  </div>

                  {/* Información clave: Quién reporta, Severidad, Descripción */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-user text-gray-500 w-4"></i>
                      <span className="text-sm font-medium text-gray-600">Reportado por:</span>
                      <span className="text-sm text-gray-800 font-medium">{getReporterName(failure)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-exclamation-triangle text-gray-500 w-4"></i>
                      <span className="text-sm font-medium text-gray-600">Severidad:</span>
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSeverityChip(failure.severity).color}`}>
                        <i className={`fas ${getSeverityChip(failure.severity).icon} mr-1`}></i>
                        {failure.severity || 'LEVE'}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-800 mb-3 line-clamp-2 font-medium">{failure.description || 'Sin descripción disponible'}</p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <i className="fas fa-calendar-alt mr-1.5"></i>
                      Recurrencia #{failure.recurrence_count || 1} - {formatDate(failure.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-check-circle mr-1.5 text-green-600"></i>
                      Resuelto: {failure.workOrder?.end_time ? formatDate(failure.workOrder.end_time) : 'No disponible'}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleExpanded(failure.id)}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className={`fas fa-chevron-${expandedCard === failure.id ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>

            {/* Contenido expandido */}
            {expandedCard === failure.id && (
              <div className="px-6 pb-6 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-green-50">
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {/* Información del Reporte (OF) */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center">
                      <i className="fas fa-file-alt mr-2 text-purple-600"></i>
                      Información del Reporte (OF)
                    </h5>
                    <div className="bg-white rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500">ID Orden de Falla</span>
                        <p className="text-sm font-medium text-gray-800">OF-{failure.failure_order_id}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Reportado por</span>
                        <p className="text-sm text-gray-800">{getReporterName(failure)}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Fecha de reporte</span>
                        <p className="text-sm text-gray-800">{formatDate(failure.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Severidad</span>
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${getSeverityChip(failure.severity).color}`}>
                          <i className={`fas ${getSeverityChip(failure.severity).icon} mr-1`}></i>
                          {failure.severity || 'LEVE'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Recurrencias</span>
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${getRecurrenceChip(failure.recurrence_count).color}`}>
                          <i className={`fas ${getRecurrenceChip(failure.recurrence_count).icon} mr-1`}></i>
                          {getRecurrenceChip(failure.recurrence_count).text}
                        </div>
                      </div>
                      {failure.affectedInspectable && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Área/Atracción afectada</span>
                          <p className="text-sm text-gray-800">{failure.affectedInspectable.name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del Trabajo (OT) */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center">
                      <i className="fas fa-tools mr-2 text-blue-600"></i>
                      Información del Trabajo (OT)
                    </h5>
                    {failure.workOrder ? (
                      <div className="bg-white rounded-lg p-4 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500">ID Orden de Trabajo</span>
                          <p className="text-sm font-medium text-gray-800">OT-{failure.workOrder.work_order_id}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Estado final</span>
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusChip(failure.workOrder.status).color}`}>
                            <i className={`fas ${getStatusChip(failure.workOrder.status).icon} mr-1`}></i>
                            {failure.workOrder.status.replace('_', ' ')}
                          </div>
                        </div>
                        {failure.workOrder.resolved_by_id && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Resuelto por</span>
                            <p className="text-sm text-gray-800">{failure.workOrder.resolver?.user_name || 'N/A'}</p>
                          </div>
                        )}
                        {failure.workOrder.end_time && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Fecha de resolución</span>
                            <p className="text-sm text-gray-800">{formatDate(failure.workOrder.end_time)}</p>
                          </div>
                        )}
                        {failure.workOrder.activity_performed && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Trabajo realizado</span>
                            <p className="text-sm text-gray-800">{failure.workOrder.activity_performed}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center text-gray-500">
                          <i className="fas fa-question-circle text-2xl mb-2"></i>
                          <p className="text-sm">Información de OT no disponible</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Descripción de la falla */}
                <div className="mt-6">
                  <h5 className="text-sm font-semibold text-gray-800 flex items-center mb-3">
                    <i className="fas fa-file-text mr-2 text-purple-600"></i>
                    Descripción de la Falla
                  </h5>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">{failure.description || 'Sin descripción disponible'}</p>
                  </div>
                </div>

                {/* Solución implementada */}
                {failure.workOrder?.activity_performed && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center mb-3">
                      <i className="fas fa-wrench mr-2 text-green-600"></i>
                      Solución Implementada
                    </h5>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600">{failure.workOrder.activity_performed}</p>
                    </div>
                  </div>
                )}

                {/* Evidencia de la solución */}
                {failure.workOrder?.evidence_url && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center mb-3">
                      <i className="fas fa-camera mr-2 text-green-600"></i>
                      Evidencia de Solución
                    </h5>
                    <div className="bg-white rounded-lg p-4">
                      {renderEvidenceImage(failure.workOrder.evidence_url)}
                    </div>
                  </div>
                )}

                {/* Evidencia del reporte inicial */}
                {failure.evidence_url && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center mb-3">
                      <i className="fas fa-image mr-2 text-purple-600"></i>
                      Evidencia del Reporte Inicial
                    </h5>
                    <div className="bg-white rounded-lg p-4">
                      {renderEvidenceImage(failure.evidence_url)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OptimizedResolvedFailuresHistory
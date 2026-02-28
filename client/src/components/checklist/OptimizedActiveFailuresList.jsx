'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const OptimizedActiveFailuresList = ({ failures, user, onUpdate }) => {
  const [expandedCard, setExpandedCard] = useState(null)

  if (!failures || failures.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-circle text-2xl text-purple-600"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay fallas activas</h3>
          <p className="text-sm text-gray-600">¡Excelente! No se han detectado fallas pendientes de atención.</p>
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

  const getStatusIcon = (status) => {
    const statusConfig = {
      'EN_PROCESO': { icon: 'fa-spinner', color: 'text-blue-600', bg: 'bg-blue-100' },
      'EN_PRUEBAS': { icon: 'fa-vial', color: 'text-orange-600', bg: 'bg-orange-100' },
      'RESUELTA': { icon: 'fa-check', color: 'text-green-600', bg: 'bg-green-100' },
      'PENDIENTE': { icon: 'fa-clock', color: 'text-slate-600', bg: 'bg-slate-100' }
    }
    return statusConfig[status] || statusConfig['PENDIENTE']
  }

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      'CRITICA': { color: 'bg-red-100 text-red-800 border-red-200', icon: 'fa-exclamation-triangle' },
      'MODERADA': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'fa-exclamation-circle' },
      'LEVE': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'fa-info-circle' }
    }
    const config = severityConfig[severity] || severityConfig['LEVE']
    return config
  }

  const getMaintenanceTypeIcon = (type) => {
    const typeConfig = {
      'TECNICA': { icon: 'fa-tools', color: 'text-blue-600' },
      'OPERATIVA': { icon: 'fa-cogs', color: 'text-green-600' },
      'LOCATIVA': { icon: 'fa-building', color: 'text-purple-600' },
      'SST': { icon: 'fa-shield-alt', color: 'text-red-600' }
    }
    return typeConfig[type] || typeConfig['TECNICA']
  }

  const getReporterName = (failure) => {
    // DEBUG: Log completo de failure para ver qué datos están llegando
    console.log('🔍 [DEBUG FRONTEND] Datos completos del failure:', JSON.stringify(failure, null, 2));
    
    // Intentar diferentes formas de acceder al nombre del reporter
    const reporterName = failure.reporter?.user_name || 
                         failure.reporter?.name || 
                         failure.reported_by_user_name || 
                         `Usuario ${failure.reported_by_id || 'N/A'}`;
    
    console.log('🔍 [DEBUG FRONTEND] Reporter name extraído:', reporterName);
    return reporterName;
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
            className="max-w-sm max-h-48 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
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
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-white"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Fallas Activas</h3>
            <p className="text-sm text-gray-600">{failures.length} fallas requieren atención</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <i className="fas fa-refresh"></i>
          <span>Actualizado {format(new Date(), 'HH:mm')}</span>
        </div>
      </div>

      <div className="grid gap-4">
        {failures.map((failure) => (
          <div key={failure.id || failure.failure_order_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
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
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusIcon(failure.workOrder.status).bg} ${getStatusIcon(failure.workOrder.status).color}`}>
                        <i className={`fas ${getStatusIcon(failure.workOrder.status).icon} mr-1.5`}></i>
                        {failure.workOrder.status.replace('_', ' ')}
                      </div>
                    )}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getSeverityBadge(failure.severity).color}`}>
                      <i className={`fas ${getSeverityBadge(failure.severity).icon} mr-1.5`}></i>
                      {failure.severity || 'LEVE'}
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
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSeverityBadge(failure.severity).color}`}>
                        <i className={`fas ${getSeverityBadge(failure.severity).icon} mr-1`}></i>
                        {failure.severity || 'LEVE'}
                      </div>
                    </div>

                    {/* Mostrar ítem asociado */}
                    {failure.checklistItem && (
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-list text-gray-500 w-4"></i>
                        <span className="text-sm font-medium text-gray-600">Ítem asociado:</span>
                        <span className="text-sm text-gray-800 font-medium">{failure.checklistItem.question_text || 'N/A'}</span>
                      </div>
                    )}

                    {/* Mostrar dispositivo afectado */}
                    {failure.affectedInspectable && (
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-tools text-gray-500 w-4"></i>
                        <span className="text-sm font-medium text-gray-600">Dispositivo afectado:</span>
                        <span className="text-sm text-gray-800 font-medium">{failure.affectedInspectable.name || 'N/A'}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-800 mb-3 line-clamp-2 font-medium">{failure.description || 'Sin descripción disponible'}</p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <i className="fas fa-calendar-alt mr-1.5"></i>
                      {formatDate(failure.createdAt)}
                    </div>
                    {failure.assigned_to && (
                      <div className="flex items-center">
                        <i className={`fas ${getMaintenanceTypeIcon(failure.assigned_to).icon} mr-1.5`}></i>
                        <span className={getMaintenanceTypeIcon(failure.assigned_to).color}>
                          {failure.assigned_to}
                        </span>
                      </div>
                    )}
                    {failure.workOrder?.start_time && (
                      <div className="flex items-center">
                        <i className="fas fa-play mr-1.5"></i>
                        Inicio: {formatDate(failure.workOrder.start_time)}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleExpanded(failure.id || failure.failure_order_id)}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className={`fas fa-chevron-${expandedCard === (failure.id || failure.failure_order_id) ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>

            {/* Contenido expandido */}
            {expandedCard === (failure.id || failure.failure_order_id) && (
              <div className="px-6 pb-6 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-purple-50">
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {/* Información del Reporte (OF) */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center">
                      <i className="fas fa-file-alt mr-2 text-purple-600"></i>
                      Información del Reporte
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
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${getSeverityBadge(failure.severity).color}`}>
                          <i className={`fas ${getSeverityBadge(failure.severity).icon} mr-1`}></i>
                          {failure.severity || 'LEVE'}
                        </div>
                      </div>
                      {failure.affectedInspectable && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Área/Atracción afectada</span>
                          <p className="text-sm text-gray-800">{failure.affectedInspectable.name}</p>
                        </div>
                      )}
                      {failure.checklistItem && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Ítem del checklist</span>
                          <p className="text-sm text-gray-800">{failure.checklistItem.question_text}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del Trabajo (OT) */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center">
                      <i className="fas fa-tools mr-2 text-blue-600"></i>
                      Información del Trabajo
                    </h5>
                    {failure.workOrder ? (
                      <div className="bg-white rounded-lg p-4 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500">ID Orden de Trabajo</span>
                          <p className="text-sm font-medium text-gray-800">OT-{failure.workOrder.work_order_id}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Estado actual</span>
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusIcon(failure.workOrder.status).bg} ${getStatusIcon(failure.workOrder.status).color}`}>
                            <i className={`fas ${getStatusIcon(failure.workOrder.status).icon} mr-1`}></i>
                            {failure.workOrder.status}
                          </div>
                        </div>
                        {failure.workOrder.start_time && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Hora de inicio</span>
                            <p className="text-sm text-gray-800">{formatDate(failure.workOrder.start_time)}</p>
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
                          <i className="fas fa-clock text-2xl mb-2"></i>
                          <p className="text-sm">Trabajo no iniciado</p>
                          <p className="text-xs">La orden de trabajo aún no ha sido creada</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidencia del reporte */}
                {(failure.evidence_url || failure.evidenceUrl) && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-800 flex items-center mb-3">
                      <i className="fas fa-camera mr-2 text-purple-600"></i>
                      Evidencia del Reporte
                    </h5>
                    <div className="bg-white rounded-lg p-4">
                      {renderEvidenceImage(failure.evidence_url || failure.evidenceUrl)}
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

export default OptimizedActiveFailuresList
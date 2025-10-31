'use client'

import React from 'react'

/**
 * Componente para mostrar el estado visual de una orden de trabajo pendiente
 * @param {Object} props 
 * @param {Object} props.workOrder - Datos de la orden de trabajo
 * @param {Function} props.onClick - Función al hacer clic (abrir modal)
 * @param {string} props.size - Tamaño del indicador ('sm', 'md', 'lg')
 * @param {boolean} props.showDetails - Si mostrar detalles adicionales
 */
export default function WorkOrderStatusIndicator({ 
  workOrder, 
  onClick, 
  size = 'md',
  showDetails = true 
}) {
  if (!workOrder) return null

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  }

  const getStatusColor = (status, severity) => {
    if (status === 'PENDIENTE') {
      return severity === 'crítica' 
        ? 'bg-red-100 text-red-800 border-red-200' 
        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    if (status === 'EN_PROCESO') {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'crítica':
        return '🚨'
      case 'leve':
        return '⚠️'
      default:
        return '📋'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const recurrenceText = workOrder.recurrence_count > 1 
    ? `${workOrder.recurrence_count} recurrencias`
    : 'Primera vez'

  const statusClass = getStatusColor(workOrder.status, workOrder.severity)

  return (
    <div className="mt-2">
      <div
        onClick={() => onClick && onClick(workOrder)}
        className={`
          border rounded-lg cursor-pointer transition-all duration-200 
          hover:shadow-md hover:scale-105 active:scale-95
          ${sizeClasses[size]} ${statusClass}
        `}
        title={`OT: ${workOrder.work_order_id} - ${recurrenceText}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {getSeverityIcon(workOrder.severity)}
          </span>
          
          <div className="flex-1">
            <div className="font-medium">
              OT-{workOrder.work_order_id?.split('-').pop() || workOrder.id}
            </div>
            
            {showDetails && (
              <div className="text-xs opacity-75 mt-1">
                {recurrenceText}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 5l7 7-7 7" 
              />
            </svg>
          </div>
        </div>
      </div>

      {showDetails && workOrder.description && (
        <div className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2 border-l-2 border-gray-200">
          <div className="font-medium mb-1">Descripción:</div>
          <div className="text-gray-700">
            {workOrder.description.length > 80 
              ? `${workOrder.description.substring(0, 80)}...`
              : workOrder.description
            }
          </div>
          
          <div className="mt-1 text-gray-500">
            Primera detección: {formatDate(workOrder.first_reported_date)}
            {workOrder.last_updated_date && (
              <span className="ml-2">
                Última actualización: {formatDate(workOrder.last_updated_date)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Indicador de estado con puntos */}
      <div className="flex items-center gap-1 mt-1">
        <div className={`w-2 h-2 rounded-full ${
          workOrder.status === 'PENDIENTE' 
            ? workOrder.severity === 'crítica' 
              ? 'bg-red-500' 
              : 'bg-yellow-500'
            : workOrder.status === 'EN_PROCESO'
              ? 'bg-blue-500'
              : 'bg-gray-400'
        }`} />
        
        <span className="text-xs text-gray-600 font-medium">
          {workOrder.status}
        </span>
        
        {workOrder.responsible_area && (
          <span className="text-xs text-gray-500">
            • {workOrder.responsible_area}
          </span>
        )}
      </div>
    </div>
  )
}
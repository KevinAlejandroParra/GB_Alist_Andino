'use client'

import React, { useState } from 'react'
import { useWorkOrderDetection } from './hooks/useWorkOrderDetection'
import RecurringFailureModal from './RecurringFailureModal'
import axiosInstance from '../../utils/axiosConfig'

/**
 * Componente para mostrar lista de work orders activas con opciones de acción
 * @param {Object} props
 * @param {Array} props.workOrders - Array de work orders activas
 * @param {Object} props.user - Datos del usuario actual
 * @param {Function} props.onUpdate - Callback para actualizar la lista
 */
export default function ActiveFailuresList({ workOrders, user, onUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([])
  const [responseData, setResponseData] = useState(null)

  // Formato de fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Obtener texto de recurrencia
  const getRecurrenceText = (wo) => {
    if (!wo) return ''
    if (wo.recurrence_count === 1) {
      return 'Primera vez'
    }
    return `${wo.recurrence_count} recurrencias`
  }

  // Obtener color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800'
      case 'EN_PROCESO': return 'bg-blue-100 text-blue-800'
      case 'RESUELTO': return 'bg-green-100 text-green-800'
      case 'CERRADO': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Función para manejar acción individual
  const handleIndividualAction = (wo, action) => {
    if (action === 'maintain' || action === 'resolve') {
      setSelectedWorkOrders([wo])
      setShowModal(true)
      // Preparar datos de respuesta si viene de respuesta del checklist
      setResponseData({
        userResponse: wo.status === 'PENDIENTE' ? 'observación' : 'no cumple',
        userComment: wo.description || '',
        uniqueResponseId: wo.checklist_item_id
      })
    }
  }

  // Manejar cierre del modal
  const handleModalClose = () => {
    setShowModal(false)
    setSelectedWorkOrders([])
    setResponseData(null)
    onUpdate && onUpdate()
  }

  // Manejar éxito del modal
  const handleModalSuccess = (action, data, updatedResponseData) => {
    const messages = {
      'maintain': 'Falla mantenida exitosamente.',
      'new': 'Nueva falla creada exitosamente.',
      'resolve': 'Falla resuelta exitosamente.'
    }

    // Mostrar mensaje de éxito
    const message = messages[action] || 'Acción completada exitosamente.'
    
    // Importar Swal dinámicamente para evitar SSR issues
    if (typeof window !== 'undefined') {
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire('¡Éxito!', message, 'success')
      })
    }

    // Cerrar modal y actualizar
    handleModalClose()
  }

  if (!workOrders || workOrders.length === 0) {
    return null
  }

  return (
    <>
      {/* Lista de fallas activas */}
      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-red-800">
            🔍 Fallas Activas Detectadas ({workOrders.length})
          </h4>
          <div className="text-xs text-red-600">
            Acciones disponibles para cada falla
          </div>
        </div>

        <div className="space-y-3">
          {workOrders.map((wo, index) => (
            <div
              key={wo.id}
              className="bg-white border border-red-200 rounded-lg p-4 shadow-sm"
            >
              {/* Header de la falla */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {wo.work_order_id || `OT-${wo.id}`}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                      {wo.status}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      {getRecurrenceText(wo)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {wo.description || 'Sin descripción'}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>📅 Primera vez: {formatDate(wo.first_reported_date)}</span>
                    {wo.last_updated_date && (
                      <span>🔄 Última actualización: {formatDate(wo.last_updated_date)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones disponibles */}
              <div className="flex items-center space-x-2 pt-2 border-t border-red-100">
                <button
                  onClick={() => handleIndividualAction(wo, 'maintain')}
                  className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-medium hover:bg-yellow-200 transition-colors"
                  title="Mantener falla (incrementar contador)"
                >
                  🔄 Mantener
                </button>
                
                <button
                  onClick={() => handleIndividualAction(wo, 'resolve')}
                  className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium hover:bg-green-200 transition-colors"
                  title="Resolver falla (cerrar OT)"
                >
                  ✅ Resolver
                </button>

                {/* Acción para crear nueva falla - solo si es necesario */}
                {index === workOrders.length - 1 && (
                  <button
                    onClick={() => {
                      setSelectedWorkOrders([wo])
                      setShowModal(true)
                      // Set tab to 'new' - we'll handle this in the modal
                      setResponseData({
                        userResponse: 'no cumple',
                        userComment: '',
                        uniqueResponseId: wo.checklist_item_id
                      })
                    }}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                    title="Crear nueva falla independiente"
                  >
                    ➕ Nueva Falla
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Nota informativa */}
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-red-700">
              <p className="font-medium mb-1">💡 Acciones disponibles:</p>
              <ul className="space-y-1">
                <li>• <strong>Mantener:</strong> Incrementa el contador de recurrencia de la falla existente</li>
                <li>• <strong>Resolver:</strong> Cierra la orden de trabajo con detalles de la solución</li>
                <li>• <strong>Nueva Falla:</strong> Crea una orden de trabajo completamente independiente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de manejo de fallas */}
      {showModal && (
        <RecurringFailureModal
          isOpen={showModal}
          onClose={handleModalClose}
          workOrders={selectedWorkOrders}
          user={user}
          onSuccess={handleModalSuccess}
          onWorkOrdersUpdate={() => onUpdate && onUpdate()}
          responseData={responseData}
        />
      )}
    </>
  )
}
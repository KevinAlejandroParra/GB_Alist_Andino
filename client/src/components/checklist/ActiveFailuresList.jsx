'use client'

import React from 'react'
import RecurringFailureModal from './RecurringFailureModal'

/**
 * Componente simplificado para mostrar botón de gestión de fallas
 * @param {Object} props
 * @param {Array} props.workOrders - Array de fallas activas
 * @param {Object} props.user - Datos del usuario actual
 * @param {Function} props.onUpdate - Callback para actualizar la lista
 */
export default function ActiveFailuresList({ workOrders, user, onUpdate }) {
  const [showModal, setShowModal] = React.useState(false)
  const [selectedWorkOrders, setSelectedWorkOrders] = React.useState([])
  const [responseData, setResponseData] = React.useState(null)

  // Si no hay fallas activas, no mostrar nada
  if (!workOrders || workOrders.length === 0) {
    return null
  }

  // Manejar clic en el botón
  const handleOpenFailureManagement = () => {
    setSelectedWorkOrders(workOrders)
    setShowModal(true)
    setResponseData({
      userResponse: workOrders[0]?.status === 'PENDIENTE' ? 'observación' : 'no cumple',
      userComment: workOrders[0]?.description || '',
      uniqueResponseId: workOrders[0]?.checklist_item_id
    })
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
      'maintain': '✅ Falla mantenida exitosamente.',
      'new': '🆕 Nueva falla creada exitosamente.',
      'resolve': '🎯 Falla resuelta exitosamente.'
    }

    const message = messages[action] || '✅ Acción completada exitosamente.'
    
    if (typeof window !== 'undefined') {
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({
          title: '¡Éxito!',
          text: message,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true
        })
      })
    }

    handleModalClose()
  }

  return (
    <>
      {/* Botón simple para abrir gestión de fallas */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <h4 className="text-sm font-semibold text-amber-800">
                {workOrders.length} {workOrders.length === 1 ? 'falla detectada' : 'fallas detectadas'}
              </h4>
              <p className="text-xs text-amber-700">
                Acciones disponibles para gestión de fallas
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenFailureManagement}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            🔧 Gestionar Fallas
          </button>
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
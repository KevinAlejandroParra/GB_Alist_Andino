'use client'

import React from 'react'
import RecurringFailureModal from './RecurringFailureModal'

/**
 * Componente simplificado para mostrar botón de gestión de fallas
 * @param {Object} props
 * @param {Array} props.workOrders - Array de fallas activas
 * @param {Object} props.user - Datos del usuario actual (debe incluir role_id)
 * @param {Function} props.onUpdate - Callback para actualizar la lista
 * @param {Object} props.currentResponse - Respuesta actual del item (para validación)
 * @param {Boolean} props.isReadOnly - Si el checklist está en modo solo lectura
 * 
 * Lógica de acceso:
 * - Administradores (role_id = 1): Acceso directo siempre, sin validación
 * - Checklists firmados (isReadOnly = true): Acceso directo para revisión
 * - Otros usuarios en edición: Deben marcar "Observación" o "No Cumple" primero
 */
export default function ActiveFailuresList({ workOrders, user, onUpdate, currentResponse, isReadOnly = false }) {
  const [showModal, setShowModal] = React.useState(false)
  const [selectedWorkOrders, setSelectedWorkOrders] = React.useState([])
  const [responseData, setResponseData] = React.useState(null)

  // Si no hay fallas activas, no mostrar nada
  if (!workOrders || workOrders.length === 0) {
    return null
  }

  // Manejar clic en el botón
  const handleOpenFailureManagement = () => {
    // Permitir acceso directo a administradores (role_id = 1) sin validación
    const isAdmin = user?.role_id === 1 || user?.role_id === '1'
    
    // Si es administrador O el checklist está en modo solo lectura (firmado), permitir ver las fallas sin validación
    // Esto permite que admins y supervisores revisen las fallas en cualquier momento
    if (isAdmin || isReadOnly) {
      setSelectedWorkOrders(workOrders)
      setShowModal(true)
      setResponseData({
        userResponse: currentResponse?.response_compliance || 'observaciones',
        userComment: workOrders[0]?.description || '',
        uniqueResponseId: workOrders[0]?.checklist_item_id
      })
      return
    }

    // Para checklists en edición (usuarios no admin), validar que el usuario haya marcado primero "No Cumple" u "Observación"
    const hasValidResponse = currentResponse && (
      currentResponse.response_compliance === 'no_cumple' ||
      currentResponse.response_compliance === 'observaciones'
    )

    if (!hasValidResponse) {
      // Mostrar alerta si no ha marcado la respuesta correcta
      if (typeof window !== 'undefined') {
        import('sweetalert2').then(({ default: Swal }) => {
          Swal.fire({
            icon: 'warning',
            title: '⚠️ Acción Requerida',
            html: `
              <div style="text-align: left;">
                <p style="margin-bottom: 15px;">Para gestionar las fallas de este ítem, primero debes marcar la respuesta como:</p>
                <ul style="list-style: none; padding-left: 0;">
                  <li style="margin-bottom: 8px;">
                    <span style="background: #fef3c7; padding: 4px 12px; border-radius: 6px; display: inline-block;">
                      ⚠️ <strong>Observación</strong>
                    </span>
                  </li>
                  <li>
                    <span style="background: #fee2e2; padding: 4px 12px; border-radius: 6px; display: inline-block;">
                      ❌ <strong>No Cumple</strong>
                    </span>
                  </li>
                </ul>
                <p style="margin-top: 15px; color: #64748b; font-size: 14px;">
                  💡 <strong>Tip:</strong> El flujo correcto es marcar primero la respuesta, luego gestionar la falla.
                </p>
              </div>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#7c3aed',
            width: '500px',
            customClass: {
              popup: 'rounded-2xl shadow-2xl',
              title: 'text-slate-800 font-bold',
              confirmButton: 'rounded-xl font-semibold px-6 py-3',
            }
          })
        })
      }
      return
    }

    // Si la validación pasa, abrir el modal
    setSelectedWorkOrders(workOrders)
    setShowModal(true)
    setResponseData({
      userResponse: currentResponse.response_compliance,
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
'use client'

import React, { useState } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import { useFileUpload } from './hooks/useFileUpload'

/**
 * Modal para manejar fallas recurrentes con 3 opciones
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Función para cerrar modal
 * @param {Object} props.workOrder - Datos de la orden de trabajo
 * @param {Object} props.user - Datos del usuario actual
 * @param {Function} props.onOptionSelected - Callback cuando se selecciona una opción
 * @param {Function} props.onSuccess - Callback cuando se completa exitosamente
 */
export default function RecurringFailureModal({
  isOpen,
  onClose,
  workOrders, // ✅ CAMBIADO: Ahora acepta un ARRAY de work orders
  user,
  onOptionSelected,
  onSuccess,
  onWorkOrdersUpdate, // Callback para actualizar la lista de WorkOrders
  responseData // Datos de la respuesta del usuario
}) {
  const [activeTab, setActiveTab] = useState('maintain') // 'maintain', 'new', 'resolve'
  const [selectedWorkOrderIndex, setSelectedWorkOrderIndex] = useState(0) // ✅ NUEVO: índice de work order seleccionada
  const [loading, setLoading] = useState(false)
  const [uploadedEvidenceUrls, setUploadedEvidenceUrls] = useState({
    newFailure: null,
    solution: null
  })
  const [formData, setFormData] = useState({
    // Para mantener - SE INICIALIZA CON EL COMENTARIO DEL USUARIO
    maintainReason: responseData?.userComment || '',
    
    // Para nueva falla
    newFailureDescription: '',
    newFailureSeverity: 'leve',
    newFailureEvidence: null,
    
    // Para resolver
    solutionText: '',
    resolutionDetails: '',
    responsibleArea: '',
    evidenceSolution: null
  })

  // ✅ NUEVO: Obtener la work order actualmente seleccionada
  const selectedWorkOrder = workOrders?.[selectedWorkOrderIndex]

  // ✅ NUEVO: Efecto para resetear cuando cambien las work orders
  React.useEffect(() => {
    if (workOrders && workOrders.length > 0) {
      setSelectedWorkOrderIndex(0)
    }
  }, [workOrders])

  // Efecto para actualizar la razón cuando cambian los datos de respuesta
  React.useEffect(() => {
    if (responseData?.userComment) {
      setFormData(prev => ({
        ...prev,
        maintainReason: responseData.userComment
      }));
    }
  }, [responseData?.userComment]);

  // Hook para subida de archivos
  const { handleFileUpload } = useFileUpload(user)

  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"

  const maintainWorkOrder = async (workOrderId, reason = null) => {
    const response = await axiosInstance.put(
      `${API_URL}/api/work-orders/${workOrderId}/maintain`,
      { recurrence_reason: reason },
      { headers: { Authorization: `Bearer ${user.token}` } }
    )
    return { success: true, data: response.data }
  }

  const createNewFailure = async (failureData) => {
    const response = await axiosInstance.post(
      `${API_URL}/api/work-orders/new-failure`,
      failureData,
      { headers: { Authorization: `Bearer ${user.token}` } }
    )
    return { success: true, data: response.data }
  }

  const resolveWorkOrder = async (workOrderId, resolutionData) => {
    const response = await axiosInstance.put(
      `${API_URL}/api/work-orders/${workOrderId}/resolve`,
      resolutionData,
      { headers: { Authorization: `Bearer ${user.token}` } }
    )
    return { success: true, data: response.data }
  }

  // ✅ VALIDACIÓN: Verificar que hay work orders disponibles
  if (!isOpen || !workOrders || workOrders.length === 0) return null

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileChange = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }))
  }

  // Función para subir evidencia al servidor usando multer
  const uploadEvidenceToServer = async (file, type) => {
    if (!file) return null
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const formData = new FormData()
      formData.append("evidence", file)

      const response = await axiosInstance.post(`${API_URL}/api/checklists/upload-evidence`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const filePath = response.data.filePath
      
      setUploadedEvidenceUrls(prev => ({
        ...prev,
        [type]: filePath
      }))
      
      return filePath
    } catch (error) {
      console.error(`Error subiendo evidencia ${type}:`, error)
      throw new Error(`Error al subir archivo: ${error.response?.data?.error || error.message}`)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleOptionSubmit = async () => {
    setLoading(true)
    try {
      let result
      
      switch (activeTab) {
        case 'maintain':
          result = await maintainWorkOrder(selectedWorkOrder.id, formData.maintainReason)
          // 📤 ENVÍO DE INFORMACIÓN ACTUALIZADA AL CHECKLIST
          const updatedResponseData = {
            ...responseData,
            comment: formData.maintainReason,
            updated: true
          }
          onSuccess && onSuccess(activeTab, result.data, updatedResponseData)
          break
          
        case 'new':
          const newFailureData = {
            checklist_item_id: selectedWorkOrder.checklist_item_id,
            inspectable_id: selectedWorkOrder.inspectable_id,
            checklist_id: selectedWorkOrder.initialResponse?.checklist_id,
            description: formData.newFailureDescription || selectedWorkOrder.description,
            severity: formData.newFailureSeverity,
            reported_by_id: user.user_id
          }
          
          if (formData.newFailureEvidence) {
            try {
              const evidenceUrl = await uploadEvidenceToServer(formData.newFailureEvidence, 'newFailure')
              newFailureData.evidence_url = evidenceUrl
            } catch (error) {
              throw new Error('Error al subir evidencia de nueva falla: ' + error.message)
            }
          }
          
          result = await createNewFailure(newFailureData)
          break
          
        case 'resolve':
          const resolutionData = {
            solution_text: formData.solutionText,
            resolution_details: formData.resolutionDetails,
            responsible_area: formData.responsibleArea,
            closing_response_id: selectedWorkOrder.initial_response_id
          }
          
          if (formData.evidenceSolution) {
            try {
              const evidenceUrl = await uploadEvidenceToServer(formData.evidenceSolution, 'solution')
              resolutionData.evidence_solution_url = evidenceUrl
            } catch (error) {
              throw new Error('Error al subir evidencia de solución: ' + error.message)
            }
          }
          
          result = await resolveWorkOrder(selectedWorkOrder.id, resolutionData)
          break
      }

      if (result?.success) {
        if (activeTab === 'maintain') {
          // Solo actualizamos la información en el éxito de mantener
          onWorkOrdersUpdate && onWorkOrdersUpdate()
          onClose()
        } else {
          onSuccess && onSuccess(activeTab, result.data)
          onWorkOrdersUpdate && onWorkOrdersUpdate()
          onClose()
        }
      }
    } catch (error) {
      console.error('Error procesando opción:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = () => {
    switch (activeTab) {
      case 'maintain':
        return true // Siempre puede mantener
      case 'new':
        return formData.newFailureDescription.trim().length > 0 &&
               formData.newFailureEvidence !== null
      case 'resolve':
        return formData.solutionText.trim().length > 0 &&
               formData.responsibleArea.trim().length > 0
      default:
        return false
    }
  }

  const getRecurrenceText = (workOrder = selectedWorkOrder) => {
    if (!workOrder) return ''
    if (workOrder.recurrence_count === 1) {
      return 'Primera vez detectado'
    }
    return `${workOrder.recurrence_count} recurrencias`
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              ⚠️ Fallas Recurrentes Detectadas
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {workOrders.length} falla{workOrders.length > 1 ? 's' : ''} activa{workOrders.length > 1 ? 's' : ''} encontrada{workOrders.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ✅ NUEVO: Desplegable para seleccionar Work Order específica */}
        {workOrders.length > 1 && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Seleccionar Falla a Manejar:
            </label>
            <select
              value={selectedWorkOrderIndex}
              onChange={(e) => setSelectedWorkOrderIndex(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {workOrders.map((wo, index) => (
                <option key={wo.id} value={index}>
                  {wo.work_order_id || `OT-${wo.id}`} - {wo.description?.substring(0, 30)}...
                  ({wo.status}) - {getRecurrenceText(wo)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ✅ NUEVO: Mostrar resumen de todas las work orders */}
        {workOrders.length > 1 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              📋 Resumen de Fallas Activas:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workOrders.map((wo, index) => (
                <div
                  key={wo.id}
                  className={`p-3 rounded border text-sm ${
                    index === selectedWorkOrderIndex
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {wo.work_order_id || `OT-${wo.id}`}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      wo.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                      wo.status === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {wo.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs">
                    {wo.description?.substring(0, 50)}...
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {getRecurrenceText(wo)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ NUEVO: Info de la OT seleccionada actualmente */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          {/* ✅ NUEVO: Información sobre múltiples fallas */}
          {workOrders.length > 1 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h5 className="text-sm font-medium text-yellow-800 mb-1">Múltiples Fallas Activas</h5>
                  <p className="text-sm text-yellow-700">
                    Este ítem tiene {workOrders.length} fallas activas. Puedes seleccionar cuál falla manejar
                    usando el desplegable de arriba, o crear una nueva falla independiente.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Estado:</span>
              <span className="ml-2 text-gray-600">{selectedWorkOrder.status}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Recurrencias:</span>
              <span className="ml-2 text-gray-600">{getRecurrenceText()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Primera detección:</span>
              <span className="ml-2 text-gray-600">{formatDate(selectedWorkOrder.first_reported_date)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Última actualización:</span>
              <span className="ml-2 text-gray-600">{formatDate(selectedWorkOrder.last_updated_date)}</span>
            </div>
          </div>

          {/* Mostrar respuesta del usuario */}
          {responseData?.userResponse && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <span className="font-medium text-blue-700">Respuesta Seleccionada:</span>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  responseData.userResponse === 'no cumple'
                    ? 'bg-red-100 text-red-800'
                    : responseData.userResponse === 'observación'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {responseData.userResponse === 'no cumple' && '❌ No Cumple'}
                  {responseData.userResponse === 'observación' && '⚠️ Observación'}
                  {responseData.userResponse === 'cumple' && '✅ Cumple'}
                </span>
              </div>
              {responseData.userComment && (
                <p className="text-blue-600 mt-1 text-sm">
                  <span className="font-medium">Comentario:</span> {responseData.userComment}
                </p>
              )}
            </div>
          )}
          
          {selectedWorkOrder.description && (
            <div className="mt-4">
              <span className="font-medium text-gray-700">Descripción de la OT Seleccionada:</span>
              <p className="text-gray-600 mt-1 text-sm bg-white p-3 rounded border">
                {selectedWorkOrder.description}
              </p>
            </div>
          )}
        </div>

        {/* Tabs para las opciones */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'maintain', label: 'Mantener Falla', icon: '🔄' },
              { id: 'new', label: 'Nueva Falla', icon: '➕' },
              { id: 'resolve', label: 'Resolver', icon: '✅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido de las tabs */}
        <div className="p-6">
          {/* Tab 1: Mantener */}
          {activeTab === 'maintain' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">🔄 Mantener Falla Existente</h4>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-blue-800 mb-1">¿Qué significa mantener la falla?</h5>
                    <p className="text-sm text-blue-700">
                      Se incrementará el contador de recurrencia y se mantendrá el mismo Work Order.
                      Esto significa que el sistema continuará rastreando esta falla específica en la misma orden de trabajo.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-yellow-800 mb-1">⚠️ Importante:</h5>
                    <p className="text-sm text-yellow-700">
                      Es necesario que registres un comentario y una evidencia en el formulario del checklist
                      para documentar esta recurrencia correctamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Nueva Falla */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">¿Crear nueva falla?</h4>
              
              {/* ✅ NUEVO: Texto informativo mejorado */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-green-800 mb-1">
                      ¿Qué significa crear nueva falla?
                    </h5>
                    <p className="text-sm text-green-700">
                      Se creará una nueva orden de trabajo <strong>completamente independiente</strong>
                      {workOrders.length > 1 && (
                        <>, separada de las {workOrders.length} fallas activas ya existentes.</>
                      )}
                      <br />
                      Esta nueva OT tendrá su propio contador de recurrencias y será rastreada de forma independiente.
                    </p>
                  </div>
                </div>
              </div>

              {/* ✅ NUEVO: Advertencia para múltiples fallas */}
              {workOrders.length > 1 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h5 className="text-sm font-medium text-orange-800 mb-1">
                        ⚠️ Atención: Múltiples fallas detectadas
                      </h5>
                      <p className="text-sm text-orange-700">
                        Ya existen {workOrders.length} fallas activas para este ítem.
                        Verifica si realmente necesitas crear una nueva falla o si puedes
                        mantener/resolver alguna de las fallas existentes primero.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción de la nueva falla:
                </label>
                <textarea
                  value={formData.newFailureDescription}
                  onChange={(e) => handleInputChange('newFailureDescription', e.target.value)}
                  placeholder="Describa detalladamente la nueva falla, diferencias con fallas existentes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severidad:
                </label>
                <select
                  value={formData.newFailureSeverity}
                  onChange={(e) => handleInputChange('newFailureSeverity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="leve">Leve</option>
                  <option value="crítica">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidencia de la nueva falla: *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('newFailureEvidence', e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se requiere evidencia obligatoria para registrar nueva falla
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Resolver */}
          {activeTab === 'resolve' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">¿Resolver esta falla?</h4>
              <p className="text-gray-600">
                Se cerrará esta orden de trabajo con los detalles de la reparación realizada.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solución realizada: *
                </label>
                <textarea
                  value={formData.solutionText}
                  onChange={(e) => handleInputChange('solutionText', e.target.value)}
                  placeholder="Describa la solución implementada..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detalles técnicos:
                </label>
                <textarea
                  value={formData.resolutionDetails}
                  onChange={(e) => handleInputChange('resolutionDetails', e.target.value)}
                  placeholder="Detalles adicionales de la reparación..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Área responsable: *
                </label>
                <select
                  value={formData.responsibleArea}
                  onChange={(e) => handleInputChange('responsibleArea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccione un área</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Operación">Operación</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidencia de solución:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('evidenceSolution', e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleOptionSubmit}
            disabled={loading || !canSubmit()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 
             activeTab === 'maintain' ? 'Mantener Falla' :
             activeTab === 'new' ? 'Crear Nueva Falla' :
             'Resolver Falla'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
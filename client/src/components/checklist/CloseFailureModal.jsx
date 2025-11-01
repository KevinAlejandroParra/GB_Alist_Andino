"use client"
import React, { useState } from "react"
import axiosInstance from "../../utils/axiosConfig"

/**
 * Modal para cerrar órdenes de trabajo con formulario completo
 * @param {Object} props
 * @param {boolean} props.show - Estado del modal
 * @param {Function} props.onClose - Función para cerrar
 * @param {Object} props.workOrder - Datos de la orden de trabajo
 * @param {Object} props.user - Datos del usuario
 * @param {Function} props.onSuccess - Callback cuando se cierra exitosamente
 */
const CloseFailureModal = ({ show, onClose, workOrder, user, onSuccess }) => {
  const [solutionText, setSolutionText] = useState("")
  const [resolutionDetails, setResolutionDetails] = useState("")
  const [responsibleArea, setResponsibleArea] = useState("")
  const [evidenceSolution, setEvidenceSolution] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!show || !workOrder) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      
      const resolutionData = {
        solution_text: solutionText,
        resolution_details: resolutionDetails,
        responsible_area: responsibleArea,
        closing_response_id: workOrder.initial_response_id
      }

      // Si hay evidencia de solución
      if (evidenceSolution) {
        resolutionData.evidence_solution_url = evidenceSolution.name
      }

      const response = await axiosInstance.put(
        `${API_URL}/api/work-orders/${workOrder.id}/resolve`,
        resolutionData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      )

      if (response.data) {
        onSuccess && onSuccess(response.data)
        onClose()
      }
    } catch (error) {
      console.error('Error cerrando orden de trabajo:', error)
      alert(`Error al cerrar la orden: ${error.message}`)
    } finally {
      setLoading(false)
    }

    // Limpiar formulario
    setSolutionText("")
    setResolutionDetails("")
    setResponsibleArea("")
    setEvidenceSolution(null)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Cerrar Orden de Trabajo
        </h3>
        
        {workOrder && (
          <div className="mb-4 p-3 bg-gray-50 rounded border">
            <div className="text-sm">
              <span className="font-medium">OT:</span> {workOrder.work_order_id || workOrder.id}
            </div>
            {workOrder.description && (
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Descripción:</span> {workOrder.description}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="solutionText" className="block text-sm font-medium text-gray-700">
              Solución realizada: *
            </label>
            <textarea
              id="solutionText"
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              placeholder="Describa la solución implementada..."
              required
            ></textarea>
          </div>

          <div className="mb-4">
            <label htmlFor="resolutionDetails" className="block text-sm font-medium text-gray-700">
              Detalles técnicos:
            </label>
            <textarea
              id="resolutionDetails"
              rows="2"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={resolutionDetails}
              onChange={(e) => setResolutionDetails(e.target.value)}
              placeholder="Detalles adicionales de la reparación..."
            ></textarea>
          </div>

          <div className="mb-4">
            <label htmlFor="responsibleArea" className="block text-sm font-medium text-gray-700">
              Área responsable: *
            </label>
            <select
              id="responsibleArea"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={responsibleArea}
              onChange={(e) => setResponsibleArea(e.target.value)}
              required
            >
              <option value="">Seleccione un área</option>
              <option value="Técnico">Técnico</option>
              <option value="Operación">Operación</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="evidenceSolution" className="block text-sm font-medium text-gray-700">
              Evidencia de solución:
            </label>
            <input
              type="file"
              id="evidenceSolution"
              accept="image/*"
              onChange={(e) => setEvidenceSolution(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {evidenceSolution && (
              <p className="mt-1 text-xs text-gray-500">
                Archivo seleccionado: {evidenceSolution.name}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !solutionText || !responsibleArea}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cerrando...' : 'Cerrar Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CloseFailureModal

"use client"
import React, { useState } from "react"

// Modal para cerrar fallas con formulario completo
const CloseFailureModal = ({ show, onClose, onSubmit, failure }) => {
  const [solutionText, setSolutionText] = useState("")
  const [responsibleArea, setResponsibleArea] = useState("")

  if (!show) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(failure.failure_id, solutionText, responsibleArea)
    setSolutionText("")
    setResponsibleArea("")
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Cerrar Falla</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="solutionText" className="block text-sm font-medium text-gray-700">
              Solución:
            </label>
            <textarea
              id="solutionText"
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="responsibleArea" className="block text-sm font-medium text-gray-700">
              Área Responsable:
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
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cerrar Falla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CloseFailureModal

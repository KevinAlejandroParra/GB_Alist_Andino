'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import FailureDetailModal from './FailureDetailModal'

export default function OperationFailuresSection({ checklistId, user }) {
  const [loading, setLoading] = useState(false)
  const [operationChecklists, setOperationChecklists] = useState([])
  const [selectedChecklistId, setSelectedChecklistId] = useState('')
  const [selectedFailure, setSelectedFailure] = useState(null)
  const [showFailureDetail, setShowFailureDetail] = useState(false)

  useEffect(() => {
    if (!checklistId) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await axiosInstance.get(`/api/checklists/${checklistId}/operation-failures`)
        if (response.data?.success) {
          setOperationChecklists(response.data.data.operation_checklists || [])
        }
      } catch (error) {
        console.error('Error cargando checklists de operación:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [checklistId])

  const selectedChecklist = operationChecklists.find(c => c.checklist_id === Number(selectedChecklistId))

  const getSeverityColor = (severity) => {
    const s = (severity || '').toLowerCase()
    if (s === 'critica') return 'bg-red-100 text-red-800'
    if (s === 'moderada') return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getTraceabilityBadge = (traceability) => {
    if (!traceability) return null
    const colors = {
      'SIN_AR': 'bg-gray-100 text-gray-600',
      'AR_ABIERTO': 'bg-blue-100 text-blue-800',
      'OT_ABIERTO': 'bg-orange-100 text-orange-800',
      'EN_PRUEBAS': 'bg-purple-100 text-purple-800',
      'RESUELTA': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[traceability.code] || 'bg-gray-100 text-gray-600'}`}>
        {traceability.shortLabel || traceability.code}
      </span>
    )
  }

  const handleOpenFailure = (failure) => {
    setSelectedFailure(failure)
    setShowFailureDetail(true)
  }

  if (!checklistId || operationChecklists.length === 0) return null

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">Fallas de Operación</h3>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Seleccionar checklist de operación
          </label>
          <select
            value={selectedChecklistId}
            onChange={(e) => setSelectedChecklistId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">-- Seleccione un checklist --</option>
            {operationChecklists.map((cl) => (
              <option key={cl.checklist_id} value={cl.checklist_id}>
                {cl.checklist_type_name} - {new Date(cl.created_at).toLocaleDateString('es-CO')} ({cl.active_failures} activas)
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        )}

        {selectedChecklist && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">
                {selectedChecklist.total_failures} falla(s) encontradas ({selectedChecklist.active_failures} activas)
              </span>
            </div>

            {selectedChecklist.failures.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-4">No hay fallas registradas en este checklist</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 text-slate-600 font-medium text-xs">Item</th>
                      <th className="text-left py-2 px-2 text-slate-600 font-medium text-xs">Dispositivo</th>
                      <th className="text-left py-2 px-2 text-slate-600 font-medium text-xs">Falla</th>
                      <th className="text-left py-2 px-2 text-slate-600 font-medium text-xs">Severidad</th>
                      <th className="text-left py-2 px-2 text-slate-600 font-medium text-xs">Estado</th>
                      <th className="text-center py-2 px-2 text-slate-600 font-medium text-xs">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChecklist.failures.map((failure) => (
                      <tr key={failure.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2 text-xs font-medium text-slate-700">{failure.item_number}</td>
                        <td className="py-2 px-2 text-xs text-slate-600">{failure.affected_machine || 'No especificada'}</td>
                        <td className="py-2 px-2 text-xs text-slate-600 max-w-[200px] truncate">{failure.description}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(failure.severity)}`}>
                            {failure.severity || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-2">{getTraceabilityBadge(failure.traceability)}</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleOpenFailure(failure)}
                            className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <FailureDetailModal
        show={showFailureDetail}
        onClose={() => setShowFailureDetail(false)}
        failure={selectedFailure}
        onSuccess={() => {
          setShowFailureDetail(false)
          const fetchData = async () => {
            try {
              const response = await axiosInstance.get(`/api/checklists/${checklistId}/operation-failures`)
              if (response.data?.success) {
                setOperationChecklists(response.data.data.operation_checklists || [])
              }
            } catch (error) {
              console.error('Error recargando fallas:', error)
            }
          }
          fetchData()
        }}
      />
    </>
  )
}

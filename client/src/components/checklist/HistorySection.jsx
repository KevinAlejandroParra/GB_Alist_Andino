'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { formatLocalDate, formatLocalDateTime } from '../../utils/dateUtils'
import { useAuth } from '../AuthContext'

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

function getBorderColor(signatureCount) {
  if (signatureCount === 0) return 'border-red-500'
  if (signatureCount === 1) return 'border-yellow-400'
  return 'border-blue-500'
}

export default function HistorySection({ checklistTypeId }) {
  const { user } = useAuth()
  const [historicalChecklists, setHistoricalChecklists] = useState([])
  const [expandedHistoricalChecklists, setExpandedHistoricalChecklists] = useState({})
  const [downloading, setDownloading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState('')
  const [availableYears, setAvailableYears] = useState([])

  const fetchHistory = useCallback(async () => {
    if (!user || !user.token || !checklistTypeId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', currentPage)
      params.set('limit', '10')
      if (selectedYear) params.set('year', selectedYear)
      if (selectedMonth) params.set('month', selectedMonth)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/checklists/type/${checklistTypeId}/history?${params}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      )
      if (!response.ok) throw new Error('Error al cargar historial')
      const result = await response.json()

      if (result.isPremiosChecklist) {
        setHistoricalChecklists([])
        setTotalPages(1)
        setTotalItems(0)
      } else {
        setHistoricalChecklists(result.data || [])
        setTotalPages(result.totalPages || 1)
        setTotalItems(result.total || 0)
        if (result.dateRange) {
          const minYear = result.dateRange.minDate
            ? new Date(result.dateRange.minDate).getFullYear()
            : new Date().getFullYear()
          const maxYear = result.dateRange.maxDate
            ? new Date(result.dateRange.maxDate).getFullYear()
            : new Date().getFullYear()
          const years = []
          for (let y = maxYear; y >= minYear; y--) {
            years.push(y.toString())
          }
          setAvailableYears(years)
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error)
      setHistoricalChecklists([])
    } finally {
      setLoading(false)
    }
  }, [checklistTypeId, user, currentPage, selectedYear, selectedMonth])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleDownload = async (checklistId, checklistDate) => {
    if (!user || !user.token) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.')
      return
    }
    setDownloading(checklistId)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/checklists/${checklistId}/download`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al descargar el PDF')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Checklist_${formatLocalDate(checklistDate)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error en la descarga:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (checklistId, checklistDate) => {
    if (!user || !user.token) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.')
      return
    }
    if (!window.confirm(`¿Estás seguro de eliminar el checklist del ${formatLocalDate(checklistDate)}?\n\nEsta acción no se puede deshacer. Solo se pueden eliminar checklists sin firmas registradas.`)) {
      return
    }
    setDeleting(checklistId)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/checklists/${checklistId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Error al eliminar el checklist')
      }
      fetchHistory()
    } catch (error) {
      console.error('Error al eliminar:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Historial de Checklists</h2>

        {/* Color legend */}
        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <span className="font-medium text-gray-700">Estado de firmas:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded border-2 border-red-500 bg-red-50" />
            Sin firmas
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-50" />
            1 firma
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded border-2 border-blue-500 bg-blue-50" />
            2+ firmas
          </span>
        </div>

        {/* Delete info note */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Solo se pueden eliminar checklists que <strong>no tengan ninguna firma</strong>. Si ingresaste a un checklist equivocado por error, puedes eliminarlo siempre que esté sin firmar.</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1) }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            {availableYears.length > 0 ? (
              availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))
            ) : (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1) }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todos los meses</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500 self-center">
            {totalItems > 0 ? `${totalItems} resultado(s)` : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : historicalChecklists.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No hay historial de checklists disponibles.</p>
        ) : (
          <>
            <div className="space-y-4">
              {historicalChecklists.map((historyChecklist) => {
                const sigCount = historyChecklist.signatures?.length || 0
                const borderColor = getBorderColor(sigCount)
                return (
                  <div key={historyChecklist.checklist_id} className={`border-2 ${borderColor} rounded-lg`}>
                    <div className="p-4 flex justify-between items-center bg-gray-50 rounded-t-lg">
                      <div
                        className="flex-grow cursor-pointer"
                        onClick={() => setExpandedHistoricalChecklists((prev) => ({
                          ...prev,
                          [historyChecklist.checklist_id]: !prev[historyChecklist.checklist_id]
                        }))}
                      >
                        <h3 className="text-lg font-medium text-gray-800">
                          Checklist del {formatLocalDate(historyChecklist.createdAt)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Creado por: {historyChecklist.creator?.user_name || 'Desconocido'} el{' '}
                          {formatLocalDateTime(historyChecklist.createdAt)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Firmas: {sigCount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sigCount === 0 && (
                          <button
                            onClick={() => handleDelete(historyChecklist.checklist_id, historyChecklist.createdAt)}
                            disabled={deleting === historyChecklist.checklist_id}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-sm disabled:bg-gray-400 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {deleting === historyChecklist.checklist_id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                        {user && user.role_id == 1 && (
                          <button
                            onClick={() => handleDownload(historyChecklist.checklist_id, historyChecklist.createdAt)}
                            disabled={downloading === historyChecklist.checklist_id}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:bg-gray-400"
                          >
                            {downloading === historyChecklist.checklist_id ? 'Descargando...' : 'Descargar'}
                          </button>
                        )}
                        <div
                          className="text-xl text-gray-500 ml-2 cursor-pointer"
                          onClick={() => setExpandedHistoricalChecklists((prev) => ({
                            ...prev,
                            [historyChecklist.checklist_id]: !prev[historyChecklist.checklist_id]
                          }))}
                        >
                          {expandedHistoricalChecklists[historyChecklist.checklist_id] ? '▲' : '▼'}
                        </div>
                      </div>
                    </div>

                    {expandedHistoricalChecklists[historyChecklist.checklist_id] && (
                      <div className="p-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-2">Firmas:</h4>
                        {historyChecklist.signatures && historyChecklist.signatures.length > 0 ? (
                          <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
                            {historyChecklist.signatures.map((signature, index) => (
                              <li key={index}>
                                {signature.role?.role_name || 'Rol Desconocido'} - {signature.user?.user_name || 'Usuario Desconocido'} el{' '}
                                {formatLocalDateTime(signature.signed_at)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-600 mb-4">No hay firmas para este checklist.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true
                    if (p === 1 || p === totalPages) return true
                    if (Math.abs(p - currentPage) <= 1) return true
                    return false
                  })
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1.5 text-sm border rounded ${
                            currentPage === p
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    )
                  })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

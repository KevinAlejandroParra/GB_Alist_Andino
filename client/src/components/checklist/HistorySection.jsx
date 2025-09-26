'use client'
import React from 'react'
import { formatLocalDate, formatLocalDateTime } from '../../utils/dateUtils'
import { useAuth } from '../AuthContext' // Importar el hook de autenticación

export default function HistorySection({
  historicalChecklists,
  expandedHistoricalChecklists,
  toggleHistoricalChecklist,
}) {
  const { user } = useAuth() // Obtener el usuario del contexto
  const [downloading, setDownloading] = React.useState(null) // Estado para feedback de descarga

  const handleDownload = async (checklistId, checklistDate) => {
    if (!user || !user.token) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.')
      return
    }

    setDownloading(checklistId)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/checklists/${checklistId}/download-pdf`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
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

  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Historial de Checklists</h2>
        {historicalChecklists.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No hay historial de checklists disponibles.</p>
        ) : (
          <div className="space-y-4">
            {historicalChecklists.map((historyChecklist) => (
              <div key={historyChecklist.checklist_id} className="border border-gray-200 rounded-lg">
                <div className="p-4 flex justify-between items-center bg-gray-50 rounded-t-lg">
                  <div
                    className="flex-grow cursor-pointer"
                    onClick={() => toggleHistoricalChecklist(historyChecklist.checklist_id)}
                  >
                    <h3 className="text-lg font-medium text-gray-800">
                      Checklist del {formatLocalDate(historyChecklist.date)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Creado por: {historyChecklist.creator?.user_name || 'Desconocido'} el{' '}
                      {formatLocalDateTime(historyChecklist.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleDownload(historyChecklist.checklist_id, historyChecklist.date)}
                      disabled={downloading === historyChecklist.checklist_id}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:bg-gray-400"
                    >
                      {downloading === historyChecklist.checklist_id ? 'Descargando...' : 'Descargar'}
                    </button>
                    <div
                      className="text-xl text-gray-500 ml-4 cursor-pointer"
                      onClick={() => toggleHistoricalChecklist(historyChecklist.checklist_id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

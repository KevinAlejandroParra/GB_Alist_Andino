'use client'

import React, { useState } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import Swal from 'sweetalert2'

export default function PremiosExcelButton({ checklistTypeId, weekIdentifier }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = weekIdentifier ? { week_identifier: weekIdentifier } : {}
      const res = await axiosInstance.get(`/api/checklists/type/${checklistTypeId}/analytics/premios/export`, {
        params,
        responseType: 'blob',
      })

      const contentDisposition = res.headers['content-disposition'] || ''
      const match = contentDisposition.match(/filename="?([^";]+)"?/i)
      const filename = match ? match[1] : `Analisis_Premios_${new Date().toISOString().slice(0, 10)}.xlsx`

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo generar el archivo Excel. Intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
    >
      {exporting ? (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 12h3l-4 4-4-4h3V9h2v5zM13 3.5L18.5 9H13V3.5z" />
        </svg>
      )}
      {weekIdentifier ? 'Exportar Excel (semana)' : 'Exportar Excel'}
    </button>
  )
}

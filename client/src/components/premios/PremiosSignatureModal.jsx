'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import Swal from 'sweetalert2'

export default function PremiosSignatureModal({ checklistTypeId, weekIdentifier, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/api/checklists/type/${checklistTypeId}/analytics/premios/revision`, {
          params: { week_identifier: weekIdentifier },
        })
        setData(res.data.data)
      } catch (err) {
        Swal.fire({
          title: 'Error',
          text: err.response?.data?.error || 'No se pudo cargar la revisión',
          icon: 'error',
          confirmButtonText: 'Entendido',
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [checklistTypeId, weekIdentifier])

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Revisión de la semana {weekIdentifier}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          ) : !data ? (
            <p className="text-center text-gray-500 py-8">Esta semana aún no ha sido revisada.</p>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Revisada por</span>
                  <span className="font-semibold text-gray-800">{data.reviewer_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de revisión</span>
                  <span className="font-semibold text-gray-800">{data.revisado_en || '—'}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Firma del administrador</p>
                {data.revisado_firma ? (
                  <div className="border border-gray-300 rounded-lg p-3 bg-white">
                    <img
                      src={data.revisado_firma}
                      alt="Firma del administrador"
                      className="max-w-full h-auto"
                      style={{ background: 'transparent' }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sin imagen de firma registrada.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

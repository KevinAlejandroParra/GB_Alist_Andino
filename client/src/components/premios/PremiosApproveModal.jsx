'use client'

import React, { useState } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import Swal from 'sweetalert2'
import SignaturePad from '../checklist/SignaturePad'

export default function PremiosApproveModal({ checklistTypeId, weekIdentifier, onClose, onSuccess }) {
  const [showPad, setShowPad] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSign = async (firma) => {
    setShowPad(false)
    setSaving(true)
    try {
      await axiosInstance.post(`/api/checklists/type/${checklistTypeId}/analytics/premios/aprobar`, {
        week_identifier: weekIdentifier,
        firma,
      })
      await Swal.fire({
        title: '¡Semana aprobada!',
        text: `La semana ${weekIdentifier} fue revisada y firmada correctamente.`,
        icon: 'success',
        confirmButtonColor: '#059669',
        confirmButtonText: 'Aceptar',
      })
      if (onSuccess) onSuccess()
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'No se pudo aprobar la semana',
        icon: 'error',
        confirmButtonText: 'Entendido',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Aprobar semana {weekIdentifier}</h3>
            <p className="text-sm text-gray-500">
              El administrador firma la auditoría de esta semana de premios.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5">
          {saving ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Guardando revisión...</p>
            </div>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  Al aprobar, todas las máquinas de la semana {weekIdentifier} quedarán marcadas como revisadas y tu firma quedará registrada como evidencia de auditoría.
                </p>
              </div>
              <button
                onClick={() => setShowPad(true)}
                className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Firmar y aprobar semana
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
            Cerrar
          </button>
        </div>
      </div>

      {showPad && (
        <SignaturePad
          onSave={handleSign}
          onClose={() => setShowPad(false)}
        />
      )}
    </div>
  )
}

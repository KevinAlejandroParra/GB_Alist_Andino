'use client'

import { useState } from 'react'

export default function DiagnosisModal({ show, onClose, checklist }) {
  if (!show || !checklist) return null

  // Collect all responses that have premios data
  const diagnosisData = checklist.items?.flatMap(item =>
    item.subItems?.filter(sub =>
      sub.responses && sub.responses[0] &&
      (sub.question_text === 'JUGADAS' || sub.question_text === 'PREMIOS')
    ).map(sub => ({
      machine: item.question_text,
      question: sub.question_text,
      ...sub.responses[0]
    })) || []
  ) || []

  // Group by machine
  const machines = {}
  diagnosisData.forEach(data => {
    if (!machines[data.machine]) {
      machines[data.machine] = {}
    }
    machines[data.machine][data.question] = data
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/80 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200/50">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Diagnóstico de Máquinas de Premios</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Checklist: {checklist.type?.name} - {checklist.createdAt}</p>
        </div>

        <div className="p-6">
          {Object.keys(machines).length === 0 ? (
            <p className="text-gray-600 text-center">No hay datos de diagnóstico disponibles.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(machines).map(([machine, data]) => (
                <div key={machine} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{machine}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.JUGADAS && (
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-medium text-gray-700 mb-2">Jugadas</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Acumuladas:</span> {data.JUGADAS.jugadas_acumuladas || 'N/A'}</p>
                          <p><span className="font-medium">Desde última:</span> {data.JUGADAS.jugadas_desde_ultima || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                    {data.PREMIOS && (
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-medium text-gray-700 mb-2">Premios</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Acumulados:</span> {data.PREMIOS.premios_acumulados || 'N/A'}</p>
                          <p><span className="font-medium">Desde última:</span> {data.PREMIOS.premios_desde_ultima || 'N/A'}</p>
                          <p><span className="font-medium">Promedio por ciclo:</span> {data.PREMIOS.promedio_premios ? `${data.PREMIOS.promedio_premios}%` : 'N/A'}</p>
                          <p><span className="font-medium">Esperados:</span> {data.PREMIOS.premios_esperados || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {data.PREMIOS?.configuracion_maquina && (
                    <div className="mt-4 bg-white p-4 rounded border">
                      <h4 className="font-medium text-gray-700 mb-2">Configuración de la Máquina</h4>
                      <p className="text-sm text-gray-600">{data.PREMIOS.configuracion_maquina}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
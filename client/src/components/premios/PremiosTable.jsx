'use client'

import React, { useState } from 'react'
import { formatNum, formatPct, stateBadge, stateLabel } from './premiosUtils'

const DetailRow = ({ section, machineName }) => {
  return (
    <tr className="bg-gray-50 border-t border-gray-100">
      <td colSpan={11} className="px-4 py-0">
        <div className="py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500 font-medium mb-1">{section.section_key}</p>
              <p className="text-gray-400 text-[11px] mb-2">Máquina: {machineName}</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Jugadas (contador)</span><span className="font-semibold text-gray-800">{formatNum(section.jugadas_lectura)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Premios (contador)</span><span className="font-semibold text-gray-800">{formatNum(section.premios_lectura)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Jugadas desde última</span><span className="font-semibold text-gray-800">{formatNum(section.jugadas_desde_ultima)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Premios entregados</span><span className="font-semibold text-green-700">{formatNum(section.premios_desde_ultima)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Esperados (ratio {formatNum(section.ratio_usado)})</span><span className="font-semibold text-gray-800">{formatNum(section.premios_esperados)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Eficiencia</span><span className="font-semibold text-gray-800">{formatPct(section.eficiencia_pct)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 col-span-2">
              <p className="text-gray-500 font-medium mb-1">Configuración de la máquina</p>
              <p className="text-gray-700 text-[12px] whitespace-pre-wrap break-words">
                {section.config_section || 'Sin configuración registrada'}
              </p>
              {section.contador_reseteado && (
                <p className="mt-2 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  ⚠️ Contador reseteado en esta sección
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500 font-medium mb-1">Estado</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold border ${stateBadge(section.estado)}`}>
                {stateLabel(section.estado)}
              </span>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Diligenciado por</span><span className="font-semibold text-gray-800 truncate max-w-[120px]">{section.creator?.user_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Revisado por</span><span className="font-semibold text-gray-800 truncate max-w-[120px]">{section.reviewer?.user_name || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function PremiosTable({ rows, rollup, checklistTypeId, onViewSignature, onApprove, isAdmin }) {
  const [expanded, setExpanded] = useState(null)
  const toggle = (key) => setExpanded((prev) => (prev === key ? null : key))

  if (rollup.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">No hay registros que coincidan con los filtros.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Registro semanal por máquina</h3>
        <span className="text-xs text-gray-500">{rollup.length} fila{rollup.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semana</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jugadas</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Premios entregados</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Esperados</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eficiencia</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revisado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rollup.map((r) => {
              const key = `${r.week_identifier}|${r.inspectable_id}`
              const isOpen = expanded === key
              const reviewed = r.revisado || r.reviewer_name != null
              return (
                <React.Fragment key={key}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.week_identifier}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{r.fecha || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.machine_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatNum(r.jugadas_desde_ultima)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatNum(r.premios_desde_ultima)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatNum(r.premios_esperados)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatPct(r.eficiencia_pct)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold border ${stateBadge(r.estado)}`}>
                        {stateLabel(r.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reviewed ? (
                        <button
                          onClick={() => onViewSignature && onViewSignature(r.week_identifier)}
                          className="text-xs text-green-700 font-medium hover:underline"
                          title="Ver firma de revisión"
                        >
                          ✓ {r.reviewer_name || 'Revisado'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Sin revisar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggle(key)}
                          className="px-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50"
                        >
                          {isOpen ? 'Ocultar' : 'Detalle'}
                        </button>
                        {isAdmin && !reviewed && (
                          <button
                            onClick={() => onApprove && onApprove(r.week_identifier)}
                            className="px-2 py-1 text-xs font-medium text-green-700 border border-green-200 rounded-md hover:bg-green-50"
                          >
                            Aprobar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && <DetailRow section={r.sections[0] || {}} machineName={r.machine_name} />}
                  {isOpen && r.sections.slice(1).map((section) => (
                    <DetailRow key={`${section.checklist_id}|${section.section_key}`} section={section} machineName={r.machine_name} />
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

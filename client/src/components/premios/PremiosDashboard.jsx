'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import { useAuth } from '../AuthContext'
import PremiosCharts from './PremiosCharts'
import PremiosTable from './PremiosTable'
import PremiosConfigModal from './PremiosConfigModal'
import PremiosSignatureModal from './PremiosSignatureModal'
import PremiosExcelButton from './PremiosExcelButton'
import { formatNum, formatPct, enrichRollup } from './premiosUtils'

export default function PremiosDashboard({ checklistTypeId }) {
  const { user } = useAuth()
  const isAdmin = user?.role_id === 1 || user?.role_id === 2

  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedWeek, setSelectedWeek] = useState('all')
  const [selectedMachine, setSelectedMachine] = useState('all')

  const [showConfig, setShowConfig] = useState(false)
  const [signatureWeek, setSignatureWeek] = useState(null)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axiosInstance.get(`/api/checklists/type/${checklistTypeId}/analytics/premios`)
      setAnalytics(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el análisis de premios')
    } finally {
      setLoading(false)
    }
  }, [checklistTypeId])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const rollup = useMemo(() => (analytics ? enrichRollup(analytics.rollup || [], analytics.rows || []) : []), [analytics])
  const weeks = useMemo(() => (analytics?.weeks || []).map((w) => w.week_identifier), [analytics])

  // Asegurar que selectedWeek tenga valor por defecto (última con datos)
  useEffect(() => {
    if (weeks.length > 0 && selectedWeek === 'all') {
      setSelectedWeek(weeks[0])
    }
  }, [weeks, selectedWeek])

  const machines = useMemo(() => {
    const set = new Set(rollup.map((r) => r.machine_name).filter(Boolean))
    return Array.from(set).sort()
  }, [rollup])

  const filteredRollup = useMemo(() => {
    return rollup.filter((r) => {
      if (selectedWeek !== 'all' && r.week_identifier !== selectedWeek) return false
      if (selectedMachine !== 'all' && r.machine_name !== selectedMachine) return false
      return true
    })
  }, [rollup, selectedWeek, selectedMachine])

  const kpis = useMemo(() => {
    const jugadas = filteredRollup.reduce((acc, r) => acc + (Number(r.jugadas_desde_ultima) || 0), 0)
    const premios = filteredRollup.reduce((acc, r) => acc + (Number(r.premios_desde_ultima) || 0), 0)
    const esperados = filteredRollup.reduce((acc, r) => acc + (Number(r.premios_esperados) || 0), 0)
    const okMachines = filteredRollup.filter((r) => r.estado === 'ok').length
    const eficiencia = esperados > 0 ? (premios / esperados) * 100 : null
    return { jugadas, premios, esperados, eficiencia, okMachines, totalMachines: filteredRollup.length }
  }, [filteredRollup])

  const selectedWeekReviewed = useMemo(() => {
    if (selectedWeek === 'all') return null
    const rollupWeek = rollup.find((r) => r.week_identifier === selectedWeek)
    return rollupWeek ? rollupWeek.revisado : null
  }, [rollup, selectedWeek])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando análisis de premios...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={loadAnalytics} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          Reintentar
        </button>
      </div>
    )
  }

  const hasData = rollup.length > 0

  return (
    <div className="space-y-6">
      {/* Encabezado y acciones */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">Análisis de Premios</h2>
          {selectedWeek !== 'all' && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedWeekReviewed ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {selectedWeekReviewed ? 'Semana revisada' : 'Semana sin revisar'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PremiosExcelButton checklistTypeId={checklistTypeId} weekIdentifier={selectedWeek !== 'all' ? selectedWeek : undefined} />
          {isAdmin && (
            <button
              onClick={() => setShowConfig(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Configuración de máquinas
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semana</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas las semanas</option>
              {weeks.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas las máquinas</option>
              {machines.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedWeek('all')
                setSelectedMachine('all')
              }}
              className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aún no hay datos de análisis</h3>
          <p className="text-gray-500 max-w-lg mx-auto">
            Diligencia el checklist semanal de premios (JUGADAS, PREMIOS y CONFIGURACION DE LA MAQUINA) en
            cada máquina. El análisis por semana aparecerá aquí automáticamente.
          </p>
          {isAdmin && (
            <p className="text-sm text-gray-400 mt-3">
              Recuerda configurar el ratio maestro en "Configuración de máquinas" para calcular la eficiencia.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jugadas</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatNum(kpis.jugadas)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Premios entregados</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatNum(kpis.premios)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-indigo-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Premios esperados</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatNum(kpis.esperados)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Eficiencia global</p>
              <p className={`text-2xl font-bold mt-1 ${kpis.eficiencia != null ? 'text-gray-800' : 'text-gray-400'}`}>
                {formatPct(kpis.eficiencia)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Máquinas OK</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{kpis.okMachines} / {kpis.totalMachines}</p>
            </div>
          </div>

          {/* Gráficas */}
          <PremiosCharts
            rollup={rollup}
            rows={analytics.rows || []}
            selectedWeek={selectedWeek}
            selectedMachine={selectedMachine}
          />

          {/* Tabla */}
          <PremiosTable
            rows={analytics.rows || []}
            rollup={filteredRollup}
            checklistTypeId={checklistTypeId}
            onViewSignature={(week) => setSignatureWeek(week)}
            isAdmin={isAdmin}
          />
        </>
      )}

      {showConfig && (
        <PremiosConfigModal
          checklistTypeId={checklistTypeId}
          onClose={() => setShowConfig(false)}
        />
      )}
      {signatureWeek && (
        <PremiosSignatureModal
          checklistTypeId={checklistTypeId}
          weekIdentifier={signatureWeek}
          onClose={() => setSignatureWeek(null)}
        />
      )}
    </div>
  )
}

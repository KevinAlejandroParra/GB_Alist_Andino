'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { ESTADO_CHART_COLORS, stateLabel, CHART_PALETTE } from './premiosUtils'

const CHART_COLORS = CHART_PALETTE

const Card = ({ title, subtitle, children, height = 260 }) => (
  <div className="bg-white rounded-xl shadow-sm p-5">
    <h3 className="font-semibold text-gray-800">{title}</h3>
    {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </div>
)

const formatWeekLabel = (w) => {
  if (!w) return '—'
  const match = w.match(/(\d{4})-W(\d+)/)
  if (match) return `S${match[2]}`
  return w
}

export default function PremiosCharts({ rollup, rows, selectedWeek, selectedMachine }) {
  // Semana objetivo para las gráficas "de la semana"
  const targetWeek = useMemo(() => {
    if (selectedWeek !== 'all') return selectedWeek
    const weeks = [...new Set(rollup.map((r) => r.week_identifier))].sort()
    return weeks[weeks.length - 1] || null
  }, [rollup, selectedWeek])

  const filterByMachine = useMemo(() => {
    return (list) => {
      if (!list) return []
      if (selectedMachine === 'all') return list
      return list.filter((r) => r.machine_name === selectedMachine)
    }
  }, [selectedMachine])

  // ── 1. Eficiencia % por semana (líneas por máquina) ─────────────────────
  const eficienciaByWeek = useMemo(() => {
    const base = filterByMachine(rollup)
    const byWeek = {}
    for (const r of base) {
      if (!byWeek[r.week_identifier]) byWeek[r.week_identifier] = {}
      if (r.machine_name) {
        byWeek[r.week_identifier][r.machine_name] =
          r.eficiencia_pct != null ? Math.round(Number(r.eficiencia_pct) * 10) / 10 : null
      }
    }
    const machineNames = selectedMachine !== 'all' ? [selectedMachine] : [...new Set(base.map((r) => r.machine_name).filter(Boolean))]
    const data = Object.keys(byWeek)
      .sort()
      .map((week) => {
        const point = { week }
        for (const m of machineNames) point[m] = byWeek[week][m] ?? null
        return point
      })
    return { data, machineNames }
  }, [rollup, filterByMachine, selectedMachine])

  // ── 2. Jugadas y premios entregados por semana ───────────────────────────
  const jugadasPremiosByWeek = useMemo(() => {
    const base = filterByMachine(rollup)
    const byWeek = {}
    for (const r of base) {
      if (!byWeek[r.week_identifier]) byWeek[r.week_identifier] = { jugadas: 0, premios: 0 }
      byWeek[r.week_identifier].jugadas += Number(r.jugadas_desde_ultima) || 0
      byWeek[r.week_identifier].premios += Number(r.premios_desde_ultima) || 0
    }
    return Object.keys(byWeek)
      .sort()
      .map((week) => ({
        week: formatWeekLabel(week),
        jugadas: Math.round(byWeek[week].jugadas * 100) / 100,
        premios: Math.round(byWeek[week].premios * 100) / 100,
      }))
  }, [rollup, filterByMachine])

  // ── 3. Esperados vs entregados en la semana objetivo ─────────────────────
  const esperadosVsEntregados = useMemo(() => {
    if (!targetWeek) return []
    const base = filterByMachine(rollup).filter((r) => r.week_identifier === targetWeek)
    return base.map((r) => ({
      name: r.machine_name || r.inspectable_id,
      entregados: Math.round((Number(r.premios_desde_ultima) || 0) * 100) / 100,
      esperados: Math.round((Number(r.premios_esperados) || 0) * 100) / 100,
    }))
  }, [rollup, filterByMachine, targetWeek])

  // ── 4. Distribución de estados (secciones) ───────────────────────────────
  const estadoDistribution = useMemo(() => {
    if (!targetWeek) return []
    const base = rows.filter((r) => r.week_identifier === targetWeek)
    const filtered = selectedMachine === 'all' ? base : base.filter((r) => r.inspectable?.name === selectedMachine)
    const counts = {}
    for (const r of filtered) {
      const key = r.estado || 'sin_datos'
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.keys(counts).map((key) => ({ name: stateLabel(key), key, value: counts[key] }))
  }, [rows, targetWeek, selectedMachine])

  // ── 5. Ratio real vs configurado por semana ──────────────────────────────
  const ratioByWeek = useMemo(() => {
    const base = selectedMachine === 'all' ? rows : rows.filter((r) => r.inspectable?.name === selectedMachine)
    const byWeek = {}
    for (const r of base) {
      if (!byWeek[r.week_identifier]) byWeek[r.week_identifier] = { jugadas: 0, premios: 0, ratioUsado: null, hasConfig: false }
      byWeek[r.week_identifier].jugadas += Number(r.jugadas_desde_ultima) || 0
      byWeek[r.week_identifier].premios += Number(r.premios_desde_ultima) || 0
      if (r.ratio_usado != null) {
        byWeek[r.week_identifier].ratioUsado = r.ratio_usado
        byWeek[r.week_identifier].hasConfig = true
      }
    }
    return Object.keys(byWeek)
      .sort()
      .map((week) => {
        const b = byWeek[week]
        const real = b.premios > 0 ? Math.round((b.jugadas / b.premios) * 10) / 10 : null
        return {
          week: formatWeekLabel(week),
          'Ratio real': real,
          'Ratio config': b.hasConfig ? Number(b.ratioUsado) : null,
        }
      })
  }, [rows, selectedMachine])

  const tooltipStyle = { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }
  const axisStyle = { fontSize: 11 }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Eficiencia */}
      <Card title="Eficiencia por semana" subtitle="Premios entregados vs esperados (meta 100%)">
        {eficienciaByWeek.data.length === 0 ? (
          <Empty />
        ) : (
          <LineChart width="100%" height={250} data={eficienciaByWeek.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" tickFormatter={formatWeekLabel} tick={axisStyle} />
            <YAxis domain={[0, 200]} tick={axisStyle} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => (v == null ? '—' : `${v}%`)} labelFormatter={formatWeekLabel} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Meta', position: 'insideTopRight', fontSize: 10 }} />
            {eficienciaByWeek.machineNames.map((m, i) => (
              <Line key={m} type="monotone" dataKey={m} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} connectNulls dot={{ r: 3 }} />
            ))}
          </LineChart>
        )}
      </Card>

      {/* 2. Jugadas vs Premios */}
      <Card title="Jugadas y premios entregados por semana" subtitle="Suma de las lecturas 'desde última'">
        {jugadasPremiosByWeek.length === 0 ? (
          <Empty />
        ) : (
          <BarChart width="100%" height={250} data={jugadasPremiosByWeek} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="jugadas" name="Jugadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="premios" name="Premios" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </Card>

      {/* 3. Esperados vs entregados */}
      <Card title="Premios esperados vs entregados" subtitle={targetWeek ? `Semana ${targetWeek}` : ''}>
        {esperadosVsEntregados.length === 0 ? (
          <Empty />
        ) : (
          <BarChart width="100%" height={250} data={esperadosVsEntregados} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="esperados" name="Esperados" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="entregados" name="Entregados" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </Card>

      {/* 4. Donut de estados */}
      <Card title="Distribución de estados" subtitle={targetWeek ? `Semana ${targetWeek}` : ''}>
        {estadoDistribution.length === 0 ? (
          <Empty />
        ) : (
          <PieChart width="100%" height={250}>
            <Pie
              data={estadoDistribution}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {estadoDistribution.map((entry) => (
                <Cell key={entry.key} fill={ESTADO_CHART_COLORS[entry.key] || '#9ca3af'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        )}
      </Card>

      {/* 5. Ratio real vs configurado */}
      <Card
        title="Ratio de la máquina (1 premio cada N jugadas)"
        subtitle={selectedMachine !== 'all' ? `Máquina: ${selectedMachine}` : 'Promedio de todas las máquinas'}
      >
        {ratioByWeek.length === 0 ? (
          <Empty />
        ) : (
          <LineChart width="100%" height={250} data={ratioByWeek} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Ratio real" stroke="#3b82f6" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Ratio config" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" connectNulls dot={{ r: 3 }} />
          </LineChart>
        )}
      </Card>
    </div>
  )
}

const Empty = () => (
  <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
    Sin datos para mostrar
  </div>
)

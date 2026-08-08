'use client'

// Utilidades compartidas para el módulo de Análisis de Premios

export const ESTADOS = {
  ok:               { label: 'OK',               badge: 'bg-green-100 text-green-800 border-green-200' },
  baja_entrega:     { label: 'Baja entrega',     badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  sobre_entrega:    { label: 'Sobre entrega',    badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  sin_movimiento:   { label: 'Sin movimiento',   badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  contador_reseteado: { label: 'Contador reseteado', badge: 'bg-red-100 text-red-800 border-red-200' },
  sin_config:       { label: 'Sin config',       badge: 'bg-red-100 text-red-700 border-red-200' },
  primer_registro:  { label: 'Primer registro',  badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  sin_datos:        { label: 'Sin datos',        badge: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export const ESTADO_CHART_COLORS = {
  ok:                '#22c55e',
  baja_entrega:      '#f59e0b',
  sobre_entrega:     '#f59e0b',
  sin_movimiento:    '#9ca3af',
  contador_reseteado: '#ef4444',
  sin_config:        '#ef4444',
  primer_registro:   '#3b82f6',
  sin_datos:         '#d1d5db',
}

export const formatNum = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

export const formatPct = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(1)}%`
}

export const stateLabel = (estado) => (ESTADOS[estado] ? ESTADOS[estado].label : estado || '—')

export const stateBadge = (estado) => (ESTADOS[estado] ? ESTADOS[estado].badge : 'bg-gray-100 text-gray-700 border-gray-200')

// Deriva un estado "resumen" para una máquina/semana a partir de sus secciones
export const deriveRollupEstado = (sections) => {
  if (!sections || sections.length === 0) return 'sin_datos'
  if (sections.some((s) => s.estado === 'contador_reseteado')) return 'contador_reseteado'
  if (sections.every((s) => s.estado === 'primer_registro')) return 'primer_registro'
  if (sections.some((s) => s.estado === 'sobre_entrega')) return 'sobre_entrega'
  if (sections.some((s) => s.estado === 'baja_entrega')) return 'baja_entrega'
  if (sections.every((s) => s.estado === 'sin_config' || s.estado === 'sin_datos')) return 'sin_config'
  return 'ok'
}

export const groupRowsByMachineWeek = (rows) => {
  const groups = {}
  for (const r of rows) {
    const key = `${r.week_identifier}|${r.inspectable_id}`
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }
  return groups
}

// Agrega estado derivado y revisado_por a las filas del rollup usando las secciones
export const enrichRollup = (rollup, rows) => {
  const groups = groupRowsByMachineWeek(rows)
  return rollup.map((r) => {
    const key = `${r.week_identifier}|${r.inspectable_id}`
    const sections = groups[key] || []
    const reviewed = sections.find((s) => s.revisado_por != null)
    return {
      ...r,
      sections,
      estado: deriveRollupEstado(sections),
      reviewer_name: reviewed?.reviewer?.user_name ?? null,
      revisado_en: reviewed?.revisado_en ?? null,
      creado_por: sections[0]?.creator?.user_name ?? null,
    }
  })
}

export const CHART_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316']

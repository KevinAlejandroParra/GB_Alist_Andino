'use client'

import React, { useState, useMemo } from 'react'
import { formatLocalDate } from '../../utils/dateUtils'

export default function PremiosHistoryTable({ tableData }) {
  const [selectedMachine, setSelectedMachine] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [groupByDate, setGroupByDate] = useState(true)
  const [sortBy, setSortBy] = useState('fecha')
  const [sortOrder, setSortOrder] = useState('desc')

  if (!tableData || tableData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Historial de Premios</h3>
        <p className="text-gray-600 text-center py-4">No hay datos de historial disponibles.</p>
      </div>
    )
  }

  // Obtener lista única de máquinas
  const machines = useMemo(() => {
    const uniqueMachines = [...new Set(tableData.map(row => row.maquina))].sort()
    return uniqueMachines
  }, [tableData])

  // Obtener meses disponibles
  const availableMonths = useMemo(() => {
    const months = new Set()
    tableData.forEach(row => {
      const date = new Date(row.fecha)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.add(monthKey)
    })
    return Array.from(months).sort().reverse()
  }, [tableData])

  // Filtrar y ordenar datos
  const filteredAndSortedData = useMemo(() => {
    let filtered = tableData

    // Filtrar por máquina
    if (selectedMachine !== 'all') {
      filtered = filtered.filter(row => row.maquina === selectedMachine)
    }

    // Filtrar por mes
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(row => {
        const date = new Date(row.fecha)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonth
      })
    }

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Convertir fecha a timestamp para ordenar
      if (sortBy === 'fecha') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      // Convertir promedio_premios a número para ordenar
      if (sortBy === 'promedio_premios') {
        aValue = aValue || 0
        bValue = bValue || 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return sorted
  }, [tableData, selectedMachine, selectedMonth, sortBy, sortOrder])

  // Agrupar por fecha si está activado
  const groupedData = useMemo(() => {
    if (!groupByDate) return { all: filteredAndSortedData }

    return filteredAndSortedData.reduce((groups, row) => {
      const dateKey = formatLocalDate(row.fecha)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(row)
      return groups
    }, {})
  }, [filteredAndSortedData, groupByDate])

  // Calcular estadísticas por máquina y mes
  const machineStats = useMemo(() => {
    const stats = {}

    machines.forEach(machine => {
      // Obtener todos los datos de esta máquina
      const machineData = tableData.filter(row => row.maquina === machine)

      // Filtrar por mes si está seleccionado
      let filteredData = machineData
      if (selectedMonth !== 'all') {
        filteredData = machineData.filter(row => {
          const date = new Date(row.fecha)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return monthKey === selectedMonth
        })
      }

      // Extraer porcentajes válidos
      const validPercentages = filteredData
        .map(row => row.promedio_premios)
        .filter(p => p !== null && p !== undefined && typeof p === 'number' && !isNaN(p))

      // Calcular eficiencia actual (promedio de los datos filtrados)
      const eficienciaActual = validPercentages.length > 0
        ? (validPercentages.reduce((sum, p) => sum + p, 0) / validPercentages.length).toFixed(2)
        : '0.00'

      // Calcular promedios mensuales históricos
      const monthlyData = {}
      machineData.forEach(row => {
        const date = new Date(row.fecha)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = []
        }

        if (row.promedio_premios && typeof row.promedio_premios === 'number' && !isNaN(row.promedio_premios)) {
          monthlyData[monthKey].push(row.promedio_premios)
        }
      })

      // Calcular promedio del mes seleccionado o general
      let promedioMensual = '0.00'
      if (selectedMonth !== 'all' && monthlyData[selectedMonth]) {
        const monthPercentages = monthlyData[selectedMonth]
        if (monthPercentages.length > 0) {
          promedioMensual = (monthPercentages.reduce((sum, p) => sum + p, 0) / monthPercentages.length).toFixed(2)
        }
      } else if (selectedMonth === 'all' && Object.keys(monthlyData).length > 0) {
        // Calcular promedio general de todos los meses
        const allPercentages = Object.values(monthlyData).flat()
        if (allPercentages.length > 0) {
          promedioMensual = (allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length).toFixed(2)
        }
      }

      stats[machine] = {
        totalRegistros: filteredData.length,
        promedioEficiencia: eficienciaActual,
        promedioMensual: promedioMensual,
        ultimoRegistro: filteredData.length > 0 ? formatLocalDate(filteredData[0].fecha) : 'Sin datos',
        monthlyData
      }
    })
    return stats
  }, [tableData, machines, selectedMachine, selectedMonth])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Historial de Premios por Máquina
        </h3>

        {/* Filtros y controles */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Máquina:</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todas las máquinas</option>
              {machines.map(machine => (
                <option key={machine} value={machine}>{machine}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Mes:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos los meses</option>
              {availableMonths.map(monthKey => {
                const [year, month] = monthKey.split('-')
                const date = new Date(year, month - 1)
                const monthName = date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
                return (
                  <option key={monthKey} value={monthKey}>{monthName}</option>
                )
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Vista:</label>
            <select
              value={groupByDate ? 'date' : 'list'}
              onChange={(e) => setGroupByDate(e.target.value === 'date')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Agrupado por fecha</option>
              <option value="list">Lista simple</option>
            </select>
          </div>

          {(selectedMachine !== 'all' || selectedMonth !== 'all') && (
            <button
              onClick={() => {
                setSelectedMachine('all')
                setSelectedMonth('all')
              }}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Información de filtros activos */}
        {(selectedMachine !== 'all' || selectedMonth !== 'all') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-800 font-medium">Filtros activos:</span>
              {selectedMachine !== 'all' && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  Máquina: {selectedMachine}
                </span>
              )}
              {selectedMonth !== 'all' && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  Mes: {new Date(selectedMonth + '-01').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Estadísticas rápidas */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-semibold text-gray-800 text-sm">Estadísticas por Máquina</h4>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {selectedMonth !== 'all'
                ? `Mes: ${new Date(selectedMonth + '-01').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}`
                : 'Todos los meses'
              }
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {machines.map(machine => (
              <div key={machine} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-sm mb-2">{machine}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Registros:</span>
                    <span className="text-xs font-medium text-gray-800">{machineStats[machine].totalRegistros}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Eficiencia actual:</span>
                    <span className="text-xs font-medium text-green-600">{machineStats[machine].promedioEficiencia}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">
                      {selectedMonth !== 'all' ? 'Promedio del mes:' : 'Promedio histórico:'}
                    </span>
                    <span className="text-xs font-medium text-blue-600">
                      {machineStats[machine].promedioMensual}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Último registro:</span>
                    <span className="text-xs font-medium text-gray-800">{machineStats[machine].ultimoRegistro}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total registros:</span>
                    <span className="text-xs font-medium text-purple-600">{machineStats[machine].totalRegistros}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 italic">
                    {selectedMonth !== 'all'
                      ? `💡 Promedio calculado con ${machineStats[machine].totalRegistros} registros del mes seleccionado`
                      : `💡 Promedio histórico calculado con todos los registros disponibles`
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {groupByDate ? (
          // Vista agrupada por fecha
          Object.entries(groupedData).map(([date, rows]) => (
            <div key={date} className="mb-6">
              <div className="bg-purple-100 px-4 py-2 border-l-4 border-purple-500">
                <h4 className="font-semibold text-purple-800">{date}</h4>
                <p className="text-sm text-purple-600">{rows.length} máquina{rows.length !== 1 ? 's' : ''}</p>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('jugadas_acumuladas')}>
                      Jugadas Acumuladas {sortBy === 'jugadas_acumuladas' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('premios_acumulados')}>
                      Premios Acumuladas {sortBy === 'premios_acumulados' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configuración</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('jugadas_desde_ultima')}>
                      Jugadas Desde Última {sortBy === 'jugadas_desde_ultima' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('premios_entregados')}>
                      Premios Entregados {sortBy === 'premios_entregados' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('premios_esperados')}>
                      Premios Esperados {sortBy === 'premios_esperados' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('promedio_premios')}>
                      Eficiencia (%) {sortBy === 'promedio_premios' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diligenciado por</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.maquina}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.jugadas_acumuladas?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.premios_acumulados?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={row.configuracion_maquina}>
                        {row.configuracion_maquina || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.jugadas_desde_ultima?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.premios_entregados?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.premios_esperados?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {row.promedio_premios && typeof row.promedio_premios === 'number' ? `${row.promedio_premios.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.diligenciado_por || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          // Vista de lista simple
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('fecha')}>
                  Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('jugadas_acumuladas')}>
                  Jugadas Acumuladas {sortBy === 'jugadas_acumuladas' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('premios_acumulados')}>
                  Premios Acumuladas {sortBy === 'premios_acumulados' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configuración</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('jugadas_desde_ultima')}>
                  Jugadas Desde Última {sortBy === 'jugadas_desde_ultima' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('premios_entregados')}>
                  Premios Entregados {sortBy === 'premios_entregados' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('premios_esperados')}>
                  Premios Esperados {sortBy === 'premios_esperados' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('promedio_premios')}>
                  Eficiencia (%) {sortBy === 'promedio_premios' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diligenciado por</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatLocalDate(row.fecha)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.maquina}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.jugadas_acumuladas?.toLocaleString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.premios_acumulados?.toLocaleString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={row.configuracion_maquina}>
                    {row.configuracion_maquina || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.jugadas_desde_ultima?.toLocaleString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.premios_entregados?.toLocaleString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.premios_esperados?.toLocaleString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.promedio_premios && typeof row.promedio_premios === 'number' ? `${row.promedio_premios.toFixed(2)}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.diligenciado_por || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay datos que coincidan con los filtros seleccionados.
        </div>
      )}
    </div>
  )
}
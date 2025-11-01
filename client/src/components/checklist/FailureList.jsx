
'use client'

import React, { useState } from 'react';
import { format } from 'date-fns';

const FailureList = ({ failures }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filteredFailures = failures.filter(failure => {
    const statusMatch = statusFilter === 'all' || failure.status === statusFilter;
    const severityMatch = severityFilter === 'all' || failure.severity === severityFilter;
    return statusMatch && severityMatch;
  });

  if (!failures || failures.length === 0) {
    return <p className="text-gray-500 text-center py-4">No hay fallas registradas para este tipo de checklist.</p>;
  }

  const getStatusChip = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>;
      case 'EN_PROCESO':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">En Proceso</span>;
      case 'RESUELTO':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Resuelto</span>;
      case 'CERRADO':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Cerrado</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getSeverityChip = (severity) => {
    switch (severity) {
      case 'crítica':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Crítica</span>;
      case 'leve':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Leve</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{severity || 'N/A'}</span>;
    }
  };

  const getRecurrenceChip = (recurrenceCount) => {
    const count = recurrenceCount || 1;
    if (count === 1) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Primera vez</span>;
    } else if (count === 2) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Recurrente</span>;
    } else {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Múltiple ({count})</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Filtrar por Estado</label>
          <select
            id="status-filter"
            className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </div>
        <div>
          <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700">Filtrar por Severidad</label>
          <select
            id="severity-filter"
            className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="crítica">Crítica</option>
            <option value="leve">Leve</option>
          </select>
        </div>
      </div>

      {/* Tabla de Fallas */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Order ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidad</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurrencia</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reportado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFailures.map((failure, index) => (
              <tr key={failure.id || failure.work_order_id || `failure-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 break-words max-w-xs">
                  {failure.work_order_id || `WO-${failure.id}`}
                </td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 break-words max-w-xs">
                  <div className="max-w-xs">
                    {failure.description ? failure.description.substring(0, 100) + (failure.description.length > 100 ? '...' : '') : 'Sin descripción'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusChip(failure.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getSeverityChip(failure.severity)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getRecurrenceChip(failure.recurrence_count)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(failure.reported_at)}</td>
              </tr>
            ))}
            {filteredFailures.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No hay fallas que coincidan con los filtros seleccionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FailureList;

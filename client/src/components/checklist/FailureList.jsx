
'use client'

import React, { useState } from 'react';
import { format } from 'date-fns';

const FailureList = ({ failures, onUpdateFailure }) => {
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
      case 'pendiente':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>;
      case 'resuelto':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Resuelto</span>;
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
        return null;
    }
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
            <option value="pendiente">Pendiente</option>
            <option value="resuelto">Resuelto</option>
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Afectado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidad</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reportado</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFailures.length > 0 ? filteredFailures.map((failure) => (
              <tr key={failure.failure_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 break-words max-w-xs">
                  {`${failure.response?.checklistItem?.item_number || ''} - ${failure.response?.checklistItem?.question_text || 'N/A'}`}
                </td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 break-words max-w-xs">{failure.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusChip(failure.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getSeverityChip(failure.severity)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(failure.reported_at), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onUpdateFailure(failure)}
                    className="text-purple-600 hover:text-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                    disabled={failure.status === 'resuelto'}
                  >
                    {failure.status === 'resuelto' ? 'Ver' : 'Actualizar'}
                  </button>
                </td>
              </tr>
            )) : (
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

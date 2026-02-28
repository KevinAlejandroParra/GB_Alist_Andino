'use client'

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import failuresApi, { FAILURE_STATES, getFailureTypeLabel, getStatusChipClass } from '../../utils/failuresApi';

const FailureList = ({ failures: propFailures, checklistId, refreshTrigger }) => {
  const [failures, setFailures] = useState(propFailures || []);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isUsingNewSystem, setIsUsingNewSystem] = useState(false);

  // Cargar fallas al montar el componente
  useEffect(() => {
    if (checklistId) {
      loadFailures();
    } else {
      setFailures(propFailures || []);
      setIsUsingNewSystem(false);
    }
  }, [checklistId, refreshTrigger]);

  const loadFailures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = { checklistId };
      const response = await failuresApi.getAllFailures(filters);
      setFailures(response.data || response);
      setIsUsingNewSystem(true);
    } catch (err) {
      console.warn('No se pudo cargar desde nueva API, usando datos de props:', err);
      setFailures(propFailures || []);
      setIsUsingNewSystem(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredFailures = failures.filter(failure => {
    const statusMatch = statusFilter === 'all' || failure.status === statusFilter;
    const severityMatch = severityFilter === 'all' || failure.severity === severityFilter;
    const categoriaMatch = categoriaFilter === 'all' || failure.categoria === categoriaFilter;
    const typeMatch = typeFilter === 'all' ||
      (typeFilter === 'OF' && !failure.workOrder) ||
      (typeFilter === 'OT' && failure.workOrder);
    return statusMatch && severityMatch && categoriaMatch && typeMatch;
  });

  if (!failures || failures.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No hay fallas registradas para este tipo de checklist.</p>
        {loading && <p className="text-blue-500 text-sm mt-2">Cargando fallas...</p>}
        {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}
      </div>
    );
  }

  const getStatusChip = (status) => {
    // Soporte para sistema anterior y nuevo
    const statusMap = {
      // Sistema anterior
      'PENDIENTE': FAILURE_STATES.REPORTADO,
      'EN_PROCESO': FAILURE_STATES.EN_PROCESO,
      'RESUELTO': FAILURE_STATES.RESUELTO,
      'CERRADO': FAILURE_STATES.CERRADO,
      // Sistema nuevo
      'REPORTADO': FAILURE_STATES.REPORTADO,
      'EN_PROCESO': FAILURE_STATES.EN_PROCESO,
      'REQUIERE_REPUESTO': FAILURE_STATES.REQUIERE_REPUESTO,
      'REPUESTO_EN_PROCESO': FAILURE_STATES.REPUESTO_EN_PROCESO,
      'REPUESTO_ENTREGADO': FAILURE_STATES.REPUESTO_ENTREGADO,
      'RESUELTO': FAILURE_STATES.RESUELTO,
      'CERRADO': FAILURE_STATES.CERRADO,
    };

    const mappedStatus = statusMap[status] || status;
    const chipClass = getStatusChipClass(mappedStatus);
    
    const statusLabels = {
      [FAILURE_STATES.REPORTADO]: 'Reportado',
      [FAILURE_STATES.EN_PROCESO]: 'En Proceso',
      [FAILURE_STATES.REQUIERE_REPUESTO]: 'Requiere Repuesto',
      [FAILURE_STATES.REPUESTO_EN_PROCESO]: 'Repuesto en Proceso',
      [FAILURE_STATES.REPUESTO_ENTREGADO]: 'Repuesto Entregado',
      [FAILURE_STATES.RESUELTO]: 'Resuelto',
      [FAILURE_STATES.CERRADO]: 'Cerrado',
    };

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${chipClass}`}>
        {statusLabels[mappedStatus] || mappedStatus}
      </span>
    );
  };

  const getFailureTypeChip = (failure) => {
    const typeInfo = getFailureTypeLabel(failure);
    
    if (failure.workOrder) {
      // Es una OT, verificar estado de repuestos
      const hasRequisition = failure.workOrder.Requisition || failure.workOrder.requisition;
      
      return (
        <div className="flex flex-col gap-1">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeInfo.class}`}>
            OT-{failure.workOrder.id || 'N/A'}
          </span>
          {hasRequisition && (
            <span className="px-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
              Con Repuesto
            </span>
          )}
        </div>
      );
    }
    
    // Es una OF simple
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeInfo.class}`}>
        OF-{failure.id}
      </span>
    );
  };

  const getSeverityChip = (severity) => {
    const severityMap = {
      'CRITICA': { label: 'Crítica', class: 'bg-red-100 text-red-800' },
      'MODERADA': { label: 'Moderada', class: 'bg-yellow-100 text-yellow-800' },
      'LEVE': { label: 'Leve', class: 'bg-green-100 text-green-800' },
      // Valores del sistema anterior
      'crítica': { label: 'Crítica', class: 'bg-red-100 text-red-800' },
      'media': { label: 'Media', class: 'bg-yellow-100 text-yellow-800' },
      'leve': { label: 'Leve', class: 'bg-green-100 text-green-800' },
      'critical': { label: 'Crítica', class: 'bg-red-100 text-red-800' },
    };
    
    const severityInfo = severityMap[severity] || { label: severity || 'N/A', class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${severityInfo.class}`}>
        {severityInfo.label}
      </span>
    );
  };

  const getCategoriaChip = (categoria) => {
    const categoriaMap = {
      'TECNICA': { label: 'Técnica', class: 'bg-blue-100 text-blue-800' },
      'OPERATIVA': { label: 'Operativa', class: 'bg-green-100 text-green-800' },
      'LOCATIVA': { label: 'Locativa', class: 'bg-orange-100 text-orange-800' },
    };
    
    const categoriaInfo = categoriaMap[categoria] || { label: categoria || 'N/A', class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoriaInfo.class}`}>
        {categoriaInfo.label}
      </span>
    );
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
      {error && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Usando datos del sistema anterior</h3>
              <p className="mt-2 text-sm text-yellow-700">
                No se pudo conectar con el nuevo sistema de OF/OT. Mostrando datos de la versión anterior.
              </p>
            </div>
          </div>
        </div>
      )}

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
            <option value={FAILURE_STATES.REPORTADO}>Reportado</option>
            <option value={FAILURE_STATES.EN_PROCESO}>En Proceso</option>
            <option value={FAILURE_STATES.REQUIERE_REPUESTO}>Requiere Repuesto</option>
            <option value={FAILURE_STATES.REPUESTO_EN_PROCESO}>Repuesto en Proceso</option>
            <option value={FAILURE_STATES.REPUESTO_ENTREGADO}>Repuesto Entregado</option>
            <option value={FAILURE_STATES.RESUELTO}>Resuelto</option>
            <option value={FAILURE_STATES.CERRADO}>Cerrado</option>
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
            <option value="media">Media</option>
            <option value="leve">Leve</option>
          </select>
        </div>
        <div>
          <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">Filtrar por Tipo</label>
          <select
            id="type-filter"
            className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="OF">OF (Sin Repuesto)</option>
            <option value="OT">OT (Con Repuesto)</option>
          </select>
        </div>
        <div>
          <label htmlFor="categoria-filter" className="block text-sm font-medium text-gray-700">Filtrar por Categoría</label>
          <select
            id="categoria-filter"
            className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="TECNICA">Técnica</option>
            <option value="OPERATIVA">Operativa</option>
            <option value="LOCATIVA">Locativa</option>
          </select>
        </div>
      </div>

      {/* Tabla de Fallas */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isUsingNewSystem ? 'Tipo/ID' : 'Work Order ID'}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidad</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurrencia</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reportado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando fallas...
                  </div>
                </td>
              </tr>
            ) : (
              filteredFailures.map((failure, index) => (
                <tr key={failure.id || failure.work_order_id || `failure-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 break-words max-w-xs">
                    {isUsingNewSystem ? getFailureTypeChip(failure) : (failure.work_order_id || `WO-${failure.id}`)}
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 break-words max-w-xs">
                    <div className="max-w-xs">
                      {failure.description ? failure.description.substring(0, 100) + (failure.description.length > 100 ? '...' : '') : 'Sin descripción'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusChip(failure.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{getSeverityChip(failure.severity)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{getCategoriaChip(failure.categoria)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{getRecurrenceChip(failure.recurrence_count)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(failure.reported_at)}</td>
                </tr>
              ))
            )}
            {filteredFailures.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">No hay fallas que coincidan con los filtros seleccionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FailureList;

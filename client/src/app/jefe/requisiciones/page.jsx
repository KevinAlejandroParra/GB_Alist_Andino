'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import useFailureRequisitionSystem from '../../../components/checklist/hooks/useFailureRequisitionSystem';
import ApproveRequisitionModal from '../../../components/checklist/ApproveRequisitionModal';
import Swal from 'sweetalert2';

const JefeRequisitionsPage = () => {
  const { user } = useAuth();
  const failureSystem = useFailureRequisitionSystem();
  
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [filter, setFilter] = useState('SOLICITADO');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Cargar requisiciones al montar
  useEffect(() => {
    loadRequisitions();
  }, [refreshTrigger]);

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const result = await failureSystem.getPendingRequisitions();
      if (result.success) {
        setRequisitions(result.data.requisitions || []);
      }
    } catch (error) {
      console.error('Error cargando requisiciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (requisition) => {
    setSelectedRequisition(requisition);
    setShowApproveModal(true);
  };

  const handleApproveSuccess = (data) => {
    setRefreshTrigger(prev => prev + 1);
    setShowApproveModal(false);
    setSelectedRequisition(null);
  };

  const getStatusChip = (status) => {
    const statusMap = {
      'SOLICITADO': { label: 'Solicitado', color: 'bg-blue-100 text-blue-800' },
      'PENDIENTE': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      'RECIBIDO': { label: 'Recibido', color: 'bg-green-100 text-green-800' },
      'CANCELADO': { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getUrgencyChip = (urgency) => {
    const urgencyMap = {
      'NORMAL': { label: 'Normal', color: 'bg-gray-100 text-gray-800' },
      'URGENTE': { label: 'Urgente', color: 'bg-orange-100 text-orange-800' },
      'EMERGENCY': { label: 'Emergencia', color: 'bg-red-100 text-red-800' }
    };
    
    const urgencyInfo = urgencyMap[urgency] || { label: urgency, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyInfo.color}`}>
        {urgencyInfo.label}
      </span>
    );
  };

  const getSeverityChip = (severity) => {
    const severityMap = {
      'LEVE': { label: 'Leve', color: 'bg-green-100 text-green-800' },
      'MODERADA': { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800' },
      'CRITICA': { label: 'Crítica', color: 'bg-red-100 text-red-800' }
    };
    
    const severityInfo = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityInfo.color}`}>
        {severityInfo.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequisitions = requisitions.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Cargando requisiciones...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📋 Gestión de Requisiciones</h1>
                <p className="text-gray-600 mt-1">
                  Supervisión y aprobación de solicitudes de repuestos
                </p>
              </div>
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="SOLICITADO">Solicitados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="RECIBIDO">Recibidos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Solicitados</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {requisitions.filter(r => r.status === 'SOLICITADO').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {requisitions.filter(r => r.status === 'PENDIENTE').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Procesados</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {requisitions.filter(r => r.status === 'RECIBIDO').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-semibold text-gray-900">{requisitions.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Requisiciones */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Requisiciones de Repuestos</h2>
            </div>
            
            {filteredRequisitions.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay requisiciones</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'all' ? 'No hay requisiciones registradas.' : `No hay requisiciones con estado "${filter}".`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID/Repuesto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Falla Asociada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Urgencia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solicitante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequisitions.map((requisition) => (
                      <tr key={requisition.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              #{requisition.id}
                            </div>
                            <div className="text-sm text-gray-600">
                              {requisition.part_reference}
                            </div>
                            <div className="text-xs text-gray-500">
                              Cantidad: {requisition.quantity_requested}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {requisition.workOrder ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                OT-{requisition.workOrder.id}
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  {requisition.workOrder.description?.substring(0, 50)}...
                                </div>
                                <div className="text-xs text-gray-500">
                                  Estado: {requisition.workOrder.status}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              Sin orden de trabajo
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusChip(requisition.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-500 text-xs">N/A</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {requisition.requester && (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {requisition.requester.user_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {requisition.requester.user_id}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(requisition.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {requisition.status === 'SOLICITADO' ? (
                            <button
                              onClick={() => handleApprove(requisition)}
                              className="text-blue-600 hover:text-blue-900 px-3 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              ✅ Aprobar
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Aprobación */}
      <ApproveRequisitionModal
        show={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedRequisition(null);
        }}
        requisition={selectedRequisition}
        onSuccess={handleApproveSuccess}
      />
    </ProtectedRoute>
  );
};

export default JefeRequisitionsPage;
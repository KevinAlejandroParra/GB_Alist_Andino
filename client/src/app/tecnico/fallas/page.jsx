'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import useFailureRequisitionSystem from '../../../components/checklist/hooks/useFailureRequisitionSystem';
import ResolveFailureWithPartModal from '../../../components/checklist/ResolveFailureWithPartModal';
import CreateFailureWithRequisitionModal from '../../../components/checklist/CreateFailureWithRequisitionModal';
import StandaloneFailureModal from '../../../components/checklist/StandaloneFailureModal';
import StandaloneFailureWithPartModal from '../../../components/checklist/StandaloneFailureWithPartModal';
import FailureDetailModal from '../../../components/checklist/FailureDetailModal';
import SignaturePad from '../../../components/checklist/SignaturePad';
import Swal from 'sweetalert2';

const FailureBookPage = () => {
  const { user } = useAuth();
  const failureSystem = useFailureRequisitionSystem();

  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStandaloneModal, setShowStandaloneModal] = useState(false);
  const [showStandaloneWithPartModal, setShowStandaloneWithPartModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedFailureForSignature, setSelectedFailureForSignature] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filtros avanzados
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    category: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filtersActive, setFiltersActive] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  useEffect(() => {
    loadFailures();
  }, [refreshTrigger]);

  const loadFailures = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await fetch(`${API_URL}/api/failures`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        Swal.fire({
          title: 'Autenticación requerida',
          text: 'Por favor, inicia sesión para continuar',
          icon: 'warning',
          confirmButtonText: 'Ir a iniciar sesión',
          confirmButtonColor: '#3085d6',
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then((result) => {
          if (result.isConfirmed) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
          }
        });
        return;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.failures) {
          setFailures(result.data.failures);
        }
      }
    } catch (error) {
      console.error('Error cargando fallas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (failure) => {
    setSelectedFailure(failure);
    setShowResolveModal(true);
  };

  const handleCreateFailure = () => {
    setShowCreateModal(true);
  };

  const handleCreateStandaloneFailure = () => {
    setShowStandaloneModal(true);
  };

  const handleCreateStandaloneWithPartFailure = () => {
    setShowStandaloneWithPartModal(true);
  };

  const handleViewDetail = (failure) => {
    setSelectedFailure(failure);
    setShowDetailModal(true);
  };

  const handleResolveSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowResolveModal(false);
    setSelectedFailure(null);
  };

  const handleCreateFailureSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowCreateModal(false);
    Swal.fire({
      title: '¡Falla Creada!',
      text: 'La falla ha sido creada con requisición automática.',
      icon: 'success',
      timer: 3000
    });
  };

  const handleDetailSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowDetailModal(false);
    setSelectedFailure(null);
  };

  const handleSignFailure = (failure) => {
    setSelectedFailureForSignature(failure);
    setShowSignaturePad(true);
  };

  const handleSaveAdminSignature = async (signatureData) => {
    if (!selectedFailureForSignature) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/failures/${selectedFailureForSignature.id}/admin-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signatureData: signatureData
        })
      });

      const result = await response.json();

      if (result.success) {
        Swal.fire('¡Firmado!', 'La falla ha sido firmada.', 'success');
        setShowSignaturePad(false);
        setSelectedFailureForSignature(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        Swal.fire('Error', result.error || 'No se pudo firmar la falla.', 'error');
      }
    } catch (error) {
      console.error('Error firmando la falla:', error);
      Swal.fire('Error', 'Ocurrió un error al firmar la falla.', 'error');
    }
  };

  const handleStandaloneWithPartSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowStandaloneWithPartModal(false);
    Swal.fire({
      title: '¡Falla Con Repuesto Creada!',
      text: 'La falla ha sido creada con requisición automática.',
      icon: 'success',
      timer: 3000
    });
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setFiltersApplied(false);
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      severity: 'all',
      category: 'all',
      type: 'all',
      dateFrom: '',
      dateTo: '',
      searchTerm: ''
    });
    setFiltersApplied(false);
    setFiltersActive(false);
  };

  const applyFilters = () => {
    const hasActiveFilters = Object.values(filters).some(f => f !== 'all' && f !== '');
    setFiltersActive(hasActiveFilters);
    setFiltersApplied(true);

    if (hasActiveFilters) {
      Swal.fire({
        title: '¡Filtros Aplicados!',
        text: 'Se han aplicado los filtros seleccionados.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // Funciones para comparar fechas correctamente
  const compareDates = (failureDate, filterDate) => {
    if (!filterDate) return true;
    if (!failureDate) return false;

    const failureDateStr = new Date(failureDate).toISOString().split('T')[0];
    return failureDateStr >= filterDate;
  };

  const compareDatesTo = (failureDate, filterDate) => {
    if (!filterDate) return true;
    if (!failureDate) return false;

    const failureDateStr = new Date(failureDate).toISOString().split('T')[0];
    return failureDateStr <= filterDate;
  };

  // Función para determinar si una falla está resuelta o cancelada
  const isFailureResolved = (failure) => {
    // Si no tiene workOrder, no está resuelta
    if (!failure.workOrder) return false;

    // Si tiene workOrder con status RESUELTA o CANCELADA, está resuelta
    return ['RESUELTA', 'CANCELADO'].includes(failure.workOrder.status);
  };

  // Filtrado avanzado
  const filteredFailures = failures.filter(failure => {
    // Filtro de estado mejorado para considerar la clasificación de resueltas/canceladas
    let statusMatch = true;
    if (filters.status !== 'all') {
      if (filters.status === 'RESUELTO') {
        // Mostrar fallas que tienen workOrder con status RESUELTA o CANCELADO
        statusMatch = isFailureResolved(failure);
      } else {
        // Para otros estados, usar el status original de FailureOrder
        statusMatch = failure.status === filters.status;
      }
    }
    const severityMatch = filters.severity === 'all' || failure.severity === filters.severity;
    const categoryMatch = filters.category === 'all' || failure.categoria === filters.category;

    const typeMatch = filters.type === 'all' ||
      (filters.type === 'checklist' && failure.checklist_item_id) ||
      (filters.type === 'devices' && failure.affected_id && !failure.checklist_item_id) ||
      (filters.type === 'independent' && !failure.checklist_item_id && !failure.affected_id);

    // Filtrado de fechas mejorado
    const dateFromMatch = compareDates(failure.createdAt, filters.dateFrom);
    const dateToMatch = compareDatesTo(failure.createdAt, filters.dateTo);
    const dateMatch = dateFromMatch && dateToMatch;

    const searchMatch = !filters.searchTerm ||
      failure.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      failure.failure_order_id?.toLowerCase().includes(filters.searchTerm.toLowerCase());

    return statusMatch && severityMatch && categoryMatch && typeMatch && dateMatch && searchMatch;
  });

  // Categorización de fallas pendientes (filtradas)
  const categorizePendingFilteredFailures = () => {
    const pendingFailures = filteredFailures.filter(f => !isFailureResolved(f));
    return {
      checklist: pendingFailures.filter(f => f.checklist_item_id),
      devices: pendingFailures.filter(f => f.affected_id && !f.checklist_item_id),
      independent: pendingFailures.filter(f => !f.checklist_item_id && !f.affected_id)
    };
  };

  // Categorización de fallas resueltas (filtradas)
  const categorizeResolvedFilteredFailures = () => {
    const resolvedFailures = filteredFailures.filter(f => isFailureResolved(f));
    return {
      checklist: resolvedFailures.filter(f => f.checklist_item_id),
      devices: resolvedFailures.filter(f => f.affected_id && !f.checklist_item_id),
      independent: resolvedFailures.filter(f => !f.checklist_item_id && !f.affected_id)
    };
  };

  // Categorización de fallas pendientes
  const categorizePendingFailures = () => {
    const pendingFailures = failures.filter(f => !isFailureResolved(f));
    return {
      checklist: pendingFailures.filter(f => f.checklist_item_id),
      devices: pendingFailures.filter(f => f.affected_id && !f.checklist_item_id),
      independent: pendingFailures.filter(f => !f.checklist_item_id && !f.affected_id)
    };
  };

  // Categorización de fallas resueltas
  const categorizeResolvedFailures = () => {
    const resolvedFailures = failures.filter(f => isFailureResolved(f));
    return {
      checklist: resolvedFailures.filter(f => f.checklist_item_id),
      devices: resolvedFailures.filter(f => f.affected_id && !f.checklist_item_id),
      independent: resolvedFailures.filter(f => !f.checklist_item_id && !f.affected_id)
    };
  };

  // Obtener datos para las secciones (filtrados o no filtrados)
  const getSectionsData = () => {
    const hasActiveFilters = Object.values(filters).some(f => f !== 'all' && f !== '');
    if (hasActiveFilters && filtersApplied) {
      return {
        pending: categorizePendingFilteredFailures(),
        resolved: categorizeResolvedFilteredFailures()
      };
    }
    return {
      pending: categorizePendingFailures(),
      resolved: categorizeResolvedFailures()
    };
  };

  const categorized = getSectionsData();

  const getStatusChip = (status) => {
    const statusMap = {
      'REPORTADO': { label: 'Reportado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'RESUELTO': { label: 'Resuelto', color: 'bg-green-100 text-green-800 border-green-200' },
      'CERRADO': { label: 'Cerrado', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    };

    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getSeverityChip = (severity) => {
    const severityMap = {
      'LEVE': { label: 'Leve', color: 'bg-green-100 text-green-800 border-green-200' },
      'MODERADA': { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'CRITICA': { label: 'Crítica', color: 'bg-red-100 text-red-800 border-red-200' }
    };

    const severityInfo = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${severityInfo.color}`}>
        {severityInfo.label}
      </span>
    );
  };

  const getCategoryChip = (category) => {
    const categoryMap = {
      'TECNICA': { label: 'Técnica', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'OPERATIVA': { label: 'Operativa', color: 'bg-green-100 text-green-800 border-green-200' },
      'LOCATIVA': { label: 'Locativa', color: 'bg-orange-100 text-orange-800 border-orange-200' }
    };

    const categoryInfo = categoryMap[category] || { label: category, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color}`}>
        {categoryInfo.label}
      </span>
    );
  };

  const getWorkOrderStatusChip = (failure) => {
    if (!failure.workOrder) return null;

    const statusMap = {
      'RESUELTA': { label: 'Resuelta', color: 'bg-green-100 text-green-800 border-green-200' },
      'CANCELADO': { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
      'EN_PROCESO': { label: 'En Proceso', color: 'bg-blue-100 text-blue-800 border-blue-200' }
    };

    const statusInfo = statusMap[failure.workOrder.status] || { label: failure.workOrder.status, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
        {statusInfo.label}
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

  const getDaysSinceReport = (dateString) => {
    if (!dateString) return 0;
    const reportDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - reportDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const FailureCard = ({ failure, category }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-gray-700">
            {failure.failure_order_id || `OF-${failure.id}`}
          </span>
          <div className="flex gap-1">
            {getStatusChip(failure.status)}
            {getSeverityChip(failure.severity)}
            {failure.workOrder && getWorkOrderStatusChip(failure)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">
            {getDaysSinceReport(failure.createdAt)}d
          </div>
          <div className="text-xs text-gray-400">
            {formatDate(failure.createdAt)}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-800 leading-relaxed">
          {failure.description.length > 100
            ? `${failure.description.substring(0, 100)}...`
            : failure.description
          }
        </p>
        {failure.reporter && (
          <p className="text-xs text-gray-500 mt-1">
            Reportado por: {failure.reporter.user_name}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getCategoryChip(failure.categoria)}
          {category && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              {category}
            </span>
          )}
          {failure.workOrder && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
              OT-{failure.workOrder.id}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetail(failure)}
            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <i className="fas fa-eye mr-1"></i>
            Ver
          </button>
          {(user.role_id === 1 || user.role_id === 2) && (
            <button
              onClick={() => handleSignFailure(failure)}
              className="px-3 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
            >
              <i className="fas fa-signature mr-1"></i>
              Firmar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando libro de fallas...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Estadísticas generales
  const stats = {
    total: failures.length,
    pending: failures.filter(f => !isFailureResolved(f)).length,
    resolved: failures.filter(f => isFailureResolved(f)).length,
    critical: failures.filter(f => f.severity === 'CRITICA').length,
    checklist: failures.filter(f => f.checklist_item_id).length,
    devices: failures.filter(f => f.affected_id && !f.checklist_item_id).length,
    independent: failures.filter(f => !f.checklist_item_id && !f.affected_id).length
  };

  // Estadísticas filtradas
  const filteredStats = filtersApplied ? {
    total: filteredFailures.length,
    pending: filteredFailures.filter(f => !isFailureResolved(f)).length,
    resolved: filteredFailures.filter(f => isFailureResolved(f)).length,
    critical: filteredFailures.filter(f => f.severity === 'CRITICA').length,
    checklist: categorized.pending.checklist.length + categorized.resolved.checklist.length,
    devices: categorized.pending.devices.length + categorized.resolved.devices.length,
    independent: categorized.pending.independent.length + categorized.resolved.independent.length
  } : stats;

  const SectionHeader = ({ icon, title, count, color, description }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <i className={`${icon} ${color} text-2xl`}></i>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {title} ({count})
              {filtersApplied && <span className="text-sm font-normal text-blue-600 ml-2">(filtradas)</span>}
            </h2>
            <p className="text-gray-600 text-sm">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const FailureSection = ({ title, icon, color, categories, sectionType }) => (
    <div className="mb-12">
      <SectionHeader
        icon={icon}
        title={title}
        count={categories.checklist.length + categories.devices.length + categories.independent.length}
        color={color}
        description={`Fallas ${sectionType} organizadas por categoría`}
      />

      {/* Fallas de Checklists */}
      {categories.checklist.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <i className="fas fa-clipboard-list text-purple-600 text-lg"></i>
            <h3 className="text-lg font-bold text-gray-800">
              Checklists ({categories.checklist.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.checklist.map(failure => (
              <FailureCard key={failure.id} failure={failure} category="Checklist" />
            ))}
          </div>
        </div>
      )}

      {/* Fallas de Dispositivos */}
      {categories.devices.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <i className="fas fa-cog text-orange-600 text-lg"></i>
            <h3 className="text-lg font-bold text-gray-800">
              Dispositivos ({categories.devices.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.devices.map(failure => (
              <FailureCard key={failure.id} failure={failure} category="Dispositivo" />
            ))}
          </div>
        </div>
      )}

      {/* Fallas Independientes */}
      {categories.independent.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <i className="fas fa-wrench text-indigo-600 text-lg"></i>
            <h3 className="text-lg font-bold text-gray-800">
              Independientes ({categories.independent.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.independent.map(failure => (
              <FailureCard key={failure.id} failure={failure} category="Independiente" />
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay fallas */}
      {categories.checklist.length === 0 && categories.devices.length === 0 && categories.independent.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <i className={`${icon} text-gray-400 text-4xl mb-4`}></i>
          <p className="text-gray-600">
            {filtersApplied ? `No hay fallas ${sectionType.toLowerCase()} que coincidan con los filtros` : `No hay fallas ${sectionType.toLowerCase()}`}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <i className="fas fa-book text-purple-600"></i>
                  Libro de Fallas General
                  {filtersApplied && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <i className="fas fa-filter mr-1"></i>
                      Filtrado
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestión centralizada de todas las fallas del sistema
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  Actualizar
                </button>
                <button
                  onClick={handleCreateStandaloneFailure}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Nueva Falla
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-list text-gray-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredStats.total}</p>
                  {filtersApplied && <p className="text-xs text-blue-600">de {stats.total}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-clock text-orange-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">{filteredStats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Resueltas</p>
                  <p className="text-2xl font-bold text-green-600">{filteredStats.resolved}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Críticas</p>
                  <p className="text-2xl font-bold text-red-600">{filteredStats.critical}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-clipboard-list text-purple-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Checklists</p>
                  <p className="text-2xl font-bold text-purple-600">{filteredStats.checklist}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-cog text-orange-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Dispositivos</p>
                  <p className="text-2xl font-bold text-orange-600">{filteredStats.devices}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-filter text-gray-600"></i>
                  Filtros Avanzados
                  {filtersApplied && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      <i className="fas fa-check mr-1"></i>
                      Aplicados
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <i className={`fas fa-chevron-${showFilters ? 'up' : 'down'} mr-1`}></i>
                    {showFilters ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    onClick={applyFilters}
                    className={`px-3 py-2 text-white rounded-md transition-colors ${filtersApplied
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    <i className={`fas fa-${filtersApplied ? 'check' : 'play'} mr-1`}></i>
                    {filtersApplied ? 'Actualizar' : 'Aplicar'}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    <i className="fas fa-times mr-1"></i>
                    Limpiar
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilter('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">Todos</option>
                      <option value="REPORTADO">Reportadas</option>
                      <option value="RESUELTO">Resueltas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severidad</label>
                    <select
                      value={filters.severity}
                      onChange={(e) => updateFilter('severity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">Todas</option>
                      <option value="LEVE">Leve</option>
                      <option value="MODERADA">Moderada</option>
                      <option value="CRITICA">Crítica</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={filters.category}
                      onChange={(e) => updateFilter('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">Todas</option>
                      <option value="TECNICA">Técnica</option>
                      <option value="OPERATIVA">Operativa</option>
                      <option value="LOCATIVA">Locativa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={filters.type}
                      onChange={(e) => updateFilter('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">Todos</option>
                      <option value="checklist">Checklists</option>
                      <option value="devices">Dispositivos</option>
                      <option value="independent">Independientes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => updateFilter('dateFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => updateFilter('dateTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <input
                      type="text"
                      value={filters.searchTerm}
                      onChange={(e) => updateFilter('searchTerm', e.target.value)}
                      placeholder="Buscar por descripción o ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Secciones principales divididas */}
          <div className="space-y-12">

            {/* FALLAS PENDIENTES */}
            <FailureSection
              title="Fallas Pendientes"
              icon="fas fa-clock"
              color="text-orange-600"
              categories={categorized.pending}
              sectionType="pendientes"
            />

            {/* FALLAS RESUELTAS */}
            <FailureSection
              title="Fallas Resueltas"
              icon="fas fa-check-circle"
              color="text-green-600"
              categories={categorized.resolved}
              sectionType="resueltas"
            />

          </div>

          {filteredFailures.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron fallas</h3>
              <p className="text-gray-600">
                {Object.values(filters).some(f => f !== 'all' && f !== '')
                  ? 'No hay fallas que coincidan con los filtros aplicados.'
                  : 'No hay fallas registradas en el sistema.'
                }
              </p>
            </div>
          )}

        </div>

        {/* Modales */}
        {showSignaturePad && (
          <SignaturePad
            onSave={handleSaveAdminSignature}
            onClose={() => {
              setShowSignaturePad(false);
              setSelectedFailureForSignature(null);
            }}
          />
        )}

        <ResolveFailureWithPartModal
          show={showResolveModal}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedFailure(null);
          }}
          failure={selectedFailure}
          onSuccess={handleResolveSuccess}
        />

        <CreateFailureWithRequisitionModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateFailureSuccess}
          checklistResponseId={null}
          checklistItemId={null}
          inspectableId={null}
        />

        <StandaloneFailureModal
          show={showStandaloneModal}
          onClose={() => setShowStandaloneModal(false)}
          inspectableId={null}
          onSuccess={(failureData) => {
            setRefreshTrigger(prev => prev + 1);
            setShowStandaloneModal(false);
            Swal.fire({
              title: '✅ Falla Creada',
              text: 'La falla ha sido creada exitosamente.',
              icon: 'success',
              timer: 3000
            });
          }}
        />

        <StandaloneFailureWithPartModal
          show={showStandaloneWithPartModal}
          onClose={() => setShowStandaloneWithPartModal(false)}
          onSuccess={handleStandaloneWithPartSuccess}
        />

        <FailureDetailModal
          show={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFailure(null);
          }}
          failure={selectedFailure}
          onSuccess={handleDetailSuccess}
        />
      </div>
    </ProtectedRoute>
  );
};

export default FailureBookPage;
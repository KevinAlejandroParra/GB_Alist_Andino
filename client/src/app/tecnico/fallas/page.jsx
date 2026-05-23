'use client'

/**
 * LIBRO DE FALLAS - Página Compartida por Todos los Roles
 * 
 * Esta página es accesible desde:
 * - /tecnico/fallas (Técnicos)
 * - /jefe/fallas (Anfitriones/Jefes) → redirige aquí
 * - /AdminDashboard/fallas (Admin/Soporte) → redirige aquí
 * 
 * El FILTRADO POR ROL se hace AUTOMÁTICAMENTE en el BACKEND:
 * - Admin (role_id=1) y Soporte (role_id=2): Ven TODAS las fallas
 * - Técnico (role_id=3): Solo ve assigned_to='TECNICA' O type_maintenance='LOCATIVA'
 * - Anfitrión (role_id=4): Solo ve assigned_to='OPERATIVA'
 * 
 * Características:
 * - Organización: Sin OT / Con OT
 * - Sub-categorización: Checklists / Dispositivos / Independientes
 * - Filtros: Estado, Tiene OT, Tiene Repuestos, Tipo Mantenimiento (admin)
 * - Exportar Excel (solo admin/soporte)
 * - Enlazar fallas duplicadas a OT existente
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import FailureCard from '../../../components/checklist/FailureCard';
import FailureDetailModal from '../../../components/checklist/FailureDetailModal';
import RecurringFailureModal from '../../../components/checklist/RecurringFailureModal';
import StandaloneFailureModal from '../../../components/checklist/StandaloneFailureModal';
import Swal from 'sweetalert2';

const FailureBookPageNew = () => {
  const { user } = useAuth();

  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filtros simplificados
  const [filters, setFilters] = useState({
    status: 'all', // all, pending, resolved
    severity: 'all', // all, LEVE, MODERADA, CRITICA
    type_maintenance: 'all', // all, TECNICA, OPERATIVA, LOCATIVA (solo admin)
    hasWorkOrder: 'all', // all, true, false
    hasParts: 'all' // all, true, false
  });

  useEffect(() => {
    loadFailures();
  }, [refreshTrigger]);

  const loadFailures = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      // Construir query params
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.type_maintenance !== 'all') params.append('type_maintenance', filters.type_maintenance);
      if (filters.hasWorkOrder !== 'all') params.append('hasWorkOrder', filters.hasWorkOrder);
      if (filters.hasParts !== 'all') params.append('hasParts', filters.hasParts);

      console.log('🔍 [LOAD FAILURES] URL:', `${API_URL}/api/failures?${params.toString()}`);

      const response = await fetch(`${API_URL}/api/failures?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 [LOAD FAILURES] Response status:', response.status);

      if (response.status === 401) {
        Swal.fire({
          title: 'Autenticación requerida',
          text: 'Por favor, inicia sesión para continuar',
          icon: 'warning',
          confirmButtonText: 'Ir a iniciar sesión'
        }).then(() => {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        });
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 [LOAD FAILURES] Result:', result);
        
        if (result.success && result.data.failures) {
          console.log('✅ [LOAD FAILURES] Fallas cargadas:', result.data.failures.length);
          setFailures(result.data.failures);
        } else {
          console.warn('⚠️ [LOAD FAILURES] Respuesta sin fallas:', result);
          setFailures([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [LOAD FAILURES] Error response:', response.status, errorData);
        Swal.fire('Error', errorData.error?.message || 'No se pudieron cargar las fallas', 'error');
      }
    } catch (error) {
      console.error('❌ [LOAD FAILURES] Exception:', error);
      Swal.fire('Error', 'No se pudieron cargar las fallas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (failure) => {
    setSelectedFailure(failure);
    setShowDetailModal(true);
  };

  const handleResolve = (failure) => {
    setSelectedFailure(failure);
    setShowResolveModal(true);
  };

  const handleLinkToWorkOrder = async (failure) => {
    // Mostrar input para ingresar el ID de la OT existente
    const { value: workOrderId } = await Swal.fire({
      title: 'Enlazar a Orden de Trabajo',
      html: `
        <p class="text-sm text-gray-600 mb-4">Ingresa el ID de la orden de trabajo existente</p>
        <p class="text-xs text-gray-500 mb-2">Ejemplo: OT-2026-444594</p>
      `,
      input: 'text',
      inputPlaceholder: 'OT-2026-XXXXXX',
      showCancelButton: true,
      confirmButtonText: 'Enlazar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar un ID de OT';
        }
        if (!value.startsWith('OT-')) {
          return 'El ID debe comenzar con "OT-" (ej: OT-2026-444594)';
        }
      }
    });

    if (workOrderId) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        
        console.log('🔗 Enlazando falla', failure.id, 'a OT:', workOrderId);
        
        const response = await fetch(`${API_URL}/api/failures/${failure.id}/link-work-order`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ work_order_id: workOrderId })
        });

        console.log('🔗 Response status:', response.status);
        console.log('🔗 Response headers:', response.headers.get('content-type'));

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error('❌ Respuesta no es JSON:', textResponse);
          throw new Error(`El servidor devolvió ${response.status}: ${textResponse.substring(0, 200)}`);
        }

        const result = await response.json();

        console.log('🔗 Respuesta del servidor:', result);

        if (result.success) {
          Swal.fire({
            title: '¡Enlazado!',
            text: 'La falla ha sido enlazada a la orden de trabajo',
            icon: 'success',
            timer: 3000
          });
          setRefreshTrigger(prev => prev + 1);
        } else {
          Swal.fire({
            title: 'Error',
            text: result.error?.message || 'No se pudo enlazar la falla',
            icon: 'error'
          });
        }
      } catch (error) {
        console.error('❌ Error enlazando falla:', error);
        Swal.fire({
          title: 'Error',
          text: error.message || 'Ocurrió un error al enlazar la falla',
          icon: 'error'
        });
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      Swal.fire({
        title: 'Generando Excel...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`${API_URL}/api/failures/export/excel`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_fallas_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Swal.fire('¡Descargado!', 'El informe ha sido descargado exitosamente', 'success');
      } else {
        throw new Error('Error al descargar el archivo');
      }
    } catch (error) {
      console.error('Error exportando Excel:', error);
      Swal.fire('Error', 'No se pudo generar el informe Excel', 'error');
    }
  };

  // Categorizar fallas
  const categorizeFailures = () => {
    const withoutOT = failures.filter(f => !f.workOrder);
    const withOT = failures.filter(f => f.workOrder);

    return {
      withoutOT: {
        checklist: withoutOT.filter(f => f.checklist_item_id),
        devices: withoutOT.filter(f => f.affected_id && !f.checklist_item_id),
        independent: withoutOT.filter(f => !f.checklist_item_id && !f.affected_id)
      },
      withOT: {
        checklist: withOT.filter(f => f.checklist_item_id),
        devices: withOT.filter(f => f.affected_id && !f.checklist_item_id),
        independent: withOT.filter(f => !f.checklist_item_id && !f.affected_id)
      }
    };
  };

  const categorized = categorizeFailures();

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      severity: 'all',
      type_maintenance: 'all',
      hasWorkOrder: 'all',
      hasParts: 'all'
    });
    setRefreshTrigger(prev => prev + 1);
  };

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

  const stats = {
    total: failures.length,
    withoutOT: categorized.withoutOT.checklist.length + categorized.withoutOT.devices.length + categorized.withoutOT.independent.length,
    withOT: categorized.withOT.checklist.length + categorized.withOT.devices.length + categorized.withOT.independent.length,
    critical: failures.filter(f => f.severity === 'CRITICA').length
  };

  const CategorySection = ({ title, icon, failures, color }) => {
    if (failures.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <i className={`${icon} ${color} text-lg`}></i>
          <h4 className="text-md font-semibold text-gray-800">
            {title} ({failures.length})
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {failures.map(failure => (
            <FailureCard
              key={failure.id}
              failure={failure}
              onViewDetail={handleViewDetail}
              onResolve={handleResolve}
              onLinkToWorkOrder={handleLinkToWorkOrder}
              userRole={user.role_id}
            />
          ))}
        </div>
      </div>
    );
  };

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
                  Libro de Fallas
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestión centralizada de fallas del sistema
                </p>
              </div>
              <div className="flex gap-3">
                {(user.role_id === 1 || user.role_id === 2) && (
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <i className="fas fa-file-excel mr-2"></i>
                    Exportar Excel
                  </button>
                )}
                <button
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  Actualizar
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-list text-gray-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle text-orange-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Sin OT</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.withoutOT}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-clipboard-check text-blue-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Con OT</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.withOT}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600">Críticas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-filter text-gray-600"></i>
              Filtros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="resolved">Resueltas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiene OT</label>
                <select
                  value={filters.hasWorkOrder}
                  onChange={(e) => updateFilter('hasWorkOrder', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos</option>
                  <option value="true">Con OT</option>
                  <option value="false">Sin OT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiene Repuestos</label>
                <select
                  value={filters.hasParts}
                  onChange={(e) => updateFilter('hasParts', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos</option>
                  <option value="true">Con Repuestos</option>
                  <option value="false">Sin Repuestos</option>
                </select>
              </div>

              {(user.role_id === 1 || user.role_id === 2) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Mantenimiento</label>
                  <select
                    value={filters.type_maintenance}
                    onChange={(e) => updateFilter('type_maintenance', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos</option>
                    <option value="TECNICA">Técnica</option>
                    <option value="OPERATIVA">Operativa</option>
                    <option value="LOCATIVA">Locativa</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-play mr-1"></i>
                Aplicar
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                <i className="fas fa-times mr-1"></i>
                Limpiar
              </button>
            </div>
          </div>

          {/* Sección: Sin Orden de Trabajo */}
          <div className="mb-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-orange-600 text-2xl"></i>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Sin Orden de Trabajo ({stats.withoutOT})
                  </h2>
                  <p className="text-gray-600 text-sm">Fallas que aún no tienen OT asignada</p>
                </div>
              </div>
            </div>

            <CategorySection
              title="Checklists"
              icon="fas fa-clipboard-list"
              failures={categorized.withoutOT.checklist}
              color="text-purple-600"
            />

            <CategorySection
              title="Dispositivos"
              icon="fas fa-cog"
              failures={categorized.withoutOT.devices}
              color="text-orange-600"
            />

            <CategorySection
              title="Independientes"
              icon="fas fa-wrench"
              failures={categorized.withoutOT.independent}
              color="text-indigo-600"
            />

            {stats.withoutOT === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <i className="fas fa-check-circle text-green-400 text-4xl mb-4"></i>
                <p className="text-gray-600">No hay fallas sin orden de trabajo</p>
              </div>
            )}
          </div>

          {/* Sección: Con Orden de Trabajo */}
          <div className="mb-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-3">
                <i className="fas fa-clipboard-check text-blue-600 text-2xl"></i>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Con Orden de Trabajo ({stats.withOT})
                  </h2>
                  <p className="text-gray-600 text-sm">Fallas con OT en proceso o completadas</p>
                </div>
              </div>
            </div>

            <CategorySection
              title="Checklists"
              icon="fas fa-clipboard-list"
              failures={categorized.withOT.checklist}
              color="text-purple-600"
            />

            <CategorySection
              title="Dispositivos"
              icon="fas fa-cog"
              failures={categorized.withOT.devices}
              color="text-orange-600"
            />

            <CategorySection
              title="Independientes"
              icon="fas fa-wrench"
              failures={categorized.withOT.independent}
              color="text-indigo-600"
            />

            {stats.withOT === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <i className="fas fa-info-circle text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-600">No hay fallas con orden de trabajo</p>
              </div>
            )}
          </div>
        </div>

        {/* Modales */}
        <FailureDetailModal
          show={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFailure(null);
          }}
          failure={selectedFailure}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowDetailModal(false);
            setSelectedFailure(null);
          }}
        />

        <RecurringFailureModal
          show={showResolveModal}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedFailure(null);
          }}
          checklistItemId={selectedFailure?.checklist_item_id}
          inspectableId={selectedFailure?.affected_id}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowResolveModal(false);
            setSelectedFailure(null);
          }}
        />

        <StandaloneFailureModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          inspectableId={null}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowCreateModal(false);
            Swal.fire('¡Creada!', 'La falla ha sido creada exitosamente', 'success');
          }}
        />
      </div>
    </ProtectedRoute>
  );
};

export default FailureBookPageNew;

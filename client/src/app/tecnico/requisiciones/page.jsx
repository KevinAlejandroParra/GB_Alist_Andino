'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import useFailureRequisitionSystem from '../../../components/checklist/hooks/useFailureRequisitionSystem';
import CreateRequisitionModal from '../../../components/checklist/requisitions/CreateRequisitionModal';
import Swal from 'sweetalert2';
import { getImageSrc } from '../../../utils/imageUrl';

const TecnicoRequisitionsPage = () => {
  const { user } = useAuth();
  const failureSystem = useFailureRequisitionSystem();

  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPartInfo, setCreatePartInfo] = useState(null);
  const [createWorkOrderId, setCreateWorkOrderId] = useState(null);

  useEffect(() => {
    // Solo cargar cuando tengamos información del usuario
    if (user && user.user_id) {
      loadRequisitions();
    }
  }, [refreshTrigger, user]);

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const filters = { requestedBy: user.user_id };
      if (filter && filter !== 'all') filters.status = filter;
      console.log('🔎 Cargando requisiciones con filtros:', filters);
      const result = await failureSystem.getRequisitions(filters);
      console.log('📥 Resultado getRequisitions:', result);
      if (result.success) {
        // Aceptar tanto response.data.requisitions como response.data.data.requisitions
        const requisitionsFromResponse = result.data?.requisitions || result.data?.data?.requisitions || [];
        setRequisitions(requisitionsFromResponse);
      } else {
        Swal.fire('Error', result.error || 'No se pudo cargar la lista de requisiciones', 'error');
      }
    } catch (error) {
      console.error('Error cargando requisiciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Use shared helper getImageSrc from utils/imageUrl

  // Re-solicitar: crear una nueva requisición copiando la información y sumando una cantidad
  const handleResolicit = async (requisition) => {
    const originalQty = requisition.quantity_requested || 1;
    const { value: additional } = await Swal.fire({
      title: 'Re-solicitar repuesto',
      text: `Repuesto: ${requisition.part_reference} - Cant actual ${originalQty}`,
      input: 'number',
      inputLabel: 'Incrementar cantidad (ej. 1 para +1)',
      inputValue: 1,
      showCancelButton: true,
      inputAttributes: { min: 1 },
      confirmButtonText: 'Crear Requisición',
      cancelButtonText: 'Cancelar'
    });

    if (!additional) return;
    const newQty = originalQty + parseInt(additional || 0, 10);

    try {
      const payload = {
        workOrderId: requisition.workOrder?.id || requisition.work_order_id,
        partReference: requisition.part_reference,
        quantityRequested: newQty,
        notes: `Re-solicitud basada en requisición #${requisition.id}`,
        urgencyLevel: 'NORMAL',
        requestedBy: user.user_id,
        imageUrl: requisition.image_url || requisition.imageUrl || null
      };
      console.log('📤 Enviando re-solicitud con payload:', payload);
      const response = await failureSystem.createRequisition(payload);
      if (response.success) {
        Swal.fire('Éxito', `Requisición creada (#${response.data.data?.id})`, 'success');
        setRefreshTrigger(prev => prev + 1);
      } else {
        Swal.fire('Error', response.error || 'No se pudo crear la requisición', 'error');
      }
    } catch (err) {
      console.error('Error re-solicitando:', err);
      Swal.fire('Error', err.message || 'Error al re-solicitar', 'error');
    }
  };

  const handleDelete = async (requisition) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Eliminar Requisición',
      text: `¿Estás seguro de eliminar la requisición #${requisition.id}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    try {
      const result = await failureSystem.deleteRequisition(requisition.id);
      if (result.success) {
        Swal.fire('Eliminado', 'La requisición fue eliminada', 'success');
        setRefreshTrigger(prev => prev + 1);
      } else {
        Swal.fire('Error', result.error || 'No se pudo eliminar la requisición', 'error');
      }
    } catch (err) {
      console.error('Error eliminando requisición:', err);
      Swal.fire('Error', err.message || 'Error eliminando la requisición', 'error');
    }
  };

  const openCreateModal = (requisition) => {
    setCreatePartInfo({ name: requisition.part_reference, quantity: requisition.quantity_requested || 1 });
    setCreateWorkOrderId(requisition.workOrder?.id || requisition.work_order_id);
    setShowCreateModal(true);
  };

  if (loading) return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">Cargando requisiciones...</div>
      </div>
    </ProtectedRoute>
  );

  const filtered = requisitions.filter(r => filter === 'all' ? true : r.status === filter);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📦 Mis Requisiciones</h1>
              <p className="text-gray-600 mt-1">Lista de requisiciones que has solicitado</p>
            </div>
            <div className="flex items-center gap-4">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
                <option value="all">Todos</option>
                <option value="SOLICITADO">Solicitados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="RECIBIDO">Recibidos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >🔄 Actualizar</button>
            </div>
          </div>

          {/* Estadísticas pequeñas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm font-medium text-gray-600">Solicitados</p>
              <p className="text-2xl font-semibold text-gray-900">{requisitions.filter(r => r.status === 'SOLICITADO').length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-semibold text-gray-900">{requisitions.filter(r => r.status === 'PENDIENTE').length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm font-medium text-gray-600">Recibidos</p>
              <p className="text-2xl font-semibold text-gray-900">{requisitions.filter(r => r.status === 'RECIBIDO').length}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Mis Requisiciones</h2>
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center">No hay requisiciones</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repuesto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">#{req.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getImageSrc(req.image_url) ? (
                              <img src={getImageSrc(req.image_url)} alt={req.part_reference} className="w-12 h-12 object-cover rounded-md border" />
                            ) : (
                              <i className="fas fa-box text-slate-500 text-xl"></i>
                            )}
                            <div className="text-sm font-medium text-gray-900">{req.part_reference}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{req.workOrder ? `OT-${req.workOrder.id}` : 'N/A'}</td>
                        <td className="px-6 py-4">{req.status}</td>
                        <td className="px-6 py-4">{req.quantity_requested}</td>
                        <td className="px-6 py-4">{formatDate(req.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {['RECIBIDO', 'PENDIENTE'].includes(req.status) && (
                              <button
                                onClick={() => handleResolicit(req)}
                                className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 flex items-center gap-2"
                                title="Re-solicitar"
                              >
                                <i className="fas fa-redo"></i>
                                <span>Re-solicitar</span>
                              </button>
                            )}
                            {(user && (user.user_id === req.requested_by_id) && ['SOLICITADO','CANCELADO'].includes(req.status)) && (
                              <button
                                onClick={() => handleDelete(req)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                                title="Eliminar"
                              >
                                <i className="fas fa-trash"></i>
                                <span>Eliminar</span>
                              </button>
                            )}
                            <button
                              onClick={() => openCreateModal(req)}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                            >
                              <i className="fas fa-edit"></i>
                              <span>Editar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <CreateRequisitionModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          workOrderId={createWorkOrderId}
          partInfo={createPartInfo}
        />
      </div>
    </ProtectedRoute>
  );
};

export default TecnicoRequisitionsPage;

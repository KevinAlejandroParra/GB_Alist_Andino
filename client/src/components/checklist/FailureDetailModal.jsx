'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import SignaturePad from './SignaturePad';
import ManageFailureModal from './ManageFailureModal';
import CancelFailureModal from './CancelFailureModal';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import LinkedFailuresSection from './LinkedFailuresSection';
import {
  createFailureReportSignature,
  createFailureAdminSignature,
  canUserCreateAdminSignature
} from '../../utils/failureSignaturesApi';

const FailureDetailModal = ({
  show,
  onClose,
  failure,
  onSuccess
}) => {
  const { user } = useAuth();
  const [failureDetail, setFailureDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureType, setSignatureType] = useState(null); // 'REPORT' or 'ADMIN'
  const [loadingSignatures] = [loading]; // alias — las firmas se cargan junto con failureDetail
  const [showManageModal, setShowManageModal] = useState(false); // Para RecurringFailureModal
  const [showCancelModal, setShowCancelModal] = useState(false);
  // ✅ PROBLEMA 5: estado para actualizar imagen
  const [showImageUpdate, setShowImageUpdate] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [updatingImage, setUpdatingImage] = useState(false);
  // ✅ PROBLEMA 6: estado para asignar inspectable
  const [showAssignInspectable, setShowAssignInspectable] = useState(false);
  const [inspectablesList, setInspectablesList] = useState([]);
  const [selectedInspectableId, setSelectedInspectableId] = useState('');
  const [assigningInspectable, setAssigningInspectable] = useState(false);

  useEffect(() => {
    if (show && failure) {
      loadFailureDetail();
    }
  }, [show, failure]);

  const getExecutionStatus = () =>
    failureDetail?.repairExecution?.status
    || failureDetail?.workOrder?.status
    || null;

  const handleReactivate = async () => {
    const confirmed = await Swal.fire({
      title: '¿Reactivar esta falla?',
      text: 'La falla volverá a aparecer como activa',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reactivar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmed.isConfirmed) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
      const response = await axiosInstance.put(`${API_URL}/api/failures/${failureDetail.id}/reactivate`);
      if (response.data.success) {
        Swal.fire('Reactivada', 'La falla está activa nuevamente', 'success');
        loadFailureDetail();
        onSuccess?.();
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo reactivar', 'error');
    }
  };

  const loadFailureDetail = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/failures/${failure.id}`);

      if (response.data.success) {
        setFailureDetail(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando detalle de falla:', error);
      Swal.fire('Error', 'No se pudo cargar el detalle de la falla', 'error');
    } finally {
      setLoading(false);
    }
  };

  // loadSignaturesInfo eliminado — las firmas se leen directamente de failureDetail

  const handleSignatureSave = async (signatureData) => {
    try {
      setShowSignaturePad(false);

      let result;

      if (signatureType === 'ADMIN') {
        // Crear firma de administrador
        result = await createFailureAdminSignature(failure.id, signatureData);
      } else {
        // Crear firma de reporte (por defecto)
        result = await createFailureReportSignature(
          failure.id,
          signatureData,
          user.user_name,
          user.role_name
        );
      }

      if (result.success) {
        // Recargar el detalle completo para refrescar firmas, adminSigner, etc.
        await loadFailureDetail();
        const typeMsg = signatureType === 'ADMIN' ? 'administrador' : 'reporte';
        Swal.fire('✅ Firma Guardada', `Firma de ${typeMsg} guardada exitosamente`, 'success');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.error?.message || 'Error al firmar');
      }
    } catch (error) {
      console.error('Error guardando firma:', error);
      Swal.fire('Error', error.message, 'error');
    }
  };

  const handleSignReport = () => {
    // Cualquier usuario autenticado puede firmar el reporte
    setSignatureType('REPORT');
    setShowSignaturePad(true);
  };

  const handleSignAdmin = () => {
    if (!canUserCreateAdminSignature(user)) {
      Swal.fire('Error', 'Solo el administrador puede firmar esta orden', 'error');
      return;
    }
    setSignatureType('ADMIN');
    setShowSignaturePad(true);
  };

  // ✅ PROBLEMA 5: Actualizar imagen de evidencia
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNewImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpdateImage = async () => {
    if (!newImageFile) return;
    setUpdatingImage(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const fd = new FormData();
      fd.append('evidence', newImageFile);
      await axiosInstance.post(`${API_URL}/api/failures/${failure.id}/update-image`, fd);
      Swal.fire('✅ Imagen actualizada', 'La imagen de evidencia fue actualizada correctamente', 'success');
      setShowImageUpdate(false);
      setNewImageFile(null);
      setNewImagePreview(null);
      loadFailureDetail();
      if (onSuccess) onSuccess();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo actualizar la imagen', 'error');
    } finally {
      setUpdatingImage(false);
    }
  };

  // ✅ PROBLEMA 6: Asignar inspectable
  const loadInspectablesList = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const res = await axiosInstance.get(`${API_URL}/api/failures/inspectables-list`);
      if (res.data.success) setInspectablesList(res.data.data);
    } catch (e) {
      console.error('Error cargando inspectables:', e);
    }
  };

  const handleOpenAssignInspectable = () => {
    setSelectedInspectableId('');
    setShowAssignInspectable(true);
    loadInspectablesList();
  };

  const handleAssignInspectable = async () => {
    if (!selectedInspectableId) return;
    setAssigningInspectable(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      await axiosInstance.patch(`${API_URL}/api/failures/${failure.id}/assign-inspectable`, {
        inspectable_id: parseInt(selectedInspectableId)
      });
      Swal.fire('✅ Dispositivo asignado', 'El dispositivo fue asignado correctamente a la falla', 'success');
      setShowAssignInspectable(false);
      loadFailureDetail();
      if (onSuccess) onSuccess();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo asignar el dispositivo', 'error');
    } finally {
      setAssigningInspectable(false);
    }
  };

  // Utilidades para chips
  const getSeverityChip = (severity) => {
    const severityMap = {
      'LEVE': { label: 'Leve', color: 'bg-green-100 text-green-800 border-green-200' },
      'MODERADA': { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'CRITICA': { label: 'Crítica', color: 'bg-red-100 text-red-800 border-red-200' }
    };

    const severityInfo = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${severityInfo.color}`}>
        {severityInfo.label}
      </span>
    );
  };

  const getTypeMaintenanceChip = (typeMaintenance) => {
    const typeMap = {
      'TECNICA': { label: 'Técnica', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'OPERATIVA': { label: 'Operativa', color: 'bg-green-100 text-green-800 border-green-200' },
      'LOCATIVA': { label: 'Locativa', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      'SST': { label: 'SST', color: 'bg-purple-100 text-purple-800 border-purple-200' }
    };

    const typeInfo = typeMap[typeMaintenance] || { label: typeMaintenance, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  const getAssignedToChip = (assignedTo) => {
    const assignedMap = {
      'TECNICA': { label: 'Técnica', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'OPERATIVA': { label: 'Operativa', color: 'bg-green-100 text-green-800 border-green-200' }
    };

    const assignedInfo = assignedMap[assignedTo] || { label: assignedTo || 'Sin asignar', color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${assignedInfo.color}`}>
        {assignedInfo.label}
      </span>
    );
  };

  const getRecurringInfo = (isRecurring, recurrenceCount) => {
    if (!isRecurring) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium border bg-gray-100 text-gray-800 border-gray-200">
          Nueva
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-sm font-medium border bg-orange-100 text-orange-800 border-orange-200">
        {recurrenceCount}ª vez
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para determinar el tipo de falla
  const getFailureTypeInfo = () => {
    const hasChecklistItem = !!failureDetail?.checklist_item_id;
    const hasAffectedItem = !!failureDetail?.affected_id;

    if (hasChecklistItem) {
      return {
        type: 'Checklist',
        description: 'Falla reportada desde checklist',
        color: 'bg-purple-100 text-purple-800'
      };
    } else if (hasAffectedItem && !hasChecklistItem) {
      return {
        type: 'Dispositivo',
        description: 'Falla en dispositivo/equipo específico',
        color: 'bg-orange-100 text-orange-800'
      };
    } else {
      return {
        type: 'Independiente',
        description: 'Falla reportada independientemente',
        color: 'bg-indigo-100 text-indigo-800'
      };
    }
  };

  const SignatureImage = ({src, alt, className}) => {
    return src ? (
      <img src={src} alt={alt} className={className} />
    ) : null;
  };

  if (!show) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-purple-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Cargando detalle...</p>
          </div>
        </div>
      </div>
    );
  }

  const failureTypeInfo = getFailureTypeInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                📋 Detalle de Orden de Falla
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-800">
                    OF: {failureDetail?.failure_order_id || `OF-${failureDetail?.id}`}
                  </span>
                </div>
                {failureDetail?.repairExecution && (
                  <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-blue-800">
                      AR: {failureDetail.repairExecution.repair_execution_id}
                    </span>
                  </div>
                )}
                {failureDetail?.workOrder && (
                  <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-800">
                      OT: {failureDetail.workOrder.work_order_id || `OT-${failureDetail.workOrder.id}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Botón Firmar Reporte — visible cuando no hay firma */}
              {!loading && failureDetail && !failureDetail.report_signature && (
                <button
                  onClick={handleSignReport}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium flex items-center gap-2"
                  title="Esta falla no tiene firma de reporte"
                >
                  <span>✍️</span>
                  <span>Firmar Reporte</span>
                </button>
              )}

              {!loading && failureDetail && getExecutionStatus() !== 'RESUELTA' && getExecutionStatus() !== 'CANCELADO' && (
                <button
                  onClick={() => setShowManageModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <span>🔧</span>
                  <span>Gestionar Falla</span>
                </button>
              )}

              {!loading && failureDetail && getExecutionStatus() === 'RESUELTA' && (
                <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-medium flex items-center gap-2">
                  <span>✅</span>
                  <span>Falla Resuelta</span>
                </div>
              )}

              {!loading && failureDetail && getExecutionStatus() === 'CANCELADO' && (
                <button
                  onClick={handleReactivate}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
                >
                  <span>↩️</span>
                  <span>Reactivar falla</span>
                </button>
              )}

              {!loading && failureDetail && getExecutionStatus() !== 'CANCELADO' && getExecutionStatus() !== 'RESUELTA' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2"
                  title="Cancelar falla (conserva historial)"
                >
                  <span>🚫</span>
                  <span>Cancelar</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Información Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Información General */}
            <div className="lg:col-span-2 bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>Información General
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Descripción Completa</label>
                  <div className="bg-white p-4 rounded border text-gray-900 leading-relaxed">
                    {failureDetail?.description}
                  </div>
                </div>

                {/* Campos principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Severidad</label>
                    <div className="mt-1">{getSeverityChip(failureDetail?.severity)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de Mantenimiento</label>
                    <div className="mt-1">{getTypeMaintenanceChip(failureDetail?.type_maintenance)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Área Asignada</label>
                    <div className="mt-1">{getAssignedToChip(failureDetail?.assigned_to)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Cantidad de Veces Mantenida</label>
                    <div className="mt-1">{getRecurringInfo(failureDetail?.is_recurring, failureDetail?.recurrence_count)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">ID Interno</label>
                    <div className="mt-1">
                      <span className="px-3 py-1 rounded-full text-sm font-medium border bg-gray-100 text-gray-800 border-gray-200">
                        #{failureDetail?.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Reporte y Contexto */}
            <div className="space-y-6">
              {/* Información del Reporte */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span>Información del Reporte
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Reportado por</label>
                    <p className="text-gray-900 bg-white p-3 rounded border font-medium">
                      {failureDetail?.reporter?.user_name || 'Desconocido'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Fecha de Reporte</label>
                    <p className="text-gray-900 bg-white p-3 rounded border text-sm">
                      {formatDate(failureDetail?.createdAt)}
                    </p>
                  </div>
                  {failureDetail?.updatedAt && failureDetail?.updatedAt !== failureDetail?.createdAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Última Actualización</label>
                      <p className="text-gray-900 bg-white p-3 rounded border text-sm">
                        {formatDate(failureDetail.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contexto de la Falla */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🔍</span>Contexto de la Falla
                </h3>
                <div className="space-y-3">
                  {/* Tipo de falla */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Falla</label>
                    <div className="bg-white p-3 rounded border">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${failureTypeInfo.color}`}>
                          {failureTypeInfo.type}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs mt-1">{failureTypeInfo.description}</p>
                    </div>
                  </div>

                  {/* Información de checklist */}
                  {failureDetail?.checklistItem && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Pregunta del Checklist</label>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-gray-900 text-sm font-medium">{failureDetail.checklistItem.question_text}</p>
                        {failureDetail.checklistItem.item_number && (
                          <p className="text-gray-600 text-xs mt-1">Ítem #{failureDetail.checklistItem.item_number}</p>
                        )}
                        {failureDetail.checklistItem.guidance_text && (
                          <p className="text-gray-500 text-xs mt-1">Guía: {failureDetail.checklistItem.guidance_text}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Información de dispositivo */}
                  {failureDetail?.affectedInspectable && !failureDetail?.checklistItem && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Dispositivo Afectado</label>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-gray-900 font-medium">{failureDetail.affectedInspectable.name}</p>
                        <p className="text-gray-600 text-sm">
                          Tipo: {failureDetail.affectedInspectable.type_code || 'No especificado'}
                        </p>
                        {failureDetail.affectedInspectable.description && (
                          <p className="text-gray-500 text-xs mt-1">{failureDetail.affectedInspectable.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ P7: Alerta sin firma de reporte */}
          {!loading && failureDetail && !failureDetail.report_signature && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 flex items-start gap-3">
              <span className="text-yellow-500 text-xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-yellow-800 text-sm">Falla sin firma de reporte</p>
                <p className="text-yellow-700 text-xs mt-0.5">Esta orden no tiene firma de reporte. Puedes firmarla en la sección de firmas.</p>
              </div>
            </div>
          )}

          {/* ✅ P6: Alerta sin inspectable */}
          {!failureDetail?.affected_id && (
            <div className="mb-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4 flex items-start gap-3">
              <span className="text-orange-500 text-xl mt-0.5">🔧</span>
              <div className="flex-1">
                <p className="font-semibold text-orange-800 text-sm">Sin dispositivo asociado</p>
                <p className="text-orange-700 text-xs mt-0.5">Esta falla no tiene ningún dispositivo/atracción asignado.</p>
              </div>
              {(user?.role_id === 1 || user?.role_id === 2) && (
                <button onClick={handleOpenAssignInspectable}
                  className="shrink-0 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs font-semibold">
                  Asignar Dispositivo
                </button>
              )}
            </div>
          )}

          {/* Cancelación registrada */}
          {getExecutionStatus() === 'CANCELADO' && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Información de cancelación</h4>
              <p className="text-sm text-red-700 mb-2">
                Esta falla fue cancelada y permanece en el historial.
              </p>
              {failureDetail?.repairExecution?.cancellation_reason || failureDetail?.workOrder?.cancellation_reason ? (
                <p className="text-sm text-red-800">
                  <strong>Motivo:</strong> {failureDetail?.repairExecution?.cancellation_reason || failureDetail?.workOrder?.cancellation_reason}
                </p>
              ) : (
                <p className="text-sm text-red-700">No se registró un motivo de cancelación.</p>
              )}
            </div>
          )}

          {/* ✅ P6: Panel asignar inspectable */}
          {showAssignInspectable && (
            <div className="mb-4 bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">🔧 Asignar Dispositivo / Atracción</h4>
              <div className="flex items-center gap-3 flex-wrap">
                <select value={selectedInspectableId} onChange={e => setSelectedInspectableId(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400">
                  <option value="">Seleccionar dispositivo...</option>
                  {inspectablesList.map(ins => (
                    <option key={ins.id} value={ins.id}>{ins.name}{ins.type ? ` (${ins.type})` : ''}</option>
                  ))}
                </select>
                <button onClick={handleAssignInspectable} disabled={!selectedInspectableId || assigningInspectable}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-semibold">
                  {assigningInspectable ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setShowAssignInspectable(false)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Evidencia Fotográfica */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">📸</span>Evidencia Fotográfica
              </h3>
              <button onClick={() => setShowImageUpdate(v => !v)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                {showImageUpdate ? 'Cancelar' : '📷 Actualizar imagen'}
              </button>
            </div>

            {showImageUpdate && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-3">Selecciona la nueva imagen:</p>
                <div className="flex items-start gap-4 flex-wrap">
                  {newImagePreview ? (
                    <div className="relative">
                      <img src={newImagePreview} alt="Nueva evidencia" className="w-32 h-32 object-cover rounded-lg border shadow" />
                      <button onClick={() => { setNewImageFile(null); setNewImagePreview(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-white hover:bg-blue-50">
                      <span className="text-2xl text-blue-400">📷</span>
                      <span className="text-xs text-blue-600 mt-1">Subir foto</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageFileChange} />
                    </label>
                  )}
                  <div className="flex flex-col gap-2">
                    <button onClick={handleUpdateImage} disabled={!newImageFile || updatingImage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
                      {updatingImage ? 'Guardando...' : '💾 Guardar imagen'}
                    </button>
                    <p className="text-xs text-blue-600">La imagen anterior será reemplazada.</p>
                  </div>
                </div>
              </div>
            )}

            {failureDetail?.evidence_url ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <img
                  src={`${process.env.NEXT_PUBLIC_API || "http://localhost:5000"}${failureDetail.evidence_url}`}
                  alt="Evidencia de la falla"
                  className="max-w-full h-64 object-cover rounded-lg mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API || "http://localhost:5000"}${failureDetail.evidence_url}`, '_blank')}
                />
                <p className="text-center text-gray-500 text-xs mt-2">Clic para ver en tamaño completo</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400 border-2 border-dashed border-gray-200">
                <span className="text-3xl">📷</span>
                <p className="text-sm mt-2">Sin evidencia fotográfica registrada</p>
              </div>
            )}
          </div>

          {/* Información de Acta de Reparación */}
          {failureDetail?.repairExecution && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🧾</span>Acta de Reparación
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-teal-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📋</span>Información de AR
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">ID de AR</label>
                        <p className="text-gray-900 bg-white p-2 rounded border text-sm font-mono">
                          {failureDetail.repairExecution.repair_execution_id}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Estado</label>
                        <p className="text-gray-900 bg-white p-2 rounded border text-sm">
                          {failureDetail.repairExecution.status}
                        </p>
                      </div>
                    </div>

                    {failureDetail.repairExecution.activity_performed && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Actividad Realizada</label>
                        <p className="text-gray-900 bg-white p-3 rounded border text-sm">
                          {failureDetail.repairExecution.activity_performed}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {failureDetail.repairExecution.start_time && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Inicio</label>
                          <p className="text-gray-900 bg-white p-2 rounded border text-xs">
                            {formatDate(failureDetail.repairExecution.start_time)}
                          </p>
                        </div>
                      )}
                      {failureDetail.repairExecution.end_time && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Fin</label>
                          <p className="text-gray-900 bg-white p-2 rounded border text-xs">
                            {formatDate(failureDetail.repairExecution.end_time)}
                          </p>
                        </div>
                      )}
                    </div>

                    {failureDetail.repairExecution.resolver && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Resuelto Por</label>
                        <p className="text-gray-900 bg-white p-2 rounded border text-sm">
                          {failureDetail.repairExecution.resolver.user_name}
                        </p>
                      </div>
                    )}

                    {failureDetail.repairExecution.cancellation_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <label className="text-sm font-medium text-red-700 block mb-1">Motivo de Cancelación</label>
                        <p className="text-red-800 text-sm">
                          {failureDetail.repairExecution.cancellation_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-cyan-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📎</span>Detalles adicionales
                  </h4>
                  <div className="space-y-3">
                    {failureDetail.repairExecution.evidence_url ? (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Evidencia</label>
                        <img
                          src={`${process.env.NEXT_PUBLIC_API || 'http://localhost:5000'}${failureDetail.repairExecution.evidence_url}`}
                          alt="Evidencia AR"
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90"
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API || 'http://localhost:5000'}${failureDetail.repairExecution.evidence_url}`, '_blank')}
                        />
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded border text-center">
                        <p className="text-gray-500 text-sm">No se ha registrado evidencia para esta AR</p>
                      </div>
                    )}

                    {failureDetail.repairExecution.cancelled_at && (
                      <div className="bg-white p-4 rounded border">
                        <label className="text-sm font-medium text-gray-700 block mb-1">Cancelada el</label>
                        <p className="text-gray-900 text-sm">
                          {formatDate(failureDetail.repairExecution.cancelled_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información de OT y Repuestos */}
          {failureDetail?.workOrder && (
            <>
              {/* Sección de Fallas Enlazadas */}
              <LinkedFailuresSection 
                failureId={failure.id}
                currentFailureOrderId={failureDetail.failure_order_id}
                onUnlink={() => {
                  loadFailureDetail();
                  if (onSuccess) onSuccess();
                }}
              />

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🔧</span>Orden de Trabajo y Repuestos
                </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información de OT */}
                <div className="bg-blue-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📋</span>Información de OT
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">ID de OT</label>
                        <p className="text-gray-900 bg-white p-2 rounded border text-sm font-mono">
                          {failureDetail.workOrder.work_order_id || `OT-${failureDetail.workOrder.id}`}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Estado</label>
                        <p className="text-gray-900 bg-white p-2 rounded border text-sm">
                          {failureDetail.workOrder.status}
                        </p>
                      </div>
                    </div>
                    
                    {failureDetail.workOrder.activity_performed && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Actividad Realizada</label>
                        <p className="text-gray-900 bg-white p-3 rounded border text-sm">
                          {failureDetail.workOrder.activity_performed}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {failureDetail.workOrder.start_time && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Inicio</label>
                          <p className="text-gray-900 bg-white p-2 rounded border text-xs">
                            {formatDate(failureDetail.workOrder.start_time)}
                          </p>
                        </div>
                      )}
                      {failureDetail.workOrder.end_time && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Fin</label>
                          <p className="text-gray-900 bg-white p-2 rounded border text-xs">
                            {formatDate(failureDetail.workOrder.end_time)}
                          </p>
                        </div>
                      )}
                    </div>

                    {failureDetail.workOrder.resolver && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Resuelto Por</label>
                        <p className="text-gray-900 bg-white p-2 rounded border text-sm">
                          {failureDetail.workOrder.resolver.user_name}
                        </p>
                      </div>
                    )}

                    {failureDetail.workOrder.evidence_url && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Evidencia</label>
                        <img
                          src={`${process.env.NEXT_PUBLIC_API || "http://localhost:5000"}${failureDetail.workOrder.evidence_url}`}
                          alt="Evidencia OT"
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90"
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API || "http://localhost:5000"}${failureDetail.workOrder.evidence_url}`, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Repuestos Utilizados */}
                <div className="bg-green-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔩</span>Repuestos Utilizados
                  </h4>
                  {failureDetail.workOrder.parts && failureDetail.workOrder.parts.length > 0 ? (
                    <div className="space-y-3">
                      {failureDetail.workOrder.parts.map((workOrderPart, index) => {
                        const quantity = workOrderPart.quantity_used || 0;

                        return (
                          <div key={index} className="bg-white p-4 rounded border">
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600 block">Repuesto</label>
                                <p className="text-gray-900 text-sm font-medium">
                                  {workOrderPart.inventory?.part_name || 'Repuesto desconocido'}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block">Cantidad</label>
                                  <p className="text-gray-900 text-sm">
                                    {quantity}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block">Categoría</label>
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                    {workOrderPart.inventory?.category || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              {workOrderPart.inventory?.location && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block">Ubicación</label>
                                  <p className="text-gray-900 text-xs">
                                    {workOrderPart.inventory.location}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-4 border text-center">
                      <p className="text-gray-500 text-sm">No se han registrado repuestos utilizados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
          )}

          {/* Firmas */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">✍️</span>Firmas del Proceso
            </h3>
            <div className="bg-gray-50 rounded-lg p-5">
              {loadingSignatures ? (
                <p className="text-gray-600 text-sm">Cargando firmas...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* ── 1. FIRMA DE REPORTE ── */}
                  {(() => {
                    const hasReport = !!failureDetail?.report_signature;
                    const reporter = failureDetail?.reporter;
                    const reporterName = reporter?.user_name || 'Desconocido';
                    const reporterRole = reporter?.role?.role_name || reporter?.role_name || `Rol #${reporter?.role_id || '?'}`;
                    return (
                      <div className={`bg-white p-4 rounded-lg border ${!hasReport ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 flex items-center gap-1">
                            <span>📝</span> Reporte
                          </h4>
                          {hasReport
                            ? <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">✅ Firmado</span>
                            : <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-semibold">⚠️ Pendiente</span>
                          }
                        </div>

                        {hasReport ? (
                          <div className="space-y-2">
                            <div className="border rounded overflow-hidden bg-white">
                              <img src={failureDetail.report_signature} alt="Firma de reporte"
                                className="w-full h-16 object-contain" />
                            </div>
                            <div className="text-sm space-y-0.5">
                              <p className="font-semibold text-gray-800">{reporterName}</p>
                              <p className="text-gray-500 text-xs">{reporterRole}</p>
                              <p className="text-gray-400 text-xs">{formatDate(failureDetail?.createdAt)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-gray-500 text-sm mb-2">
                              Reportado por <span className="font-semibold">{reporterName}</span>
                            </p>
                            <button onClick={handleSignReport}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold w-full">
                              ✍️ Firmar Ahora
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── 2. FIRMA DE CIERRE DE OT ── */}
                  {(() => {
                    const wo = failureDetail?.workOrder;
                    const hasWOSig = !!wo?.closure_signature;
                    const resolverName = wo?.resolver?.user_name || null;
                    return (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 flex items-center gap-1">
                            <span>🔧</span> Cierre (OT)
                          </h4>
                          {hasWOSig
                            ? <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">✅ Completada</span>
                            : <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {wo ? 'Pendiente' : 'Sin OT'}
                              </span>
                          }
                        </div>

                        {hasWOSig ? (
                          <div className="space-y-2">
                            <div className="border rounded overflow-hidden bg-white">
                              <img src={wo.closure_signature} alt="Firma de cierre OT"
                                className="w-full h-16 object-contain" />
                            </div>
                            <div className="text-sm space-y-0.5">
                              {resolverName && <p className="font-semibold text-gray-800">{resolverName}</p>}
                              <p className="text-gray-500 text-xs">Técnico / Resolutor</p>
                              {wo.end_time && <p className="text-gray-400 text-xs">{formatDate(wo.end_time)}</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 text-center">
                            {wo ? (
                              <>
                                <p className="text-gray-500 text-sm">Sin firma de cierre de OT</p>
                                {resolverName && <p className="text-gray-400 text-xs mt-1">Resuelto por: {resolverName}</p>}
                              </>
                            ) : (
                              <p className="text-gray-400 text-sm">No existe orden de trabajo</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── 3. FIRMA DE ADMINISTRADOR (Cierre de Falla) ── */}
                  {(() => {
                    const hasAdminSig = !!failureDetail?.admin_signature;
                    const adminName = failureDetail?.adminSigner?.user_name || null;
                    const adminDate = failureDetail?.admin_signature_at;
                    const canSign = user?.role_id === 1 || user?.role_id === 2;
                    return (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 flex items-center gap-1">
                            <span>👑</span> Cierre (Admin)
                          </h4>
                          {hasAdminSig
                            ? <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">✅ Cerrada</span>
                            : <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">⏳ Pendiente</span>
                          }
                        </div>

                        {hasAdminSig ? (
                          <div className="space-y-2">
                            <div className="border rounded overflow-hidden bg-white">
                              <img src={failureDetail.admin_signature} alt="Firma admin"
                                className="w-full h-16 object-contain" />
                            </div>
                            <div className="text-sm space-y-0.5">
                              <p className="font-semibold text-gray-800">{adminName || 'Administrador'}</p>
                              <p className="text-gray-500 text-xs">Administrador / Soporte</p>
                              {adminDate && <p className="text-gray-400 text-xs">{formatDate(adminDate)}</p>}
                            </div>
                            {/* Permitir re-firma al admin */}
                            {canSign && (
                              <button onClick={handleSignAdmin}
                                className="mt-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 w-full">
                                🔄 Re-firmar
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-gray-500 text-sm mb-3">Firma requerida para cerrar la falla</p>
                            {canSign ? (
                              <button onClick={handleSignAdmin}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold w-full flex items-center justify-center gap-2">
                                <span>👑</span> Firmar Cierre de Falla
                              </button>
                            ) : (
                              <p className="text-xs text-gray-400">Solo administradores pueden firmar el cierre</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Firma */}
      {showSignaturePad && (
        <SignaturePad
          show={showSignaturePad}
          onClose={() => setShowSignaturePad(false)}
          onSave={handleSignatureSave}
          title={signatureType === 'ADMIN' ? 'Firma de Administrador' : 'Firma de Reporte'}
        />
      )}

      {/* Modal de Gestión de Falla */}
      {showManageModal && failureDetail && (
        <ManageFailureModal
          show={showManageModal}
          onClose={() => setShowManageModal(false)}
          failure={failureDetail}
          user={user}
          onSuccess={() => {
            setShowManageModal(false);
            loadFailureDetail();
            if (onSuccess) onSuccess();
          }}
        />
      )}

      {showCancelModal && failureDetail && (
        <CancelFailureModal
          show={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          failure={failureDetail}
          onSuccess={() => {
            setShowCancelModal(false);
            onClose();
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
};

export default FailureDetailModal;
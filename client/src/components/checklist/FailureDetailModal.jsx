'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import SignaturePad from './SignaturePad';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import {
  getFailureSignaturesInfo,
  createFailureReportSignature,
  createFailureAdminSignature,
  canUserCreateReportSignature,
  canUserCreateAdminSignature,
  formatSignatureForDisplay,
  getSignatureStatus
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
  const [signaturesInfo, setSignaturesInfo] = useState(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  useEffect(() => {
    if (show && failure) {
      loadFailureDetail();
      loadSignaturesInfo();
    }
  }, [show, failure]);

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

  const loadSignaturesInfo = async () => {
    setLoadingSignatures(true);
    try {
      const info = await getFailureSignaturesInfo(failure.id);
      setSignaturesInfo(info.data);
    } catch (error) {
      console.error('Error cargando información de firmas:', error);
    } finally {
      setLoadingSignatures(false);
    }
  };

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
        await loadSignaturesInfo();
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
    if (!canUserCreateReportSignature(user)) {
      Swal.fire('Error', 'No tienes permisos para crear firma de reporte', 'error');
      return;
    }
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
  const signatureStatus = signaturesInfo ? getSignatureStatus(signaturesInfo) : null;

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
                {failureDetail?.workOrder && (
                  <div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
                    <span className="text-sm font-medium text-purple-800">
                      OT: {failureDetail.workOrder.work_order_id || `OT-${failureDetail.workOrder.id}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ✕
            </button>
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
                    <label className="text-sm font-medium text-gray-700 block mb-2">Cantidad de Veces Recurrida</label>
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

          {/* Evidencia Fotográfica */}
          {failureDetail?.evidence_url && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">📸</span>Evidencia Fotográfica
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <img
                  src={`${process.env.NEXT_PUBLIC_API || "http://localhost:5000"}${failureDetail.evidence_url}`}
                  alt="Evidencia de la falla"
                  className="max-w-full h-64 object-cover rounded-lg mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API || "http://localhost:5000"}${failureDetail.evidence_url}`, '_blank')}
                />
                <p className="text-center text-gray-500 text-xs mt-2">Clic para ver en tamaño completo</p>
              </div>
            </div>
          )}

          {/* Información de OT y Repuestos */}
          {failureDetail?.workOrder && (
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
                    {failureDetail.workOrder.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                        <p className="text-gray-900 bg-white p-3 rounded border text-sm">
                          {failureDetail.workOrder.description}
                        </p>
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
                      {failureDetail.workOrder.parts.map((workOrderPart, index) => (
                        <div key={index} className="bg-white p-4 rounded border">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 block">Repuesto</label>
                              <p className="text-gray-900 text-sm font-medium">
                                {workOrderPart.inventory?.item_name || workOrderPart.inventory?.part_name || 'Repuesto desconocido'}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block">Cantidad Utilizada</label>
                              <p className="text-gray-900 text-sm">
                                {workOrderPart.quantity_used} unidades
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-4 border text-center">
                      <p className="text-gray-500 text-sm">No se han registrado repuestos utilizados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">✍️</span>Firmas del Proceso
            </h3>
            <div className="bg-gray-50 rounded-lg p-5">
              {loadingSignatures ? (
                <p className="text-gray-600">Cargando firmas...</p>
              ) : signatureStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Firma de Reporte */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <span className="mr-2">📝</span>Reporte
                      </h4>
                      {signatureStatus.hasReportSignature ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Firmado</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Pendiente</span>
                      )}
                    </div>

                    {signatureStatus.reportSignature ? (
                      <div className="space-y-2">
                        <div className="w-20 h-12 border rounded overflow-hidden">
                          <SignatureImage
                            src={signatureStatus.reportSignature.image}
                            alt="Firma de reporte"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{signatureStatus.reportSignature.signedBy}</p>
                          <p className="text-gray-600 text-xs">{signatureStatus.reportSignature.role}</p>
                          <p className="text-gray-500 text-xs">{formatDate(signatureStatus.reportSignature.signedAt)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm mb-3">No hay firma de reporte</p>
                        {!signatureStatus.hasReportSignature && signatureStatus.canCreateReportSignature && (
                          <button
                            onClick={handleSignReport}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            ✍️ Firmar Reporte
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Firma de Cierre de OT */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <span className="mr-2">🔧</span>Cierre (OT)
                      </h4>
                      {signatureStatus.hasWorkOrderSignature ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completada</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {failureDetail?.workOrder ? 'Pendiente' : 'Sin OT'}
                        </span>
                      )}
                    </div>

                    {signatureStatus.workOrderSignature ? (
                      <div className="space-y-2">
                        <div className="w-20 h-12 border rounded overflow-hidden">
                          <SignatureImage
                            src={signatureStatus.workOrderSignature.image}
                            alt="Firma de cierre"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{signatureStatus.workOrderSignature.signedBy}</p>
                          <p className="text-gray-600 text-xs">{signatureStatus.workOrderSignature.role}</p>
                          <p className="text-gray-500 text-xs">{formatDate(signatureStatus.workOrderSignature.signedAt)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">
                          {failureDetail?.workOrder ? 'No hay firma de cierre' : 'No existe orden de trabajo'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Firma de Administrador - Cierre de Falla */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <span className="mr-2">👑</span>Cierre de Falla (Admin)
                      </h4>
                      {signatureStatus.hasAdminSignature ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Cerrada</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pendiente Cierre</span>
                      )}
                    </div>

                    {signatureStatus.adminSignature ? (
                      <div className="space-y-2">
                        <div className="w-20 h-12 border rounded overflow-hidden">
                          <SignatureImage
                            src={signatureStatus.adminSignature.image}
                            alt="Firma de cierre de falla"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{signatureStatus.adminSignature.signedBy}</p>
                          <p className="text-gray-600 text-xs">ADMINISTRADOR</p>
                          <p className="text-gray-500 text-xs">{formatDate(signatureStatus.adminSignature.signedAt)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm mb-3">Firma requerida para cierre de falla</p>
                        {!signatureStatus.hasAdminSignature && canUserCreateAdminSignature(user) && (
                          <button
                            onClick={handleSignAdmin}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm w-full flex items-center justify-center"
                          >
                            <i className="fa fa-file-signature mr-2"></i>
                            Firmar Cierre de Falla
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No se pudo cargar la información de firmas</p>
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
    </div>
  );
};

export default FailureDetailModal;
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../AuthContext';
import ChecklistSection from './ChecklistSection';
import SignaturePad from './SignaturePad';
import ValidationErrors from './ValidationErrors';
import ChecklistHeader from './components/ChecklistHeader';
import ChecklistActions from './components/ChecklistActions';
import SignatureList from './SignatureList';
import QrScanHistory from './QrScanHistory';
import WeeklyChecklistBanner from './WeeklyChecklistBanner';
import SupportCreatedBanner from './SupportCreatedBanner';
import Swal from 'sweetalert2';

import { useSimplifiedChecklistData } from './hooks/useSimplifiedChecklistData';
import { useResponseManagement } from './hooks/useResponseManagement';
import { useSignature } from './hooks/useSignature';
import { useChecklistValidation } from './hooks/useChecklistValidation';
import { useChecklistActions } from './hooks/useChecklistActions';
import { useQrCode } from './hooks/useQrCode';
import useFailureRequisitionSystem from './hooks/useFailureRequisitionSystem';
import useSupportContext from './hooks/useSupportContext';
import QrScannerModal from './QrScannerModal';
import CreateFailureWithRequisitionModal from './CreateFailureWithRequisitionModal';
import InventorySearchModal from './InventorySearchModal';
import OperationFailuresSection from './OperationFailuresSection';
import axiosInstance from '../../utils/axiosConfig';

export default function BaseChecklistPage({
  checklistTypeId,
  checklistType,
  config,
  pageTitle,
  breadcrumbItems = [],
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const specificChecklistId = searchParams?.get('checklist_id');

  const { user } = useAuth();
  const [showCreateFailureModal, setShowCreateFailureModal] = useState(false);
  const [showInventorySearchModal, setShowInventorySearchModal] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Estado para checklist cargado directamente por ID (modo soporte)
  const [specificChecklist, setSpecificChecklist] = useState(null);
  const [specificLoading, setSpecificLoading] = useState(false);

  // Cargar checklist específico si viene con checklist_id en la URL (modo soporte)
  useEffect(() => {
    if (!specificChecklistId || !user) return;

    const loadSpecificChecklist = async () => {
      setSpecificLoading(true);
      try {
        const response = await axiosInstance.get(`/api/support/checklists/${specificChecklistId}`);
        if (response.data.success) {
          setSpecificChecklist(response.data.data);
        }
      } catch (error) {
        console.error('Error cargando checklist específico:', error);
        // Si falla, dejar que el flujo normal tome el control
      } finally {
        setSpecificLoading(false);
      }
    };

    loadSpecificChecklist();
  }, [specificChecklistId, user]);

  // Hook normal de datos (se usa cuando NO hay checklist_id específico)
  const originalChecklistData = useSimplifiedChecklistData(
    specificChecklistId ? null : checklistTypeId, // No cargar si ya tenemos uno específico
    specificChecklistId ? null : checklistType
  );

  // Determinar qué checklist usar
  const activeChecklist = specificChecklistId ? specificChecklist : originalChecklistData.checklist;
  const isLoadingData = specificChecklistId ? specificLoading : originalChecklistData.loading;

  // Lógica de checklist viejo (solo aplica cuando NO estamos en modo soporte)
  let isOldDaily = false;
  if (!specificChecklistId && activeChecklist) {
    // Usar checklistTypeDetails (lo que el hook sí retorna) en lugar de checklistType (que no existe)
    const type = originalChecklistData.checklistTypeDetails;
    const frequency = (type?.frequency || activeChecklist.type?.frequency || '').toLowerCase().trim();
    const isWeekly = frequency === 'semanal' || frequency === 'weekly';
    const isFamily = type?.type_category === 'family' || activeChecklist.type?.type_category === 'family';
    const isDaily = frequency === 'diaria' || frequency === 'diario' || frequency === 'daily';
    // Solo tratar como diario si es explícitamente diario Y no es semanal ni de familia
    const shouldBeTreatedAsDaily = isDaily && !isWeekly && !isFamily;

    if (shouldBeTreatedAsDaily) {
      // Usar hora LOCAL (no UTC) para comparar fechas, de lo contrario un checklist
      // creado después de las 7pm Colombia (UTC-5) aparece como "del día siguiente" en UTC
      // y el checklist se cierra incorrectamente mostrando "crear nuevo".
      const createdAt = new Date(activeChecklist.createdAt);
      const instanceDate = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
      const now = new Date();
      const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (instanceDate !== todayDate) {
        isOldDaily = true;
      }
    }
  }

  const checklistData = {
    ...originalChecklistData,
    checklist: specificChecklistId
      ? specificChecklist  // En modo soporte, siempre usar el específico
      : (isOldDaily ? null : activeChecklist),
    loading: isLoadingData,
  };

  const handleCreateChecklist = useCallback(async () => {
    try {
      originalChecklistData.refreshChecklistData();
      Swal.fire('Éxito', 'Checklist creado exitosamente', 'success');
    } catch (error) {
      Swal.fire('Error', 'Error al crear el checklist', 'error');
    }
  }, [originalChecklistData]);

  const responseManager = useResponseManagement(checklistData.checklist);
  const failureSystem = useFailureRequisitionSystem(user);
  const supportContext = useSupportContext();
  const pendingFailuresCount = failureSystem.pendingFailures.length;

  const qrParams = useMemo(() => ({
    checklistId: (checklistData.checklist?.checklist_id && checklistData.checklist?.type?.type_category === 'attraction')
      ? checklistData.checklist.checklist_id : null,
    checklistTypeId: checklistTypeId,
    hasUser: !!user
  }), [checklistData.checklist?.checklist_id, checklistData.checklist?.type?.type_category, checklistTypeId, !!user]);

  const qrManager = useQrCode(qrParams.checklistId, qrParams.checklistTypeId, user);
  const qrUpdateTimeoutRef = useRef(null);

  const handleResponseChangeWithQrUpdate = useCallback((itemId, field, value) => {
    responseManager.handleResponseChange(itemId, field, value);

    if (checklistData.checklist?.type?.type_category === 'attraction' && qrManager.qrValidationEnabled) {
      if (qrUpdateTimeoutRef.current) clearTimeout(qrUpdateTimeoutRef.current);
      qrUpdateTimeoutRef.current = setTimeout(() => {
        qrManager.updateProgressFromResponses(checklistData.checklist?.items, responseManager.itemResponses);
      }, 100);
    }
  }, [checklistData.checklist?.type?.type_category, checklistData.checklist?.items, qrManager, responseManager]);

  useEffect(() => {
    if (checklistData.checklist) {
      responseManager.initializeResponses(checklistData.checklist);

      if (checklistData.checklist.type?.type_category === 'attraction' && qrManager.qrValidationEnabled) {
        setTimeout(() => {
          qrManager.updateProgressFromResponses(checklistData.checklist.items, responseManager.itemResponses);
        }, 200);
      }
    } else if (!checklistData.loading && !specificChecklistId && !config.createInstance && !checklistData.dataConfig?.generateDynamicTemplate && checklistData.checklistTypeDetails) {
      router.push(`/checklists/detail/${checklistTypeId}`);
    }
  }, [
    checklistData.checklist?.checklist_id,
    checklistData.loading,
    config.createInstance,
    checklistTypeId,
    router,
    responseManager.initializeResponses,
    checklistData.checklist?.type?.type_category,
    qrManager.qrValidationEnabled,
    qrManager.updateProgressFromResponses,
    checklistData.checklist?.items,
    specificChecklistId,
  ]);

  useEffect(() => {
    if (checklistData.checklist?.signatures) {
      const hasTechnicalSignature = checklistData.checklist.signatures.some(
        sig => sig.role_id === 7 || sig.role_at_signature === '7' || sig.role?.role_name === 'Tecnico de mantenimiento'
      );
      const hasOperationsSignature = checklistData.checklist.signatures.some(
        sig => sig.role_id === 2 || sig.role_at_signature === '2' || sig.role?.role_name === 'Soporte'
      );
      setIsLocked(hasTechnicalSignature && hasOperationsSignature);
    }
  }, [checklistData.checklist?.signatures]);

  useEffect(() => {
    if (checklistData.checklist?.type?.type_category === 'attraction' && qrManager.qrValidationEnabled) {
      qrManager.updateProgressFromResponses(checklistData.checklist.items, responseManager.itemResponses);
    }
  }, [
    checklistData.checklist?.type?.type_category,
    qrManager.qrValidationEnabled,
    checklistData.checklist?.items,
    responseManager.itemResponses,
    qrManager.updateProgressFromResponses,
  ]);

  const validation = useChecklistValidation(config);
  const { handleDownloadPdf } = useChecklistActions(config, user, checklistTypeId);

  const signatureManager = useSignature(
    user,
    checklistData.checklist,
    () => {
      if (specificChecklistId) {
        // En modo soporte, recargar el checklist específico
        axiosInstance.get(`/api/support/checklists/${specificChecklistId}`)
          .then(r => r.data.success && setSpecificChecklist(r.data.data))
          .catch(console.error);
      } else {
        originalChecklistData.refreshChecklistData();
      }
      responseManager.resetModifications();
    },
    responseManager.hasExistingResponses
  );

  const handleSave = useCallback(async () => {
    // En modo retroactivo (specificChecklistId), usar el endpoint de soporte
    const saveEndpoint = checklistData.checklist
      ? (specificChecklistId
          ? supportContext.getApiUrl(`/api/checklists/${checklistData.checklist.checklist_id}/responses`)
          : `/api/checklists/${checklistData.checklist.checklist_id}/responses`)
      : null;

    const dynamicConfig = {
      ...config,
      saveEndpoint,
      // En modo soporte, pasar impersonate_user_id en el body
      supportContext: specificChecklistId ? supportContext : null,
    };

    if (!user?.token) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }

    const handleSaveSuccess = (success, savedResponses) => {
      if (success) {
        if (savedResponses) {
          responseManager.updateResponseIds(savedResponses);
        }
        responseManager.forceUpdateExistingResponses();

        // Recargar el checklist para que las respuestas del servidor estén disponibles
        // (necesario para que la validación de firma lea datos actualizados)
        if (specificChecklistId) {
          axiosInstance.get(`/api/support/checklists/${specificChecklistId}`)
            .then(r => r.data.success && setSpecificChecklist(r.data.data))
            .catch(console.error);
        } else {
          originalChecklistData.refreshChecklistData();
        }

        if (savedResponses && failureSystem.pendingFailures.length > 0) {
          try {
            const failureResult = failureSystem.createPendingFailuresAfterSave(savedResponses, user);
            if (failureResult.success && failureResult.created.length > 0) {
              Swal.fire({
                title: '¡Checklist y Fallas Creadas!',
                text: `Checklist guardado. Se crearon ${failureResult.created.length} falla(s) automáticamente.`,
                icon: 'success',
                confirmButtonColor: '#7c3aed',
              });
            }
          } catch (error) {
            console.error('Error creando fallas pendientes:', error);
          }
        }
      }
    };

    try {
      responseManager.saveResponses(dynamicConfig, user, checklistTypeId, signatureManager.signature, validation, handleSaveSuccess);
    } catch (error) {
      console.error('Error al guardar:', error);
      Swal.fire({ title: 'Error', text: error.response?.data?.message || 'No se pudo guardar el checklist', icon: 'error' });
    }
  }, [
    config, checklistData.checklist?.checklist_id, user, checklistTypeId,
    signatureManager.signature, validation, responseManager.saveResponses,
    responseManager.updateResponseIds, responseManager.forceUpdateExistingResponses,
    originalChecklistData.refreshChecklistData, failureSystem,
    specificChecklistId, supportContext,
  ]);

  const handleCreateFailureSuccess = (data) => {
    if (data.action === 'open_requisition_modal') setShowInventorySearchModal(true);
  };

  if (isLoadingData || !user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!checklistData.checklist && (config.createInstance || checklistData.dataConfig?.generateDynamicTemplate)) {
    const isFamilyChecklist = checklistData.dataConfig?.generateDynamicTemplate;
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Checklist no encontrado</h2>
            <p className="text-slate-600 mb-6">
              {isFamilyChecklist
                ? 'No se ha generado el checklist de familia para hoy. Haz click para generarlo.'
                : 'No se ha creado un checklist para hoy. Haz click para crearlo.'}
            </p>
            <button
              onClick={handleCreateChecklist}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all"
            >
              {isFamilyChecklist ? 'Generar Checklist de Familia' : 'Crear Checklist'}
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const displayTitle = checklistData.checklist?.type?.type_name || pageTitle;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <ChecklistHeader pageTitle={displayTitle} breadcrumbItems={breadcrumbItems} user={user} />

        {/* Banner para checklists creados por soporte */}
        <SupportCreatedBanner checklistData={checklistData.checklist} />

        {/* Banner para checklists semanales */}
        {checklistData.checklist?.week_info && (
          <WeeklyChecklistBanner weekInfo={checklistData.checklist.week_info} />
        )}

        <div className="space-y-6">
          {pendingFailuresCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="text-orange-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-orange-800">
                    {pendingFailuresCount} Falla{pendingFailuresCount > 1 ? 's' : ''} Programada{pendingFailuresCount > 1 ? 's' : ''}
                  </h5>
                  <p className="text-sm text-orange-700">
                    Se crear{pendingFailuresCount > 1 ? 'án' : 'á'} automáticamente después de enviar el checklist
                  </p>
                </div>
                <button onClick={() => failureSystem.clearPendingFailures()} className="text-orange-600 hover:text-orange-800 text-sm underline">
                  Limpiar
                </button>
              </div>
            </div>
          )}

          <QrScanHistory
            qrScans={qrManager.qrScans}
            qrValidationEnabled={qrManager.qrValidationEnabled}
            totalQrPartitions={qrManager.totalQrPartitions}
            currentPartition={qrManager.currentPartition}
            completedParentItems={qrManager.completedParentItems}
            nextQrRequired={qrManager.qrAuthorizationInfo?.next_qr_required || null}
            nextQrInfo={qrManager.getNextQrInfo()}
          />

          <div className="bg-white rounded-xl shadow-sm p-6">
            <ChecklistSection
              checklist={checklistData.checklist}
              itemResponses={responseManager.itemResponses}
              modifiedResponses={responseManager.modifiedResponses}
              hasExistingResponses={responseManager.hasExistingResponses}
              handleResponseChange={handleResponseChangeWithQrUpdate}
              handleResponseTypeChange={responseManager.handleResponseTypeChange}
              handleFileUpload={() => {}}
              handleMarkAllSiblings={responseManager.handleMarkAllSiblings}
              config={config}
              disabled={false}
              isItemUnlocked={qrManager.isItemUnlocked}
              onUnlockSection={() => qrManager.setShowQrModal(true)}
              user={user}
              isLocked={isLocked}
            />
          </div>

          {(user?.role_id === 3 || user?.role_name?.toLowerCase()?.includes('tecnico')) && (
            <OperationFailuresSection
              checklistId={checklistData.checklist?.checklist_id}
              user={user}
            />
          )}

          <ChecklistActions
            onSign={signatureManager.openSignaturePad}
            onSave={handleSave}
            onDownload={handleDownloadPdf}
            allowDownload={config.allowDownload}
            customActions={[
              ...(config.customActions || []),
              ...(user?.role_id === 3 || user?.role_name?.toLowerCase()?.includes('tecnico') ? [
                {
                  label: '🔧 Nueva Falla con Repuesto',
                  onClick: () => setShowCreateFailureModal(true),
                  className: 'bg-blue-600 hover:bg-blue-700'
                }
              ] : []),
              {
                label: '📋 Ver Mis Fallas',
                onClick: () => router.push('/fallas'),
                className: 'bg-purple-600 hover:bg-purple-700'
              }
            ]}
            disabled={isLocked}
            disableSignature={qrManager.isQrRequired}
            hasExistingResponses={responseManager.hasExistingResponses}
          />

          <SignatureList signatures={checklistData.checklist?.signatures} />
        </div>

        {signatureManager.showSignaturePad && (
          <SignaturePad
            show={signatureManager.showSignaturePad}
            onClose={signatureManager.closeSignaturePad}
            onSave={signatureManager.handleSaveSignature}
          />
        )}

        {showValidationErrors && (
          <ValidationErrors errors={validation.errors} onClose={() => setShowValidationErrors(false)} />
        )}

        <QrScannerModal
          show={qrManager.showQrModal}
          onClose={qrManager.isQrRequired ? null : () => qrManager.setShowQrModal(false)}
          onScanSuccess={qrManager.handleQrScanSuccess}
          checklistTypeId={checklistTypeId}
          checklistId={checklistData.checklist?.checklist_id}
          title="📱 Escanear Código QR de Autorización"
        />

        <CreateFailureWithRequisitionModal
          show={showCreateFailureModal}
          onClose={() => setShowCreateFailureModal(false)}
          onSuccess={handleCreateFailureSuccess}
          checklistResponseId={null}
          checklistItemId={null}
          inspectableId={checklistData.checklist?.inspectable_id}
          checklistData={checklistData}
          responseManager={responseManager}
          failureSystem={failureSystem}
          user={user}
          checklistTypeId={checklistTypeId}
        />

        {showInventorySearchModal && (
          <InventorySearchModal
            show={showInventorySearchModal}
            onClose={() => setShowInventorySearchModal(false)}
            workOrderId={null}
            allowMultiple={true}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../AuthContext';
import ChecklistSection from './ChecklistSection';
import SignaturePad from './SignaturePad';
import ValidationErrors from './ValidationErrors';
import ChecklistHeader from './components/ChecklistHeader';
import ChecklistActions from './components/ChecklistActions';
import FailuresSection from './components/FailuresSection';
import SignatureList from './SignatureList';
import QrScanHistory from './QrScanHistory';
import Swal from 'sweetalert2';

// Importar hooks simplificados y configuración
import { useSimplifiedChecklistData } from './hooks/useSimplifiedChecklistData';
import { useResponseManagement } from './hooks/useResponseManagement';
import { useFileUpload } from './hooks/useFileUpload';
import { useSignature } from './hooks/useSignature';
import { useChecklistValidation } from './hooks/useChecklistValidation';
import { useChecklistActions } from './hooks/useChecklistActions';
import { useQrCode } from './hooks/useQrCode';
import useFailureRequisitionSystem from './hooks/useFailureRequisitionSystem';
import QrScannerModal from './QrScannerModal';
import QrUnlockBar from './QrUnlockBar';

import CreateFailureWithRequisitionModal from './CreateFailureWithRequisitionModal';
import WorkOrderPartsManager from './WorkOrderPartsManager';
import InventorySearchModal from './InventorySearchModal';
import axiosInstance from '../../utils/axiosConfig';

export default function BaseChecklistPage({
  checklistTypeId,
  checklistType,
  config,
  pageTitle,
  pageDescription = '',
  icon = null,
  breadcrumbItems = [],
  preselectedEntity = null,
  customActions = [],
}) {
  // Estados obsoletos eliminados - ahora usa useWorkOrderDetection
  const [showCreateFailureModal, setShowCreateFailureModal] = useState(false);
  const [showInventorySearchModal, setShowInventorySearchModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Determinar la entidad a usar: la pre-seleccionada
  const activeEntity = preselectedEntity

  // Usar el hook simplificado con el tipo de checklist
  const originalChecklistData = useSimplifiedChecklistData(checklistTypeId, checklistType);

  // Lógica para determinar si se debe mostrar el checklist o la opción de crear uno nuevo.
  const instance = originalChecklistData.checklist;
  const type = originalChecklistData.checklistType;
  let isOldDaily = false;

  if (instance && type && type.frequency === 'Diaria') {
    const instanceDate = new Date(instance.createdAt).toISOString().split('T')[0];
    const todayDate = new Date().toISOString().split('T')[0];
    if (instanceDate !== todayDate) {
      isOldDaily = true;
    }
  }

  // Si es un checklist diario de un día anterior, lo tratamos como si no existiera para forzar la creación.
  const checklistData = {
    ...originalChecklistData,
    checklist: isOldDaily ? null : originalChecklistData.checklist,
  };

  const handleCreateChecklist = useCallback(async () => {
    try {
      const result = await originalChecklistData.refreshChecklistData();
      if (result) {
        Swal.fire('Éxito', 'Checklist creado exitosamente', 'success');
      } else {
        Swal.fire('Error', originalChecklistData.error || 'No se pudo crear el checklist', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error al crear el checklist', 'error');
    }
  }, [originalChecklistData]);

  const responseManager = useResponseManagement(checklistData.checklist);

  // Hook para el sistema de fallas y requisiciones (mover arriba antes de su uso)
  const failureSystem = useFailureRequisitionSystem(user);

  // ✅ NUEVO: Mostrar indicador de fallas pendientes
  const pendingFailuresCount = failureSystem.pendingFailures.length;

  // Memoizar los parámetros de QR para evitar re-creaciones innecesarias
  const qrParams = useMemo(() => ({
    checklistId: (checklistData.checklist?.checklist_id && checklistData.checklist?.type?.type_category === 'attraction') ?
      checklistData.checklist.checklist_id : null,
    checklistTypeId: checklistTypeId,
    hasUser: !!user
  }), [checklistData.checklist?.checklist_id, checklistData.checklist?.type?.type_category, checklistTypeId, !!user]);

  // Inicializar hook para códigos QR con parámetros memoizados
  const qrManager = useQrCode(
    qrParams.checklistId,
    qrParams.checklistTypeId,
    user
  );

  const qrUpdateTimeoutRef = useRef(null);

  // Función para manejar cambios en respuestas y actualizar progreso QR
  const handleResponseChangeWithQrUpdate = useCallback((itemId, field, value) => {
    // Primero ejecutar el cambio normal de respuesta
    responseManager.handleResponseChange(itemId, field, value);

    // Luego actualizar el progreso QR si es un checklist de atracción
    if (checklistData.checklist?.type?.type_category === 'attraction' && qrManager.qrValidationEnabled) {
      // Limpiar timeout anterior para evitar múltiples llamadas
      if (qrUpdateTimeoutRef.current) {
        clearTimeout(qrUpdateTimeoutRef.current);
      }

      // Usar setTimeout para permitir que el estado se actualice primero, con debounce
      qrUpdateTimeoutRef.current = setTimeout(() => {
        qrManager.updateProgressFromResponses(
          checklistData.checklist?.items,
          responseManager.itemResponses
        );
      }, 100);
    }
  }, [
    checklistData.checklist?.type?.type_category,
    checklistData.checklist?.items,
    qrManager,
    responseManager
  ]);

  useEffect(() => {
    if (checklistData.checklist) {
      responseManager.initializeResponses(checklistData.checklist);

      // Si es un checklist de atracción, calcular progreso inicial después de inicializar respuestas
      if (checklistData.checklist.type?.type_category === 'attraction' && qrManager.qrValidationEnabled) {
        setTimeout(() => {
          qrManager.updateProgressFromResponses(
            checklistData.checklist.items,
            responseManager.itemResponses
          );
        }, 200);
      }
    } else if (!checklistData.loading && !config.createInstance && !checklistData.dataConfig?.generateDynamicTemplate) {
      // Si no hay checklist y no estamos en modo de creación ni es un checklist de familia, redirigir a la página de detalle
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
    checklistData.checklist?.items
  ]);

  useEffect(() => {
    if (checklistData.checklist?.signatures) {
      const hasTechnicalSignature = checklistData.checklist.signatures.some(
        sig => sig.role_id === 7 || sig.role_at_signature === '7' || sig.role?.role_name === 'Tecnico de mantenimiento'
      );
      const hasOperationsSignature = checklistData.checklist.signatures.some(
        sig => sig.role_id === 2 || sig.role_at_signature === '2' || sig.role?.role_name === 'Soporte'
      );

      if (hasTechnicalSignature && hasOperationsSignature) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    }
  }, [checklistData.checklist?.signatures]);


  // Efecto para monitorear cambios en respuestas y actualizar progreso QR
  useEffect(() => {
    if (checklistData.checklist?.type?.type_category === 'attraction' && qrManager.qrValidationEnabled) {
      // Actualizar progreso cuando cambien las respuestas
      qrManager.updateProgressFromResponses(
        checklistData.checklist.items,
        responseManager.itemResponses
      );
    }
  }, [
    checklistData.checklist?.type?.type_category,
    qrManager.qrValidationEnabled,
    checklistData.checklist?.items,
    responseManager.itemResponses,
    qrManager.updateProgressFromResponses
  ]);


  const validation = useChecklistValidation(config);
  const { handleFileUpload } = useFileUpload(user);
  const { handleDownloadPdf } = useChecklistActions(config, user, checklistTypeId);


  const signatureManager = useSignature(
    user,
    checklistData.checklist,
    () => {
      originalChecklistData.refreshChecklistData();
      responseManager.resetModifications();
    },
    responseManager.hasExistingResponses
  );

  const handleSave = useCallback(async () => {
    // Construir dinámicamente el endpoint usando el checklist_id real
    const dynamicConfig = {
      ...config,
      saveEndpoint: checklistData.checklist ? `/api/checklists/${checklistData.checklist.checklist_id}/responses` : null
    };
    if (!user || !user.token) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }

    const handleSaveSuccess = (success, errors, savedResponses) => {
      if (success && savedResponses) {
        responseManager.updateResponseIds(savedResponses);

        responseManager.forceUpdateExistingResponses();

        // Después de guardar exitosamente, crear fallas pendientes
        if (failureSystem.pendingFailures.length > 0) {
          try {
            console.log('🔧 Creando fallas pendientes después de guardar checklist...');
            console.log('📄 Respuestas guardadas:', savedResponses);
            console.log('⏳ Fallas pendientes:', failureSystem.pendingFailures);
            const failureResult = failureSystem.createPendingFailuresAfterSave(savedResponses, user);

            if (failureResult.success) {
              if (failureResult.created.length > 0) {
                Swal.fire({
                  title: "¡Checklist y Fallas Creadas!",
                  text: `Checklist guardado exitosamente. Se crearon ${failureResult.created.length} falla(s) automáticamente.`,
                  icon: "success",
                  confirmButtonColor: "#7c3aed",
                });
              }
            } else {
              // Mostrar errores pero no bloquear el flujo
              console.error('Errores creando algunas fallas:', failureResult.errors);
              Swal.fire({
                title: "Checklist Guardado",
                text: `El checklist se guardó correctamente, pero hubo errores creando algunas fallas. Revisa la consola para más detalles.`,
                icon: "warning",
                confirmButtonColor: "#f59e0b",
              });
            }
          } catch (error) {
            console.error('Error creando fallas pendientes:', error);
            Swal.fire({
              title: "Checklist Guardado",
              text: "El checklist se guardó correctamente, pero hubo un error procesando las fallas pendientes.",
              icon: "warning",
              confirmButtonColor: "#f59e0b",
            });
          }
        }
      }
    };

    try {
      responseManager.saveResponses(
        dynamicConfig,
        user,
        checklistTypeId,
        signatureManager.signature,
        validation,
        handleSaveSuccess
      );
    } catch (error) {
      console.error('Error al guardar:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo guardar el checklist',
        icon: 'error'
      });
    }
  }, [
    config,
    checklistData.checklist?.checklist_id,
    user,
    checklistTypeId,
    signatureManager.signature,
    validation,
    responseManager.saveResponses,
    responseManager.updateResponseIds,
    responseManager.forceUpdateExistingResponses,
    originalChecklistData.refreshChecklistData,
    failureSystem
  ]);

  const handleCreateFailureSuccess = (data) => {
    if (data.action === 'open_requisition_modal') {
      setShowInventorySearchModal(true);
    } else {
      window.location.reload();
    }
  };

  if (checklistData.loading || !user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  // Si no hay checklist y la configuración indica que se debe crear una instancia o generar dinámicamente, mostrar botón de creación.
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
                : 'No se ha creado un checklist para hoy. Haz click para crearlo.'
              }
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <ChecklistHeader pageTitle={pageTitle} breadcrumbItems={breadcrumbItems} />

        <div className="space-y-6">
          {/* ✅ NUEVO: Mostrar indicador de fallas pendientes */}
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
                <button
                  onClick={() => failureSystem.clearPendingFailures()}
                  className="text-orange-600 hover:text-orange-800 text-sm underline"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}

          {/* Mostrar historial de escaneos QR si existe */}
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
              handleFileUpload={() => { }}
              handleMarkAllSiblings={responseManager.handleMarkAllSiblings}
              config={config}
              disabled={false}
              isItemUnlocked={qrManager.isItemUnlocked}
              onUnlockSection={(item) => qrManager.setShowQrModal(true)}
              user={user}
            />
          </div>

          <ChecklistActions
            onSign={signatureManager.openSignaturePad}
            onSave={handleSave}
            onDownload={handleDownloadPdf}
            allowDownload={config.allowDownload}
            customActions={[
              ...(config.customActions || []),
              {
                label: '🔧 Nueva Falla con Repuesto',
                onClick: () => setShowCreateFailureModal(true),
                className: 'bg-blue-600 hover:bg-blue-700'
              },
              {
                label: '📋 Ver Mis Fallas',
                onClick: () => router.push('/tecnico/fallas'),
                className: 'bg-purple-600 hover:bg-purple-700'
              }
            ]}
            disabled={isLocked || qrManager.isQrRequired}
            hasExistingResponses={responseManager.hasExistingResponses}
          />

          {/* Mostrar la lista de firmas existentes */}
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
          <ValidationErrors
            errors={validation.errors}
            onClose={() => setShowValidationErrors(false)}
          />
        )}

        {/* Modal de escáner QR para checklists de atracción */}
        <QrScannerModal
          show={qrManager.showQrModal}
          onClose={qrManager.isQrRequired ? null : () => qrManager.setShowQrModal(false)}
          onScanSuccess={qrManager.handleQrScanSuccess}
          checklistTypeId={checklistTypeId}
          checklistId={checklistData.checklist?.checklist_id}
          title="📱 Escanear Código QR de Autorización"
        />
        {/* Modal para crear falla con requisición */}
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

        {/* Modal de búsqueda de inventario */}
        {showInventorySearchModal && (
          <InventorySearchModal
            show={showInventorySearchModal}
            onClose={() => setShowInventorySearchModal(false)}
            onPartSelected={(part) => { }}
            onPartNotFound={() => { }}
            workOrderId={null}
            allowMultiple={true}
          />
        )}

      </div>
    </ProtectedRoute>
  );
}

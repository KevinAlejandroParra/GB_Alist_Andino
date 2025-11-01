'use client'

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
import QrScannerModal from './QrScannerModal';
import QrUnlockBar from './QrUnlockBar';
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
  const [pendingFailures, setPendingFailures] = useState([]);
  const [closedFailures, setClosedFailures] = useState([]);
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
        sig => sig.role_id === 4 || sig.role_at_signature === '4' || sig.role?.role_name === 'Jefe de Operaciones'
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

  // Cargar fallas cuando el checklist cambia
  useEffect(() => {
    const fetchFailures = async () => {
      if (!checklistData.checklist?.checklist_id || !user || !user.token) return;

      try {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        const [pendingRes, closedRes] = await Promise.all([
          axiosInstance.get(`${API_URL}/api/work-orders/pending/checklist/${checklistData.checklist.checklist_id}`),
          axiosInstance.get(`${API_URL}/api/work-orders/closed/checklist/${checklistData.checklist.checklist_id}`)
        ]);

        setPendingFailures(pendingRes.data);
        setClosedFailures(closedRes.data);
      } catch (error) {
        console.error("Error al cargar las fallas:", error);
      }
    };

    fetchFailures();
  }, [checklistData.checklist?.checklist_id, user]);

  const handleCloseFailure = useCallback(async (failureId, solutionText, responsibleArea) => {
    if (!user || !user.token || !user.user_id) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      await axiosInstance.put(
        `${API_URL}/api/checklists/failures/${failureId}`,
        {
          solution_text: solutionText,
          responsible_area: responsibleArea,
          status: "resuelto",
          closed_by: user.user_id,
        }
      );

      // Actualizar las listas de fallas
      setPendingFailures(prev => prev.filter(f => f.failure_id !== failureId));
      const closedFailure = pendingFailures.find(f => f.failure_id === failureId);
      if (closedFailure) {
        setClosedFailures(prev => [...prev, {
          ...closedFailure,
          status: "resuelto",
          solution_text: solutionText,
          responsible_area: responsibleArea,
          closed_by: user.user_id
        }]);
      }
    } catch (error) {
      console.error("Error al cerrar la falla:", error);
      throw error;
    }
  }, [user]);

  const validation = useChecklistValidation(config);
  const { handleFileUpload } = useFileUpload(user);
  const { handleDownloadPdf } = useChecklistActions(config, user, checklistTypeId);

  // Función para obtener la URL completa de la evidencia
  const getEvidenceUrl = useCallback((filePath) => {
    if (!filePath) return '';
    const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
    return `${API_URL}${filePath}`;
  }, []);
  
  const signatureManager = useSignature(
    user,
    checklistData.checklist,
    () => {
      originalChecklistData.refreshChecklistData();
      responseManager.resetModifications();
    }
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

    await responseManager.saveResponses(
      dynamicConfig,
      user,
      checklistTypeId,
      signatureManager.signature,
      validation,
      (success, errors) => {
        if (!success) {
          setShowValidationErrors(true);
          
          // Si hay errores específicos de validación, mostrarlos con SweetAlert
          if (errors && errors.length > 0) {
            const validationErrors = errors.filter(err =>
              err.message?.includes('comentario') ||
              err.message?.includes('evidencia')
            );
            
            if (validationErrors.length > 0) {
              const firstError = validationErrors[0];
              Swal.fire({
                title: "Campos obligatorios faltantes",
                text: firstError.message || "Debe completar los campos obligatorios",
                icon: "warning",
                confirmButtonColor: "#7c3aed",
              });
            }
          }
        } else {
          setShowValidationErrors(false);
          checklistData.refreshChecklistData();
        }
      }
    );
  }, [
    config,
    checklistData.checklist?.checklist_id,
    user,
    checklistTypeId,
    signatureManager.signature,
    validation,
    responseManager.saveResponses,
    originalChecklistData.refreshChecklistData
  ]);

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
              handleFileUpload={(itemId, file) => handleFileUpload(itemId, file, (uploadedItemId, filePath) => handleResponseChangeWithQrUpdate(uploadedItemId, 'evidence_url', filePath))}
              handleMarkAllSiblings={responseManager.handleMarkAllSiblings}
              config={config}
              getEvidenceUrl={getEvidenceUrl}
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
            customActions={config.customActions}
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

      </div>
    </ProtectedRoute>
  );
}

'use client'

import React, { useState, useEffect } from 'react';
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
import Swal from 'sweetalert2';

// Importar todos los hooks
import { useChecklistData } from './hooks/useChecklistData';
import { useResponseManagement } from './hooks/useResponseManagement';
import { useFileUpload } from './hooks/useFileUpload';
import { useSignature } from './hooks/useSignature';
import { useChecklistValidation } from './hooks/useChecklistValidation';
import { useChecklistActions } from './hooks/useChecklistActions';
import axiosInstance from '../../utils/axiosConfig';

export default function BaseChecklistPage({
  checklistTypeId,
  config,
  pageTitle,
  breadcrumbItems = [],
  preselectedEntity = null, // Nueva prop
}) {
  const [pendingFailures, setPendingFailures] = useState([]);
  const [closedFailures, setClosedFailures] = useState([]);
  const router = useRouter();
  const { user } = useAuth();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  
  
  // Determinar la entidad a usar: la pre-seleccionada
  const activeEntity = preselectedEntity 

  const originalChecklistData = useChecklistData(checklistTypeId, {
    ...config,
    selectedEntity: activeEntity,
  });

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

  const handleCreateChecklist = async () => {
    try {
      const result = await checklistData.fetchChecklistData();
      if (result) {
        Swal.fire('Éxito', 'Checklist creado exitosamente', 'success');
      } else {
        Swal.fire('Error', checklistData.error || 'No se pudo crear el checklist', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error al crear el checklist', 'error');
    }
  };

  const responseManager = useResponseManagement(checklistData.checklist);

  useEffect(() => {
    if (checklistData.checklist) {
      responseManager.initializeResponses(checklistData.checklist);
    } else if (!checklistData.loading && !config.createInstance) {
      // Si no hay checklist y no estamos en modo de creación, redirigir a la página de detalle
      router.push(`/checklists/detail/${checklistTypeId}`);
    }
  }, [checklistData.checklist, checklistData.loading, config.createInstance, checklistTypeId, responseManager.initializeResponses, router]);

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

  // Cargar fallas cuando el checklist cambia
  useEffect(() => {
    const fetchFailures = async () => {
      if (!checklistData.checklist?.checklist_id) return;

      try {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        const [pendingRes, closedRes] = await Promise.all([
          axiosInstance.get(`${API_URL}/api/checklists/failures/pending/${checklistData.checklist.checklist_id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          }),
          axiosInstance.get(`${API_URL}/api/checklists/failures/closed/${checklistData.checklist.checklist_id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          })
        ]);

        setPendingFailures(pendingRes.data);
        setClosedFailures(closedRes.data);
      } catch (error) {
        console.error("Error al cargar las fallas:", error);
      }
    };

    fetchFailures();
  }, [checklistData.checklist?.checklist_id, user.token]);

  const handleCloseFailure = async (failureId, solutionText, responsibleArea) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      await axiosInstance.put(
        `${API_URL}/api/checklists/failures/${failureId}`,
        {
          solution_text: solutionText,
          responsible_area: responsibleArea,
          status: "resuelto",
          closed_by: user.user_id,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
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
  };

  const validation = useChecklistValidation(config);
  const { handleFileUpload } = useFileUpload(user);
  const { handleDownloadPdf } = useChecklistActions(config, user, checklistTypeId);

  // Función para obtener la URL completa de la evidencia
  const getEvidenceUrl = (filePath) => {
    if (!filePath) return '';
    const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
    return `${API_URL}${filePath}`;
  };
  
  const signatureManager = useSignature(
    user,
    checklistData.checklist,
    () => {
      checklistData.refreshChecklistData();
      responseManager.resetModifications();
    }
  );

  const handleSave = async () => {
    // Construir dinámicamente el endpoint usando el checklist_id real
    const dynamicConfig = {
      ...config,
      saveEndpoint: checklistData.checklist ? `/api/checklists/${checklistData.checklist.checklist_id}/responses` : null
    };
    await responseManager.saveResponses(
      dynamicConfig,
      user,
      checklistTypeId,
      signatureManager.signature,
      validation,
      (success, errors) => {
        if (!success) {
          setShowValidationErrors(true);
        } else {
          setShowValidationErrors(false);
          checklistData.refreshChecklistData();
        }
      }
    );
  };


  if (checklistData.loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  // Si no hay checklist y la configuración indica que se debe crear una instancia, mostrar botón de creación.
  if (!checklistData.checklist && config.createInstance) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Checklist no encontrado</h2>
            <p className="text-slate-600 mb-6">No se ha creado un checklist para hoy. Haz click para crearlo.</p>
            <button
              onClick={handleCreateChecklist}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all"
            >
              Crear Checklist
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
          <div className="bg-white rounded-xl shadow-sm p-6">
            <ChecklistSection
              checklist={checklistData.checklist}
              itemResponses={responseManager.itemResponses}
              modifiedResponses={responseManager.modifiedResponses}
              hasExistingResponses={responseManager.hasExistingResponses}
              handleResponseChange={responseManager.handleResponseChange}
              handleResponseTypeChange={responseManager.handleResponseTypeChange}
              handleFileUpload={(itemId, file) => handleFileUpload(itemId, file, (uploadedItemId, filePath) => responseManager.handleResponseChange(uploadedItemId, 'evidence_url', filePath))}
              handleMarkAllSiblings={responseManager.handleMarkAllSiblings}
              config={config}
              getEvidenceUrl={getEvidenceUrl} // Pasar la función getEvidenceUrl
            />
          </div>

          <ChecklistActions
            onSign={signatureManager.openSignaturePad}
            onSave={handleSave}
            onDownload={handleDownloadPdf}
            allowDownload={config.allowDownload}
            customActions={config.customActions}
            disabled={isLocked}
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
      </div>
    </ProtectedRoute>
  );
}
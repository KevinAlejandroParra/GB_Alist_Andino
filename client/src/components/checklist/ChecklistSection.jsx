"use client";
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';
import GuidanceTextModal from './GuidanceTextModal';
import CloseFailureModal from './CloseFailureModal';
import { formatLocalDate, formatLocalDateTime } from '../../utils/dateUtils';

// Componente recursivo para renderizar ítems y sub-ítems
const ChecklistItemRenderer = ({
  item,
  level = 0,
  itemResponses,
  handleResponseChange,
  handleResponseTypeChange,
  handleFileUpload,
  getEvidenceUrl,
  handleMarkAllSiblings,
  isFamilyChecklist,
  config,
}) => {
  if (!handleResponseTypeChange) {
    console.error('handleResponseTypeChange is undefined in ChecklistItemRenderer for item:', item);
    return null;
  }
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);

  const uniqueId = item.unique_frontend_id || item.checklist_item_id;
  const currentResponse = itemResponses[uniqueId];

  const getUniqueItemId = (item) => item.unique_frontend_id || item.checklist_item_id;

  return (
    <div
      style={{ marginLeft: `${level * 20}px` }}
      className={`mb-4 ${item.input_type === "section" || item.subItems?.length > 0 ? "bg-gray-100 p-3 rounded-md" : "border border-gray-200 rounded-lg p-4"}`}
    >
      <div
        className={`flex items-center mb-2 ${item.input_type === "section" || item.subItems?.length > 0 ? "text-lg font-bold text-gray-800" : "text-md font-medium text-gray-900"}`}
      >
        {item.item_number}. {item.question_text}
        {item.guidance_text && (
          <button onClick={() => setShowGuidanceModal(true)} className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none">ℹ️</button>
        )}
        {((item.input_type === "section" || (config?.category === 'Atracción' && item.subItems && item.subItems.length > 0)) && !isFamilyChecklist) && (
          <button
            onClick={() => {
              const firstSubItem = item.subItems[0];
              const firstSubItemUniqueId = getUniqueItemId(firstSubItem);
              const responseTypeToApply = itemResponses[firstSubItemUniqueId]?.response_type || "cumple";
              handleMarkAllSiblings(item.checklist_item_id, item.type?.family_id ? firstSubItem.inspectable_id_for_response : null, responseTypeToApply);
            }}
            className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs"
          >
            Marcar ítems de esta sección como "{itemResponses[getUniqueItemId(item.subItems[0])]?.response_compliance || 'Cumple'}"
          </button>
        )}
      </div>
      
      {item.guidance_text && showGuidanceModal && (
        <GuidanceTextModal show={showGuidanceModal} onClose={() => setShowGuidanceModal(false)} guidanceText={item.guidance_text} />
      )}

      {item.input_type !== "section" && (
        <div className="border-t border-gray-200 pt-4 mt-2">
          {(() => {
            switch (item.input_type) {
              case 'radio':
                return (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-green-50">
                      <input
                        type="radio"
                        name={`response-${uniqueId}`}
                        value="cumple"
                        className="form-radio h-4 w-4 text-green-600"
                        checked={currentResponse?.response_compliance === "cumple" || false}
                        onChange={() => handleResponseChange(uniqueId, "response_compliance", "cumple")}
                      />
                      <span className="ml-2 text-sm font-medium text-green-700">✅ Cumple</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-yellow-50">
                      <input
                        type="radio"
                        name={`response-${uniqueId}`}
                        value="observación"
                        className="form-radio h-4 w-4 text-yellow-600"
                        checked={currentResponse?.response_compliance === "observación"}
                        onChange={() => handleResponseChange(uniqueId, "response_compliance", "observación")}
                      />
                      <span className="ml-2 text-sm font-medium text-yellow-700">⚠️ Observación</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-red-50">
                      <input
                        type="radio"
                        name={`response-${uniqueId}`}
                        value="no cumple"
                        className="form-radio h-4 w-4 text-red-600"
                        checked={currentResponse?.response_compliance === "no cumple"}
                        onChange={() => handleResponseChange(uniqueId, "response_compliance", "no cumple")}
                      />
                      <span className="ml-2 text-sm font-medium text-red-700">❌ No Cumple</span>
                    </label>
                  </div>
                );
              case 'numeric':
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta Numérica:</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md"
                      value={currentResponse?.response_numeric ?? ''}
                      onChange={(e) => handleResponseChange(uniqueId, "response_numeric", e.target.value)}
                      placeholder="Ingrese un valor numérico"
                    />
                  </div>
                );
              case 'text':
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observación:</label>
                    <textarea
                      className="w-full p-2 border rounded-md"
                      rows="3"
                      value={currentResponse?.response_text ?? ''}
                      onChange={(e) => handleResponseChange(uniqueId, "response_text", e.target.value)}
                      placeholder="Ingrese texto libre"
                    />
                  </div>
                );
              default:
                return <p className="text-sm text-gray-500">Input type '{item.input_type}' no soportado.</p>;
            }
          })()}

          {(currentResponse?.response_compliance === "observación" || currentResponse?.response_compliance === "no cumple") && (
            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario Adicional:</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows="2"
                  value={currentResponse?.comment ?? ""}
                  onChange={(e) => handleResponseChange(uniqueId, "comment", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia:</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="w-full p-2 border rounded-md" 
                  onChange={(e) => handleFileUpload(uniqueId, e.target.files[0])} 
                />
                {currentResponse?.evidence_url && (
                  <div className="mt-2">
                    <p>Vista previa:</p>
                    <img src={getEvidenceUrl(currentResponse.evidence_url)} alt="Evidencia" className="max-w-full h-auto max-h-32 rounded-md"/>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {item.subItems && item.subItems.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          {item.subItems.map((subItem) => (
            <ChecklistItemRenderer
              key={subItem.unique_frontend_id || subItem.checklist_item_id} 
              item={subItem}
              level={level + 1}
              itemResponses={itemResponses}
              handleResponseChange={handleResponseChange}
              handleResponseTypeChange={handleResponseTypeChange}
              handleFileUpload={handleFileUpload}
              getEvidenceUrl={getEvidenceUrl}
              handleMarkAllSiblings={handleMarkAllSiblings}
              isFamilyChecklist={isFamilyChecklist}
              config={config}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente principal
export default function ChecklistSection({
  checklist,
  itemResponses,
  modifiedResponses,
  hasExistingResponses,
  handleResponseChange,
  handleResponseTypeChange,
  handleSubmitResponses,
  handleMarkAllSiblings,
  handleFileUpload,
  getEvidenceUrl,
  error,
  buttonConfig,
  openSignaturePad,
  isFamilyChecklist,
  user,
  config,
}) {
  if (!handleResponseTypeChange) {
    console.error('handleResponseTypeChange is undefined in ChecklistSection');
    return null;
  }
  // Estados
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showCloseFailureModal, setShowCloseFailureModal] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(false);

  // Efectos
  useEffect(() => {
    if (user && checklist?.signatures) {
      // Usar role_id o role_at_signature para mayor precisión
      const hasTechnicalSignature = checklist.signatures.some(
        sig => sig.role_id === 7 || sig.role_at_signature === '7' || sig.role?.role_name === 'Tecnico de mantenimiento'
      );
      const hasOperationsSignature = checklist.signatures.some(
        sig => sig.role_id === 4 || sig.role_at_signature === '4' || sig.role?.role_name === 'Jefe de Operaciones'
      );

      if (hasTechnicalSignature && hasOperationsSignature) {
        setIsLocked(true);
        setLockReason('Este checklist ha sido firmado por el Técnico de mantenimiento y el Jefe de Operaciones.');
      } else {
        setIsLocked(false);
        setLockReason('');
      }
    }
  }, [checklist?.signatures, user]);

  // Handlers para las fallas
  const handleOpenCloseFailureModal = (failure) => {
    setSelectedFailure(failure);
    setShowCloseFailureModal(true);
  };

  const handleCloseFailureModal = () => {
    setShowCloseFailureModal(false);
    setSelectedFailure(null);
  };

  const handleCloseFailureSubmit = async (failureId, solutionText, responsibleArea) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.put(`${API_URL}/api/checklists/failures/${failureId}`, {
        solution_text: solutionText,
        responsible_area: responsibleArea,
        status: "resuelto",
        closed_by: user.user_id,
      }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (response.status === 200) {
        handleCloseFailureModal();
        Swal.fire("¡Falla Cerrada!", "La falla ha sido resuelta exitosamente.", "success");
      }
    } catch (error) {
      console.error("Error cerrando falla:", error);
      Swal.fire("Error", `Error al cerrar la falla: ${error.message}`, "error");
    }
  };

  if (error || !checklist) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Checklist no encontrado</h2>
        <p className="text-gray-700 mb-6">No se encontró un checklist. Haz clic para crear uno.</p>
        <button
          onClick={() => console.log('Crear checklist pendiente de implementación')}
          className="px-8 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Crear Checklist
        </button>
      </div>
    );
  }

  // Función helper compartida
  const getUniqueItemId = (item) => item.unique_frontend_id || item.checklist_item_id;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h2 className="text-2xl font-semibold text-gray-800">
          {checklist?.name || 'Checklist de Inspección'}
        </h2>
        {isLocked && (
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            🔒 Bloqueado
          </div>
        )}
      </div>

      {isLocked && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-4 rounded">
          <p className="font-medium">Checklist bloqueado:</p>
          <p>{lockReason}</p>
        </div>
      )}

      {/* Modales */}
      {showCloseFailureModal && (
        <CloseFailureModal
          show={showCloseFailureModal}
          onClose={handleCloseFailureModal}
          failure={selectedFailure}
          onSubmit={handleCloseFailureSubmit}
          userId={user?.user_id}
        />
      )}

      {showDiagnosisModal && (
        <DiagnosisModal
          show={showDiagnosisModal}
          onClose={() => setShowDiagnosisModal(false)}
          onOpenDiagnosis={() => setShowDiagnosisModal(true)}
          checklist={checklist}
        />
      )}

      {/* Renderizado de ítems o secciones */}
      <div className="space-y-6">
        {isChecklistCollapsed ? (
          <div className="p-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => setIsChecklistCollapsed(false)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              📂 Expandir Checklist
            </button>
          </div>
        ) : (
          <>
            {checklist?.sections?.length > 0 ? (
              checklist.sections.map((section, index) => (
                <div key={getUniqueItemId(section) || `section-${index}`}>
                  <ChecklistItemRenderer
                    item={section}
                    level={0}
                    itemResponses={itemResponses}
                    handleResponseChange={handleResponseChange}
                    handleResponseTypeChange={handleResponseTypeChange}
                    handleFileUpload={handleFileUpload}
                    getEvidenceUrl={getEvidenceUrl} // Pasar getEvidenceUrl aquí
                    handleMarkAllSiblings={handleMarkAllSiblings}
                    isFamilyChecklist={isFamilyChecklist}
                    config={config}
                  />
                </div>
              ))
            ) : (
              checklist?.items?.map((item, index) => (
                <ChecklistItemRenderer
                  key={getUniqueItemId(item) || `item-${index}`}
                  item={item}
                  level={0}
                  itemResponses={itemResponses}
                  handleResponseChange={handleResponseChange}
                  handleResponseTypeChange={handleResponseTypeChange}
                  handleFileUpload={handleFileUpload}
                  getEvidenceUrl={getEvidenceUrl} // Pasar getEvidenceUrl aquí
                  handleMarkAllSiblings={handleMarkAllSiblings}
                  isFamilyChecklist={isFamilyChecklist}
                  config={config}
                />
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No hay ítems disponibles en este checklist.
                </div>
              )
            )}
            <div className="pt-4">
              <button
                onClick={() => setIsChecklistCollapsed(true)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                📄 Colapsar Checklist
              </button>
            </div>
          </>
        )}
      </div>

      {/* Botones de configuración */}
      {!isLocked && buttonConfig && (
        <div className="mt-8 pt-4 border-t flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          {buttonConfig.map((btn) => (
            <button
              key={btn.key || btn.label}
              onClick={btn.onClick}
              disabled={btn.disabled || isLocked}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                btn.variant === 'primary'
                  ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300'
                  : btn.variant === 'danger'
                  ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
                  : 'bg-gray-500 text-white hover:bg-gray-600 disabled:bg-gray-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Botón para abrir diagnóstico solo si es de tipo specific */}
      {!isLocked && checklist?.type?.type_category === 'specific' && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowDiagnosisModal(true)}
            className="text-blue-500 hover:text-blue-700 text-sm underline"
          >
            Ver diagnóstico
          </button>
        </div>
      )}
    </div>
  );
}

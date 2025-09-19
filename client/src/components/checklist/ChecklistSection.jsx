"use client"
import { useState, useEffect } from "react"
import CloseFailureModal from "./CloseFailureModal"
import GuidanceTextModal from "./GuidanceTextModal"
import { formatLocalDate, formatLocalDateTime } from "../../utils/dateUtils"
import axios from "axios"
import Swal from "sweetalert2"

// Componente recursivo para renderizar ítems y sub-ítems (MODIFICADO)
const ChecklistItemRenderer = ({
  item,
  level = 0,
  itemResponses,
  handleResponseChange,
  handleResponseTypeChange,
  handleFileUpload,
  getEvidenceUrl,
  // Nueva prop para marcar hermanos
  handleMarkAllSiblings,
  // Nueva prop para identificar si es un checklist de familia
  isFamilyChecklist,
}) => {
  const isParent = item.input_type === "section" || item.subItems?.length > 0
  const marginLeft = level * 20
  const [showGuidanceModal, setShowGuidanceModal] = useState(false)

  // Usar el ID único del frontend si existe, si no, el ID normal del item.
  const uniqueId = item.unique_frontend_id || item.checklist_item_id;
  const currentResponse = itemResponses[uniqueId];

  // Función de utilidad para obtener el ID único o el ID del ítem
  const getUniqueItemId = (item) => item.unique_frontend_id || item.checklist_item_id;

  return (
    <div
      style={{ marginLeft: `${marginLeft}px` }}
      className={`mb-4 ${isParent ? "bg-gray-100 p-3 rounded-md" : "border border-gray-200 rounded-lg p-4"}`}
    >
      <div
        className={`flex items-center mb-2 ${isParent ? "text-lg font-bold text-gray-800" : "text-md font-medium text-gray-900"}`}
      >
        {item.item_number}. {item.question_text}
        {item.guidance_text && (
          <button onClick={() => setShowGuidanceModal(true)} className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none">ℹ️</button>
        )}
        {/* Botón para marcar todos los hermanos, visible si es una sección con sub-ítems Y NO es un checklist de familia */}
        {isParent && item.subItems && item.subItems.length > 0 && !isFamilyChecklist && (
          <button
            onClick={() => {
              const firstSubItem = item.subItems[0];
              const firstSubItemUniqueId = getUniqueItemId(firstSubItem);
              const responseTypeToApply = itemResponses[firstSubItemUniqueId]?.response_type || "cumple";
              handleMarkAllSiblings(item.checklist_item_id, item.type?.family_id ? firstSubItem.inspectable_id_for_response : null, responseTypeToApply);
            }}
            className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs"
          >
            Marcar ítems de esta sección como "{itemResponses[getUniqueItemId(item.subItems[0])]?.value || 'Cumple'}"
          </button>
        )}
      </div>
      {item.guidance_text && showGuidanceModal && (
        <GuidanceTextModal show={showGuidanceModal} onClose={() => setShowGuidanceModal(false)} guidanceText={item.guidance_text} />
      )}

      {!isParent && (
        <div className="border-t border-gray-200 pt-4 mt-2">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-green-50">
              <input
                type="radio"
                name={`response-${uniqueId}`}
                value="cumple"
                className="form-radio h-4 w-4 text-green-600"
                checked={currentResponse?.response_type === "cumple"}
                onChange={() => handleResponseTypeChange(uniqueId, "cumple")}
              />
              <span className="ml-2 text-sm font-medium text-green-700">✅ Cumple</span>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-yellow-50">
              <input
                type="radio"
                name={`response-${uniqueId}`}
                value="observación"
                className="form-radio h-4 w-4 text-yellow-600"
                checked={currentResponse?.response_type === "observación"}
                onChange={() => handleResponseTypeChange(uniqueId, "observación")}
              />
              <span className="ml-2 text-sm font-medium text-yellow-700">⚠️ Observación</span>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-red-50">
              <input
                type="radio"
                name={`response-${uniqueId}`}
                value="no cumple"
                className="form-radio h-4 w-4 text-red-600"
                checked={currentResponse?.response_type === "no cumple"}
                onChange={() => handleResponseTypeChange(uniqueId, "no cumple")}
              />
              <span className="ml-2 text-sm font-medium text-red-700">❌ No Cumple</span>
            </label>
          </div>

          {(currentResponse?.response_type === "observación" || currentResponse?.response_type === "no cumple") && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario:</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows="2"
                  value={currentResponse?.comment ?? ""}
                  onChange={(e) => handleResponseChange(uniqueId, "comment", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia:</label>
                <input type="file" accept="image/*" className="w-full p-2 border rounded-md" onChange={(e) => handleFileUpload(uniqueId, e.target.files[0])} />
                {currentResponse?.evidence_url && (
                  <div className="mt-2"><p>Vista previa:</p><img src={getEvidenceUrl(currentResponse.evidence_url)} alt="Evidencia" className="max-w-full h-auto max-h-32 rounded-md"/></div>
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
              key={subItem.unique_frontend_id || subItem.checklist_item_id} // Use unique key
              item={subItem}
              level={level + 1}
              itemResponses={itemResponses}
              handleResponseChange={handleResponseChange}
              handleResponseTypeChange={handleResponseTypeChange}
              handleFileUpload={handleFileUpload}
              getEvidenceUrl={getEvidenceUrl}
              // Pasar la prop handleMarkAllSiblings a los sub-ítems
              handleMarkAllSiblings={handleMarkAllSiblings}
              // Pasar la nueva prop isFamilyChecklist a los sub-ítems
              isFamilyChecklist={isFamilyChecklist}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChecklistSection({
  checklist,
  itemResponses,
  modifiedResponses,
  isChecklistCollapsed,
  setIsChecklistCollapsed,
  handleResponseChange,
  handleResponseTypeChange,
  handleSubmitResponses,
  handleSignChecklist,
  handleCreateChecklist,
  handleFileUpload,
  handleMarkAllAsCumple,
  user,
  inspectableId,
  error,
  onFailureClosed,
  // Nueva prop para handleMarkAllSiblings
  handleMarkAllSiblings,
  // Nueva prop para identificar si es un checklist de familia
  isFamilyChecklist,
  // Nueva prop para la configuración del botón de guardar
  buttonConfig,
}) {

  // Lógica para el modal de cerrar fallas (restaurada)
  const [showCloseFailureModal, setShowCloseFailureModal] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);

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
      const response = await axios.put(`${API_URL}/api/checklists/failures/${failureId}`, {
        solution_text: solutionText,
        responsible_area: responsibleArea,
        status: "resuelto",
        closed_by: user.user_id,
      }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.status === 200) {
        if (onFailureClosed) onFailureClosed(failureId);
        handleCloseFailureModal(); // Cerrar el modal después de cerrar la falla
        Swal.fire("¡Falla Cerrada!", "La falla ha sido resuelta exitosamente.", "success"); // Notificación de éxito
      }
    } catch (error) {
      console.error("Error cerrando falla:", error);
      Swal.fire("Error", `Error al cerrar la falla: ${error.message}`, "error"); // Notificación de error
    }
  };


  const getEvidenceUrl = (evidenceUrl) => {
    if (!evidenceUrl) return null
    if (evidenceUrl.startsWith("http")) return evidenceUrl
    const apiBase = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
    return `${apiBase}${evidenceUrl}`
  }

  if (error || !checklist) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Checklist para Inspección #{inspectableId}</h2>
        <p className="text-gray-700 mb-6">No se encontró un checklist. Haz clic para crear uno.</p>
        <button onClick={handleCreateChecklist} className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-md shadow-lg hover:bg-purple-700">
          Crear Checklist
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      <div className="p-6 cursor-pointer flex justify-between items-center" onClick={() => setIsChecklistCollapsed(!isChecklistCollapsed)}>
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Checklist - {formatLocalDate(checklist.date)}</h2>
          <div className="flex gap-6 text-sm text-gray-600">
            <span><span className="font-medium">Tipo:</span> {isFamilyChecklist ? "Checklist de Familia" : "Checklist de Atracción"}</span>
            <span><span className="font-medium">Versión:</span> {checklist.version_label}</span>
          </div>
        </div>
        <div>{isChecklistCollapsed ? "▼" : "▲"}</div>
      </div>

      {!isChecklistCollapsed && (
        <div className="px-6 pb-6 border-t">
          <div className="space-y-4 mt-6">
            <h3 className="text-xl font-semibold text-gray-800">Ítems del Checklist</h3>
            {checklist.items && checklist.items.length > 0 ? (
              checklist.items.map((item) => (
                <ChecklistItemRenderer
                  key={item.unique_frontend_id || item.checklist_item_id}
                  item={item}
                  level={0}
                  itemResponses={itemResponses}
                  handleResponseChange={handleResponseChange}
                  handleResponseTypeChange={handleResponseTypeChange}
                  handleFileUpload={handleFileUpload}
                  getEvidenceUrl={getEvidenceUrl}
                  // Pasar handleMarkAllSiblings al ChecklistItemRenderer
                  handleMarkAllSiblings={handleMarkAllSiblings}
                  // Pasar la nueva prop isFamilyChecklist
                  isFamilyChecklist={isFamilyChecklist}
                />
              ))
            ) : (
              <p>No hay ítems para este checklist.</p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Firmas</h3>
            {checklist.signatures && checklist.signatures.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  {checklist.signatures.map((signature, index) => (
                    <div
                      key={`current-signature-${signature.user_id}-${index}`}
                      className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-200"
                    >
                      <div>
                        <span className="font-medium text-gray-700">{signature.role_at_signature}</span>
                        <span className="text-gray-600 ml-2">por {signature.user?.user_name || "N/A"}</span>
                      </div>
                      <span className="text-sm text-gray-500">{formatLocalDateTime(signature.signed_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No hay firmas para este checklist.</p>
              )}
          </div>

          {/* Sección de Fallas Pendientes (restaurada) */}
          {checklist.pending_failures && checklist.pending_failures.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 mb-6 mt-6">
              <h3 className="text-xl font-semibold text-yellow-800 mb-4">Fallas Pendientes de Días Anteriores</h3>
              {checklist.pending_failures.map((failure) => (
                <div key={failure.failure_id} className="mb-4 pb-4 border-b border-yellow-200 last:border-b-0">
                  <p className="text-gray-800 font-bold">{failure.response.item.question_text}</p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">Descripción:</span> {failure.description}
                  </p>
                  <div className="text-sm text-gray-600 mb-3">
                    <p>
                      <span className="font-semibold">Reportado en:</span>{" "}
                      {formatLocalDate(failure.response.checklist.date)}
                    </p>
                    <p>
                      <span className="font-semibold">Reportado por:</span>{" "}
                      {failure.response.respondedBy ? failure.response.respondedBy.user_name : "No disponible"}
                    </p>
                    <p>
                      <span className="font-semibold">Severidad:</span> {failure.severity}
                    </p>
                  </div>

                  {failure.status === "pendiente" && (
                    <button
                      onClick={() => handleOpenCloseFailureModal(failure)}
                      className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      Cerrar Falla
                    </button>
                  )}
                  {failure.status !== "pendiente" && (
                    <div className="text-sm text-gray-700 mt-2">
                      <p>
                        <span className="font-semibold">Estado:</span> {failure.status}
                      </p>
                      {failure.solution_text && (
                        <p>
                          <span className="font-semibold">Solución:</span> {failure.solution_text}
                        </p>
                      )}
                      {failure.responsible_area && (
                        <p>
                          <span className="font-semibold">Área Responsable:</span> {failure.responsible_area}
                        </p>
                      )}
                      {failure.closed_at && (
                        <p>
                          <span className="font-semibold">Cerrado el:</span> {formatLocalDateTime(failure.closed_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSubmitResponses}
              disabled={buttonConfig.disabled}
              className={`px-6 py-2 font-medium rounded-md transition-colors ${buttonConfig.className}`}
            >
              {buttonConfig.text}
            </button>
            {checklist.status !== "firmado" && user.role_id === 4 && (
                <button
                  onClick={handleSignChecklist}
                  className="px-6 py-2 font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 ml-4"
                >
                  Firmar Checklist
            </button>
              )}
          </div>
        </div>
      )}

      {showCloseFailureModal && selectedFailure && (
        <CloseFailureModal
          show={showCloseFailureModal}
          onClose={handleCloseFailureModal}
          onSubmit={handleCloseFailureSubmit}
          failure={selectedFailure}
        />
      )}
    </div>
  );
}
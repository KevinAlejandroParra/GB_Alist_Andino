"use client"
import { formatLocalDate, formatLocalDateTime } from "../../utils/dateUtils"


export default function DailyChecklistSection({
  checklist,
  itemResponses,
  modifiedResponses,
  isChecklistCollapsed,
  setIsChecklistCollapsed,
  handleResponseChange,
  handleResponseTypeChange,
  handleUpdateFailure,
  handleSubmitResponses,
  handleSignChecklist,
  handleCreateDailyChecklist,
  handleFileUpload,
  user,
  hasExistingResponses,
  inspectableId,
  premiseId,
  error,
}) {
  // Determinar el texto y estilo del botón
const getButtonConfig = () => {
    if (modifiedResponses.size === 0) {
      return {
        text: "Sin Cambios",
        disabled: true,
        className: "bg-gray-400 text-gray-600 cursor-not-allowed"
      }
    }
    
    if (hasExistingResponses) {
      return {
        text: "Actualizar Respuestas",
        disabled: false,
        className: "bg-orange-600 text-white hover:bg-orange-700"
      }
    }
    
    return {
      text: "Guardar Respuestas",
      disabled: false,
      className: "bg-blue-600 text-white hover:bg-blue-700"
    }
  }
  
//configuracion de la url de la evidencia
  const getEvidenceUrl = (evidenceUrl) => {
    if (!evidenceUrl) return null
    if (evidenceUrl.startsWith("http")) return evidenceUrl
    const apiBase = process.env.NEXT_PUBLIC_API
    return `${apiBase}${evidenceUrl}`
  }

  // Si hay error, mostrar opción de crear checklist
  if (error || !checklist) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Checklist Diario para el Inspectable {inspectableId}
        </h2>
        <p className="text-gray-700 mb-6">No se encontró un checklist diario para hoy. Haz clic para crear uno.</p>
        <button
          onClick={handleCreateDailyChecklist}
          className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-md shadow-lg hover:bg-purple-700 transition-colors text-xl"
        >
          Crear Checklist Diario
        </button>
      </div>
    )
  }

  const buttonConfig = getButtonConfig()

  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      <div
        className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50 rounded-t-lg"
        onClick={() => setIsChecklistCollapsed(!isChecklistCollapsed)}
      >
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Checklist Diario - {formatLocalDate(checklist.date)}
          </h2>
          <div className="flex gap-6 text-sm text-gray-600">
            <span>
              <span className="font-medium">Tipo:</span> {checklist.checklist_type_id}
            </span>
            <span>
              <span className="font-medium">Versión:</span> {checklist.version_label}
            </span>
          </div>
        </div>
        <div className="text-2xl text-gray-500">{isChecklistCollapsed ? "▼" : "▲"}</div>
      </div>

      {!isChecklistCollapsed && (
        <div className="px-6 pb-6 border-t border-gray-100">
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
                      <span className="font-semibold">Reportado por:</span> {failure.reporter.user_name}
                    </p>
                  </div>

                  <select
                    className="p-2 border border-gray-300 rounded-md text-sm bg-white"
                    value={failure.status}
                    onChange={(e) => handleUpdateFailure(failure.failure_id, e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 mt-6">
            <h3 className="text-xl font-semibold text-gray-800">Ítems del Checklist</h3>
            {checklist.items && checklist.items.length > 0 ? (
              checklist.items.map((item) => (
                <div key={item.checklist_item_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {item.item_number}. {item.question_text}
                    </h4>
                    {item.guidance_text && <p className="text-sm text-gray-600 italic">{item.guidance_text}</p>}
                  </div>

                  {item.responses && item.responses.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                      <p className="font-medium text-gray-700 mb-2">Respuesta Actual:</p>
                      {item.responses.map((response) => (
                        <div key={response.response_id} className="text-sm">
                          <p className="text-gray-700">
                            <span className="font-medium">Estado:</span>{" "}
                            {response.value === true
                              ? "✅ Cumple"
                              : response.value === false
                                ? "❌ No Cumple"
                                : "⚠️ N/A"}
                          </p>
                          {response.comment && (
                            <p className="text-gray-700 mt-1">
                              <span className="font-medium">Comentario:</span> {response.comment}
                            </p>
                          )}
                          {response.evidence_url && (
                            <div className="mt-2">
                              <p className="font-medium text-gray-700 mb-2">Evidencia:</p>
                              <div className="border border-gray-200 rounded-lg p-2 bg-white">
                                <img
                                  src={getEvidenceUrl(response.evidence_url) || "/placeholder.svg"}
                                  alt="Evidencia del checklist"
                                  className="max-w-full h-auto max-h-64 rounded-md shadow-sm"
                                  onError={(e) => {
                                    e.target.style.display = "none"
                                    e.target.nextSibling.style.display = "block"
                                  }}
                                />
                                <p className="text-red-600 text-sm mt-1" style={{ display: "none" }}>
                                  Error al cargar la imagen
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Registrar/Actualizar Respuesta:</p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 transition-colors">
                        <input
                          type="radio"
                          name={`response-${item.checklist_item_id}`}
                          value="cumple"
                          className="form-radio h-4 w-4 text-green-600"
                          checked={itemResponses[item.checklist_item_id]?.response_type === "cumple"}
                          onChange={() => handleResponseTypeChange(item.checklist_item_id, "cumple")}
                        />
                        <span className="ml-2 text-sm font-medium text-green-700">✅ Cumple</span>
                      </label>

                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-yellow-50 transition-colors">
                        <input
                          type="radio"
                          name={`response-${item.checklist_item_id}`}
                          value="observaciones"
                          className="form-radio h-4 w-4 text-yellow-600"
                          checked={itemResponses[item.checklist_item_id]?.response_type === "observaciones"}
                          onChange={() => handleResponseTypeChange(item.checklist_item_id, "observaciones")}
                        />
                        <span className="ml-2 text-sm font-medium text-yellow-700">⚠️ Observaciones</span>
                      </label>

                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                        <input
                          type="radio"
                          name={`response-${item.checklist_item_id}`}
                          value="no_cumple"
                          className="form-radio h-4 w-4 text-red-600"
                          checked={itemResponses[item.checklist_item_id]?.response_type === "no_cumple"}
                          onChange={() => handleResponseTypeChange(item.checklist_item_id, "no_cumple")}
                        />
                        <span className="ml-2 text-sm font-medium text-red-700">❌ No Cumple</span>
                      </label>
                    </div>

                    {(itemResponses[item.checklist_item_id]?.response_type === "observaciones" ||
                      itemResponses[item.checklist_item_id]?.response_type === "no_cumple") && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comentario{" "}
                            {itemResponses[item.checklist_item_id]?.response_type === "no_cumple"
                              ? "(requerido)"
                              : "(opcional)"}
                            :
                          </label>
                          <textarea
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="2"
                            value={itemResponses[item.checklist_item_id]?.comment ?? ""}
                            onChange={(e) => handleResponseChange(item.checklist_item_id, "comment", e.target.value)}
                            placeholder={
                              itemResponses[item.checklist_item_id]?.response_type === "no_cumple"
                                ? "Describa por qué no cumple..."
                                : "Agregue observaciones adicionales..."
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia (opcional):</label>
                          <input
                            type="file"
                            accept="image/*"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleFileUpload(item.checklist_item_id, e.target.files[0])}
                          />
                          {itemResponses[item.checklist_item_id]?.evidence_url && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700 mb-1">Vista previa:</p>
                              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                                <img
                                  src={
                                    getEvidenceUrl(itemResponses[item.checklist_item_id].evidence_url) ||
                                    "/placeholder.svg"
                                  }
                                  alt="Vista previa de evidencia"
                                  className="max-w-full h-auto max-h-32 rounded-md shadow-sm"
                                  onError={(e) => {
                                    e.target.style.display = "none"
                                    e.target.nextSibling.style.display = "block"
                                  }}
                                />
                                <p className="text-red-600 text-sm mt-1" style={{ display: "none" }}>
                                  Error al cargar la vista previa
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center py-8">No hay ítems para este checklist.</p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Firmas</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {checklist.signatures && checklist.signatures.length > 0 ? (
                <div className="space-y-2">
                  {checklist.signatures.map((signature, index) => (
                    <div
                      key={`current-signature-${signature.user_id}-${index}`}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium text-gray-700">{signature.role_at_signature}</span>
                        <span className="text-gray-600 ml-2">- Usuario ID: {signature.user_id}</span>
                      </div>
                      <span className="text-sm text-gray-500">{formatLocalDateTime(signature.signed_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center">No hay firmas para este checklist.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleSubmitResponses}
              disabled={buttonConfig.disabled}
              className={`px-6 py-2 font-medium rounded-md transition-colors ${buttonConfig.className}`}
            >
              {buttonConfig.text}
            </button>
            {user && user.role_id === 4 && (
              <button
                onClick={handleSignChecklist}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                Firmar Checklist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

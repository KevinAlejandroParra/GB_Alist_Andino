"use client"
import { formatLocalDate, formatLocalDateTime } from "../../utils/dateUtils"
import { useState, useEffect } from "react"

// Modal para cerrar fallas con formulario completo
const CloseFailureModal = ({ show, onClose, onSubmit, failure }) => {
  const [solutionText, setSolutionText] = useState("")
  const [responsibleArea, setResponsibleArea] = useState("")

  if (!show) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(failure.failure_id, solutionText, responsibleArea)
    setSolutionText("")
    setResponsibleArea("")
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Cerrar Falla</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="solutionText" className="block text-sm font-medium text-gray-700">
              Solución:
            </label>
            <textarea
              id="solutionText"
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="responsibleArea" className="block text-sm font-medium text-gray-700">
              Área Responsable:
            </label>
            <select
              id="responsibleArea"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={responsibleArea}
              onChange={(e) => setResponsibleArea(e.target.value)}
              required
            >
              <option value="">Seleccione un área</option>
              <option value="Técnico">Técnico</option>
              <option value="Operación">Operación</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cerrar Falla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para mostrar el guidance_text
const GuidanceTextModal = ({ show, onClose, guidanceText }) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Información Adicional</h3>
        <p className="text-sm text-gray-700 mb-4">{guidanceText}</p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente recursivo para renderizar ítems y sub-ítems
const ChecklistItemRenderer = ({
  item,
  level = 0,
  itemResponses,
  handleResponseChange,
  handleResponseTypeChange,
  handleFileUpload,
  getEvidenceUrl,
  user,
  parentItem,
  parentChildren,
  handleMarkAllSiblings,
}) => {
  const isParent = item.input_type === "section" || item.subItems?.length > 0
  const marginLeft = level * 20 // Ajusta el sangrado según el nivel
  const [showGuidanceModal, setShowGuidanceModal] = useState(false) // Estado para controlar la visibilidad del modal

  const isFirstChildOfParent = parentChildren && parentChildren[0]?.checklist_item_id === item.checklist_item_id
  const currentResponse = itemResponses[item.checklist_item_id]

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
          <button
            onClick={() => setShowGuidanceModal(true)}
            className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
          >
            ℹ️
          </button>
        )}
      </div>
      {item.guidance_text && showGuidanceModal && (
        <GuidanceTextModal
          show={showGuidanceModal}
          onClose={() => setShowGuidanceModal(false)}
          guidanceText={item.guidance_text}
        />
      )}

      {!isParent && (
        <div className="border-t border-gray-200 pt-4 mt-2">
          {isFirstChildOfParent &&
            currentResponse && ( // Muestra el botón solo si es el primer hijo y tiene una respuesta seleccionada
              <div className="mb-4">
                <button
                  onClick={() => handleMarkAllSiblings(parentItem, parentChildren, currentResponse.response_type)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Marcar todos los hermanos como "{currentResponse.response_type}"
                </button>
              </div>
            )}

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
                  {itemResponses[item.checklist_item_id]?.response_type === "no_cumple" ? "(requerido)" : "(opcional)"}:
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
                          "/placeholder.svg" ||
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
      )}

      {item.subItems && item.subItems.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          {item.subItems.map((subItem) => (
            <ChecklistItemRenderer
              key={subItem.checklist_item_id}
              item={subItem}
              level={level + 1}
              itemResponses={itemResponses}
              handleResponseChange={handleResponseChange}
              handleResponseTypeChange={handleResponseTypeChange}
              handleFileUpload={handleFileUpload}
              getEvidenceUrl={getEvidenceUrl}
              user={user}
              parentItem={item}
              parentChildren={item.subItems}
              handleMarkAllSiblings={handleMarkAllSiblings}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DailyChecklistSection({
  checklist,
  itemResponses,
  modifiedResponses,
  isChecklistCollapsed,
  setIsChecklistCollapsed,
  handleResponseChange,
  handleResponseTypeChange,
  handleSubmitResponses,
  handleSignChecklist,
  handleCreateDailyChecklist,
  handleFileUpload,
  user,
  inspectableId,
  premiseId,
  error,
  onFailureClosed, // Nueva prop para notificar cuando se cierra una falla
}) {
  const [showCloseFailureModal, setShowCloseFailureModal] = useState(false)
  const [selectedFailure, setSelectedFailure] = useState(null)
  const [isSignedByAdmin, setIsSignedByAdmin] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  useEffect(() => {
    if (user && checklist?.signatures) {
      const hasSigned = checklist.signatures.some((sig) => sig.user_id === user.user_id)
      setIsSignedByAdmin(hasSigned)
    }
  }, [checklist?.signatures, user])

  const handleAdminSign = async () => {
    setIsSigning(true)
    try {
      await handleSignChecklist() // Llama a la función original
      setIsSignedByAdmin(true)
      window.location.reload() // Recarga la página
    } catch (error) {
      console.error("Error al firmar el checklist:", error)
      alert("Hubo un error al firmar el checklist.")
    } finally {
      setIsSigning(false)
    }
  }

  const handleMarkAllSiblings = (parent, siblings, responseType) => {
    siblings.forEach((sibling) => {
      handleResponseTypeChange(sibling.checklist_item_id, responseType)
    })
  }

  const handleOpenCloseFailureModal = (failure) => {
    setSelectedFailure(failure)
    setShowCloseFailureModal(true)
  }

  const handleCloseFailureModal = () => {
    setShowCloseFailureModal(false)
    setSelectedFailure(null)
  }

  const handleCloseFailureSubmit = async (failureId, solutionText, responsibleArea) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${API_BASE_URL}/api/att-check/failures/${failureId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          solution_text: solutionText,
          responsible_area: responsibleArea,
          status: "resuelto",
          closed_by: user.user_id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("Falla cerrada exitosamente:", result)

      // Notificar al componente padre para refrescar los datos
      if (onFailureClosed) {
        onFailureClosed(failureId)
      }
      handleCloseFailureModal()
    } catch (error) {
      console.error("Error cerrando falla:", error)
      alert(`Error al cerrar la falla: ${error.message}`)
    }
  }

  // Determinar el texto y estilo del botón
  const getButtonConfig = () => {
    if (modifiedResponses.size === 0) {
      return {
        text: "Sin Cambios",
        disabled: true,
        className: "bg-gray-400 text-gray-600 cursor-not-allowed",
      }
    }

    const hasExistingResponses = checklist?.items?.some(
      (item) => item.responses?.[0] && (item.responses[0].value !== null || item.responses[0].comment),
    )

    if (hasExistingResponses) {
      return {
        text: "Actualizar Respuestas",
        disabled: false,
        className: "bg-orange-600 text-white hover:bg-orange-700",
      }
    }

    return {
      text: "Guardar Respuestas",
      disabled: false,
      className: "bg-blue-600 text-white hover:bg-blue-700",
    }
  }

  const getEvidenceUrl = (evidenceUrl) => {
    if (!evidenceUrl) return null
    // Si ya es una URL completa, devolverla tal como está
    if (evidenceUrl.startsWith("http")) return evidenceUrl
    const apiBase = process.env.NEXT_PUBLIC_API || "http://localhost:3000"
    return `${apiBase}${evidenceUrl}`
  }

  // Si hay error, mostrar opción de crear checklist
  if (error || !checklist) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Checklist Diario para la Inspección # {inspectableId}
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

          <div className="space-y-4 mt-6">
            <h3 className="text-xl font-semibold text-gray-800">Ítems del Checklist</h3>
            {checklist.items && checklist.items.length > 0 ? (
              checklist.items.map((item) => (
                <ChecklistItemRenderer
                  key={item.checklist_item_id}
                  item={item}
                  level={0}
                  itemResponses={itemResponses}
                  handleResponseChange={handleResponseChange}
                  handleResponseTypeChange={handleResponseTypeChange}
                  handleFileUpload={handleFileUpload}
                  getEvidenceUrl={getEvidenceUrl}
                  user={user}
                  parentItem={null}
                  parentChildren={checklist.items}
                  handleMarkAllSiblings={handleMarkAllSiblings}
                />
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
                onClick={handleAdminSign}
                disabled={isSignedByAdmin || isSigning}
                className={`px-6 py-2 font-medium rounded-md transition-colors ${
                  isSignedByAdmin || isSigning
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {isSignedByAdmin ? "Firmado" : isSigning ? "Firmando..." : "Firmar Checklist"}
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
  )
}
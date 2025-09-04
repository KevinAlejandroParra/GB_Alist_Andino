"use client"

import React, { useState, useEffect, useCallback } from "react"
import ProtectedRoute from "../../../components/ProtectedRoute"
import { useAuth } from "../../../components/AuthContext"
import axios from "axios"
import Swal from "sweetalert2"
import { useSearchParams } from "next/navigation"
import { formatLocalDate, formatLocalDateTime } from "../../../utils/dateUtils"

export default function InspectableDetailPage({ params: initialParams }) {
  const params = React.use(initialParams) // Desenvuelve la promesa params
  const inspectableId = params.id
  const searchParams = useSearchParams()
  const premiseId = searchParams.get("premiseId")

  const { user, isLoading: authLoading } = useAuth()
  const [checklist, setChecklist] = useState(null)
  const [historicalChecklists, setHistoricalChecklists] = useState([]) // Estado para checklists históricos
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [itemResponses, setItemResponses] = useState({})
  const [modifiedResponses, setModifiedResponses] = useState(new Set())
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(false)
  const [expandedHistoricalChecklists, setExpandedHistoricalChecklists] = useState({})
  const [responsesSaved, setResponsesSaved] = useState(false) // Estado para rastrear si las respuestas han sido guardadas

  const fetchDailyChecklist = useCallback(async () => {
    if (!user || authLoading || !inspectableId) return

    setLoading(true)
    setError(null)

    try {
      const today = new Date()
      const dateString = today.toISOString().split("T")[0]
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"

      const response = await axios.get(
        `${API_URL}/api/att-check/${inspectableId}/checklist/daily?date=${dateString}&role_id=${user.role_id}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )
      setChecklist(response.data)

      const initialResponses = {}
      if (response.data && response.data.items) {
        response.data.items.forEach((item) => {
          const existingResponse = item.responses?.[0]
          initialResponses[item.checklist_item_id] = {
            response_id: existingResponse?.response_id || null,
            value: existingResponse?.value ?? null,
            comment: existingResponse?.comment ?? "",
            evidence_url: existingResponse?.evidence_url ?? "",
            checklist_item_id: item.checklist_item_id,
            response_type:
              existingResponse?.value === true
                ? "cumple"
                : existingResponse?.value === false
                  ? "no_cumple"
                  : existingResponse?.comment
                    ? "observaciones"
                    : null,
          }
        })
      }
      setItemResponses(initialResponses)

      if (response.data && response.data.items) {
        const allAnswered = response.data.items.every(
          (item) => item.responses && item.responses.length > 0 && item.responses[0].value !== null,
        )
        setIsChecklistCollapsed(allAnswered)
      }
    } catch (err) {
      console.error("Error fetching daily checklist:", err)
      setError(err.message || "Failed to fetch daily checklist.")
      Swal.fire("Error", err.message || "Error al cargar el checklist diario", "error")
    } finally {
      setLoading(false)
    }
  }, [inspectableId, user, authLoading])

  const fetchHistoricalChecklists = useCallback(async () => {
    if (!user || authLoading || !inspectableId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const response = await axios.get(`${API_URL}/api/att-check/${inspectableId}/checklists/history`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })
      setHistoricalChecklists(response.data)
    } catch (err) {
      console.error("Error fetching historical checklists:", err)
      // No mostrar un Swal.fire aquí para no interrumpir el flujo principal si solo es un error de carga de historial
    }
  }, [inspectableId, user, authLoading])

  useEffect(() => {
    fetchDailyChecklist()
    fetchHistoricalChecklists() // Llamar a la nueva función
  }, [fetchDailyChecklist, fetchHistoricalChecklists])

  const handleResponseChange = (itemId, field, value) => {
    setItemResponses((prevResponses) => ({
      ...prevResponses,
      [itemId]: {
        ...prevResponses[itemId],
        [field]: value,
      },
    }))
    setModifiedResponses((prev) => new Set(prev).add(itemId))
    setResponsesSaved(false) // Resetear estado guardado cuando el usuario hace cambios
  }

  const handleResponseTypeChange = (itemId, responseType) => {
    setItemResponses((prevResponses) => {
      const currentResponse = prevResponses[itemId] || {}
      let newValue = null

      switch (responseType) {
        case "cumple":
          newValue = true
          break
        case "no_cumple":
          newValue = false
          break
        case "observaciones":
          newValue = true // Las observaciones cuentan como cumple pero con comentarios
          break
        default:
          newValue = null
      }

      return {
        ...prevResponses,
        [itemId]: {
          ...currentResponse,
          response_type: responseType,
          value: newValue,
          // Limpiar comentario y evidencia si se cambia a 'cumple'
          comment: responseType === "cumple" ? "" : currentResponse.comment || "",
          evidence_url: responseType === "cumple" ? "" : currentResponse.evidence_url || "",
        },
      }
    })
    setModifiedResponses((prev) => new Set(prev).add(itemId))
    setResponsesSaved(false) // Resetear estado guardado cuando el usuario hace cambios
  }

  const handleSubmitResponses = async () => {
    if (!user || !checklist) return

    const modifiedResponsesArray = Array.from(modifiedResponses)
    if (modifiedResponsesArray.length === 0) {
      Swal.fire("Info", "No hay cambios para guardar", "info")
      return
    }

    Swal.fire({
      title: "Guardando Respuestas...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const formattedResponses = modifiedResponsesArray.map((itemId) => {
        const response = itemResponses[itemId]
        return {
          checklist_id: checklist.checklist_id,
          checklist_item_id: response.checklist_item_id,
          value: response.value,
          comment: response.comment || null,
          evidence_url: response.evidence_url || null,
        }
      })

      console.log("[v0] Enviando respuestas:", formattedResponses) // Log de debug

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      await axios.post(
        `${API_URL}/api/att-check/checklists/${checklist.checklist_id}/responses`,
        { responses: formattedResponses },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )

      Swal.fire("¡Éxito!", "Respuestas guardadas exitosamente", "success")
      setModifiedResponses(new Set())
      setResponsesSaved(true)
      await fetchDailyChecklist()
    } catch (err) {
      console.error("Error submitting responses:", err)
      Swal.fire("Error", err.response?.data?.error || "Error al guardar respuestas", "error")
    }
  }

  const handleCreateDailyChecklist = async () => {
    if (!user || !premiseId) return // Asegurar que premiseId esté disponible

    Swal.fire({
      title: "Creando Checklist Diario...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const today = new Date()
      const dateString = today.toISOString().split("T")[0]
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"

      await axios.post(
        `${API_URL}/api/att-check/${inspectableId}/checklist/ensure`,
        { premise_id: Number.parseInt(premiseId), date: dateString }, // Usar premiseId dinámico
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )

      Swal.fire("¡Éxito!", "Checklist diario creado exitosamente", "success")
      fetchDailyChecklist()
    } catch (err) {
      console.error("Error creating daily checklist:", err)
      Swal.fire("Error", err.response?.data?.error || "Error al crear checklist diario", "error")
    }
  }

  const handleUpdateFailure = async (failureId, newStatus) => {
    if (!user) return

    Swal.fire({
      title: "Actualizando Falla...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      await axios.put(
        `${API_URL}/api/att-check/failures/${failureId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )

      Swal.fire("¡Éxito!", "Falla actualizada exitosamente", "success")
      fetchDailyChecklist()
      fetchHistoricalChecklists() // Refrescar también el historial por si la falla era de un checklist anterior
    } catch (err) {
      console.error("Error updating failure:", err)
      Swal.fire("Error", err.response?.data?.error || "Error al actualizar falla", "error")
    }
  }

  const handleSignChecklist = async () => {
    if (!user || !checklist) return

    Swal.fire({
      title: "Firmando Checklist...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      await axios.post(
        `${API_URL}/api/att-check/checklists/${checklist.checklist_id}/sign`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )

      Swal.fire("¡Éxito!", "Checklist firmado exitosamente", "success")
      fetchDailyChecklist()
    } catch (err) {
      console.error("Error signing checklist:", err)
      if (err.response?.data?.incompleteItems) {
        const incompleteItems = err.response.data.incompleteItems
        const itemsList = incompleteItems.map((item) => `${item.item_number}. ${item.question_text}`).join("\n")

        Swal.fire({
          title: "Checklist Incompleto",
          html: `<div style="text-align: left;">
            <p>Los siguientes ${incompleteItems.length} ítems deben ser respondidos:</p>
            <div style="max-height: 200px; overflow-y: auto; margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              ${incompleteItems
                .map((item) => `<div style="margin-bottom: 5px;">• ${item.item_number}. ${item.question_text}</div>`)
                .join("")}
            </div>
          </div>`,
          icon: "warning",
          confirmButtonText: "Entendido",
        })
      } else {
        Swal.fire("Error", err.response?.data?.error || "Error al firmar checklist", "error")
      }
    }
  }

  const toggleHistoricalChecklist = (checklistId) => {
    setExpandedHistoricalChecklists((prev) => ({
      ...prev,
      [checklistId]: !prev[checklistId],
    }))
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 p-8 flex justify-center items-center">
          <p className="text-gray-600">Cargando checklist...</p>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Checklist Diario</h1>

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

          <div className="mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Historial de Checklists</h2>
            {historicalChecklists && historicalChecklists.length > 0 ? (
              <div className="space-y-4">
                {historicalChecklists.map((histChecklist) => (
                  <div
                    key={histChecklist.checklist_id}
                    className="bg-white rounded-lg shadow-md border border-gray-200"
                  >
                    <div
                      className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50"
                      onClick={() => toggleHistoricalChecklist(histChecklist.checklist_id)}
                    >
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          Checklist del {formatLocalDate(histChecklist.date)}
                        </h3>
                        <p className="text-gray-700">
                          <span className="font-semibold">Tipo:</span> {histChecklist.type?.name || "N/A"}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-semibold">Creado por:</span> {histChecklist.creator?.user_name || "N/A"}
                        </p>
                      </div>
                      <div className="text-2xl text-gray-500">
                        {expandedHistoricalChecklists[histChecklist.checklist_id] ? "▼" : "▶"}
                      </div>
                    </div>

                    {expandedHistoricalChecklists[histChecklist.checklist_id] && (
                      <div className="px-6 pb-6 border-t border-gray-200">
                        <p className="text-gray-700 mb-4">
                          <span className="font-semibold">Versión:</span> {histChecklist.version_label || "N/A"}
                        </p>

                        <div className="mb-4">
                          <p className="font-semibold text-gray-700 mb-2">Firmas:</p>
                          {histChecklist.signatures && histChecklist.signatures.length > 0 ? (
                            histChecklist.signatures.map((signature, index) => (
                              <p
                                key={`${histChecklist.checklist_id}-signature-${signature.user_id}-${index}`}
                                className="text-sm text-gray-600 ml-2 mb-1"
                              >
                                - {signature.role_at_signature} por {signature.user?.user_name || "N/A"} el{" "}
                                {formatLocalDate(signature.signed_at)}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-gray-600 ml-2">No hay firmas.</p>
                          )}
                        </div>

                        {histChecklist.items && histChecklist.items.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Ítems del Checklist:</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {histChecklist.items.map((item) => (
                                <div key={item.checklist_item_id} className="text-sm bg-gray-50 p-3 rounded">
                                  <p className="font-medium">
                                    {item.item_number}. {item.question_text}
                                  </p>
                                  {item.responses && item.responses.length > 0 && (
                                    <p className="text-gray-600 mt-1">
                                      Respuesta:{" "}
                                      {item.responses[0].value === true
                                        ? "Cumple"
                                        : item.responses[0].value === false
                                          ? "No Cumple"
                                          : "N/A"}
                                      {item.responses[0].comment && ` - ${item.responses[0].comment}`}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No hay checklists históricos para esta atracción.</p>
            )}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!checklist) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Checklist Diario</h1>

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

          <div className="mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Historial de Checklists</h2>
            {historicalChecklists && historicalChecklists.length > 0 ? (
              <div className="space-y-4">
                {historicalChecklists.map((histChecklist) => (
                  <div
                    key={histChecklist.checklist_id}
                    className="bg-white rounded-lg shadow-md border border-gray-200"
                  >
                    <div
                      className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50"
                      onClick={() => toggleHistoricalChecklist(histChecklist.checklist_id)}
                    >
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          Checklist del {formatLocalDate(histChecklist.date)}
                        </h3>
                        <p className="text-gray-700">
                          <span className="font-semibold">Tipo:</span> {histChecklist.type?.name || "N/A"}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-semibold">Creado por:</span> {histChecklist.creator?.user_name || "N/A"}
                        </p>
                      </div>
                      <div className="text-2xl text-gray-500">
                        {expandedHistoricalChecklists[histChecklist.checklist_id] ? "▼" : "▶"}
                      </div>
                    </div>

                    {expandedHistoricalChecklists[histChecklist.checklist_id] && (
                      <div className="px-6 pb-6 border-t border-gray-200">
                        <p className="text-gray-700 mb-4">
                          <span className="font-semibold">Versión:</span> {histChecklist.version_label || "N/A"}
                        </p>

                        <div className="mb-4">
                          <p className="font-semibold text-gray-700 mb-2">Firmas:</p>
                          {histChecklist.signatures && histChecklist.signatures.length > 0 ? (
                            histChecklist.signatures.map((signature, index) => (
                              <p
                                key={`${histChecklist.checklist_id}-signature-${signature.user_id}-${index}`}
                                className="text-sm text-gray-600 ml-2 mb-1"
                              >
                                - {signature.role_at_signature} por {signature.user?.user_name || "N/A"} el{" "}
                                {formatLocalDate(signature.signed_at)}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-gray-600 ml-2">No hay firmas.</p>
                          )}
                        </div>

                        {histChecklist.items && histChecklist.items.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Ítems del Checklist:</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {histChecklist.items.map((item) => (
                                <div key={item.checklist_item_id} className="text-sm bg-gray-50 p-3 rounded">
                                  <p className="font-medium">
                                    {item.item_number}. {item.question_text}
                                  </p>
                                  {item.responses && item.responses.length > 0 && (
                                    <p className="text-gray-600 mt-1">
                                      Respuesta:{" "}
                                      {item.responses[0].value === true
                                        ? "Cumple"
                                        : item.responses[0].value === false
                                          ? "No Cumple"
                                          : "N/A"}
                                      {item.responses[0].comment && ` - ${item.responses[0].comment}`}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No hay checklists históricos para esta atracción.</p>
            )}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checklist Diario</h1>

        <div className="bg-white rounded-lg shadow-md mb-8">
          <div
            className="p-6 cursor-pointer flex justify-between items-center"
            onClick={() => setIsChecklistCollapsed(!isChecklistCollapsed)}
          >
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Información del Checklist</h2>
              <p className="text-gray-700">
                <span className="font-semibold">Tipo de Checklist:</span> {checklist.checklist_type_id}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Versión:</span> {checklist.version_label}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Fecha:</span> {formatLocalDate(checklist.date)}
              </p>
            </div>
            <div className="text-2xl text-gray-500">{isChecklistCollapsed ? "▼" : "▲"}</div>
          </div>

          {!isChecklistCollapsed && (
            <div className="px-6 pb-6">
              {/* Sección de Fallas Pendientes */}
              {checklist.pending_failures && checklist.pending_failures.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Fallas Pendientes de Días Anteriores</h2>
                  {checklist.pending_failures.map((failure) => (
                    <div key={failure.failure_id} className="mb-4 pb-4 border-b border-yellow-200 last:border-b-0">
                      <p className="text-gray-800 font-bold">{failure.response.item.question_text}</p>
                      <p className="text-gray-700">
                        <span className="font-semibold">Descripción:</span> {failure.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Reportado en:</span>{" "}
                        {formatLocalDate(failure.response.checklist.date)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Reportado por:</span> {failure.reporter.user_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Estado actual:</span> {failure.status}
                      </p>

                      <div className="mt-3 flex items-center space-x-2">
                        <label htmlFor={`failure-status-${failure.failure_id}`} className="sr-only">
                          Estado de la falla
                        </label>
                        <select
                          id={`failure-status-${failure.failure_id}`}
                          className="p-2 border border-gray-300 rounded-md text-sm"
                          value={failure.status}
                          onChange={(e) => handleUpdateFailure(failure.failure_id, e.target.value)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En Proceso</option>
                          <option value="resuelto">Resuelto</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Ítems del Checklist</h2>
              {checklist.items && checklist.items.length > 0 ? (
                // Prop key agregada para corregir advertencia de React
                checklist.items.map((item) => (
                  <div
                    key={item.checklist_item_id}
                    className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.item_number}. {item.question_text}
                    </h3>
                    {item.guidance_text && <p className="text-gray-600 italic mb-2">Guía: {item.guidance_text}</p>}

                    {item.responses && item.responses.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-md">
                        <p className="font-semibold text-gray-700">Respuesta Actual:</p>
                        {item.responses.map((response) => (
                          <div key={response.response_id} className="ml-4 border-l-2 pl-4 mt-2">
                            <p className="text-gray-700">
                              Valor:{" "}
                              {response.value === true ? "Cumple" : response.value === false ? "No Cumple" : "N/A"}
                            </p>
                            {response.comment && <p className="text-gray-700">Comentario: {response.comment}</p>}
                            {response.evidence_url && (
                              <p className="text-gray-700">
                                Evidencia:{" "}
                                <a
                                  href={response.evidence_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  Ver
                                </a>
                              </p>
                            )}

                            {response.failures && response.failures.length > 0 && (
                              <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
                                <p className="font-semibold text-red-700">Fallas Asociadas:</p>
                                {response.failures.map((failure) => (
                                  <div key={failure.failure_id} className="ml-4 mt-2">
                                    <p className="text-red-700">- Descripción: {failure.description}</p>
                                    <p className="text-red-700">- Estado: {failure.status}</p>
                                    <p className="text-red-700">- Severidad: {failure.severity || "N/A"}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-lg font-semibold mb-3 text-gray-800">Registrar Respuesta</h4>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Seleccione una opción:</p>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`response-${item.checklist_item_id}`}
                              value="cumple"
                              className="form-radio h-4 w-4 text-green-600"
                              checked={itemResponses[item.checklist_item_id]?.response_type === "cumple"}
                              onChange={() => handleResponseTypeChange(item.checklist_item_id, "cumple")}
                            />
                            <span className="ml-2 text-gray-700 font-medium text-green-700">Cumple</span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`response-${item.checklist_item_id}`}
                              value="observaciones"
                              className="form-radio h-4 w-4 text-yellow-600"
                              checked={itemResponses[item.checklist_item_id]?.response_type === "observaciones"}
                              onChange={() => handleResponseTypeChange(item.checklist_item_id, "observaciones")}
                            />
                            <span className="ml-2 text-gray-700 font-medium text-yellow-700">Observaciones</span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`response-${item.checklist_item_id}`}
                              value="no_cumple"
                              className="form-radio h-4 w-4 text-red-600"
                              checked={itemResponses[item.checklist_item_id]?.response_type === "no_cumple"}
                              onChange={() => handleResponseTypeChange(item.checklist_item_id, "no_cumple")}
                            />
                            <span className="ml-2 text-gray-700 font-medium text-red-700">No Cumple</span>
                          </label>
                        </div>
                      </div>

                      {(itemResponses[item.checklist_item_id]?.response_type === "observaciones" ||
                        itemResponses[item.checklist_item_id]?.response_type === "no_cumple") && (
                        <>
                          <div className="mb-3">
                            <label
                              htmlFor={`comment-${item.checklist_item_id}`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Comentario{" "}
                              {itemResponses[item.checklist_item_id]?.response_type === "no_cumple"
                                ? "(requerido)"
                                : "(opcional)"}
                              :
                            </label>
                            <textarea
                              id={`comment-${item.checklist_item_id}`}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2"
                              rows="3"
                              value={itemResponses[item.checklist_item_id]?.comment ?? ""}
                              onChange={(e) => handleResponseChange(item.checklist_item_id, "comment", e.target.value)}
                              placeholder={
                                itemResponses[item.checklist_item_id]?.response_type === "no_cumple"
                                  ? "Describa por qué no cumple..."
                                  : "Agregue observaciones adicionales..."
                              }
                            ></textarea>
                          </div>

                          <div className="mb-3">
                            <label
                              htmlFor={`evidence-${item.checklist_item_id}`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              URL Evidencia (opcional):
                            </label>
                            <input
                              type="text"
                              id={`evidence-${item.checklist_item_id}`}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2"
                              value={itemResponses[item.checklist_item_id]?.evidence_url ?? ""}
                              onChange={(e) =>
                                handleResponseChange(item.checklist_item_id, "evidence_url", e.target.value)
                              }
                              placeholder="https://ejemplo.com/evidencia.jpg"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No hay ítems para este checklist.</p>
              )}

              <h2 className="text-2xl font-semibold text-gray-800 mb-6 mt-8">Firmas</h2>
              <div className="bg-white rounded-lg shadow-md p-6">
                {checklist.signatures && checklist.signatures.length > 0 ? (
                  // Prop key corregida usando combinación de índice y user_id para unicidad
                  checklist.signatures.map((signature, index) => (
                    <div
                      key={`current-signature-${signature.user_id}-${index}`}
                      className="mb-2 pb-2 border-b last:border-b-0"
                    >
                      <p className="text-gray-700">
                        <span className="font-semibold">Firmado por User ID:</span> {signature.user_id}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">Rol:</span> {signature.role_at_signature}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">Fecha:</span> {formatLocalDateTime(signature.signed_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No hay firmas para este checklist.</p>
                )}
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={handleSubmitResponses}
                  disabled={modifiedResponses.size === 0}
                  className={`px-6 py-3 font-semibold rounded-md shadow-md transition-colors ${
                    modifiedResponses.size === 0
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {modifiedResponses.size === 0 ? "Sin Cambios" : "Guardar Respuestas"}
                </button>
                {user && user.role_id === 4 && (
                  <button
                    onClick={handleSignChecklist}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 transition-colors"
                  >
                    Firmar Checklist
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Historial de Checklists</h2>
          {historicalChecklists && historicalChecklists.length > 0 ? (
            <div className="space-y-4">
              {historicalChecklists.map((histChecklist) => (
                <div key={histChecklist.checklist_id} className="bg-white rounded-lg shadow-md border border-gray-200">
                  <div
                    className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50"
                    onClick={() => toggleHistoricalChecklist(histChecklist.checklist_id)}
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Checklist del {formatLocalDate(histChecklist.date)}
                      </h3>
                      <p className="text-gray-700">
                        <span className="font-semibold">Tipo:</span> {histChecklist.type?.name || "N/A"}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">Creado por:</span> {histChecklist.creator?.user_name || "N/A"}
                      </p>
                    </div>
                    <div className="text-2xl text-gray-500">
                      {expandedHistoricalChecklists[histChecklist.checklist_id] ? "▼" : "▶"}
                    </div>
                  </div>

                  {expandedHistoricalChecklists[histChecklist.checklist_id] && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <p className="text-gray-700 mb-4">
                        <span className="font-semibold">Versión:</span> {histChecklist.version_label || "N/A"}
                      </p>

                      <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-2">Firmas:</p>
                        {histChecklist.signatures && histChecklist.signatures.length > 0 ? (
                          histChecklist.signatures.map((signature, index) => (
                            <p
                              key={`${histChecklist.checklist_id}-signature-${signature.user_id}-${index}`}
                              className="text-sm text-gray-600 ml-2 mb-1"
                            >
                              - {signature.role_at_signature} por {signature.user?.user_name || "N/A"} el{" "}
                              {formatLocalDate(signature.signed_at)}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600 ml-2">No hay firmas.</p>
                        )}
                      </div>

                      {histChecklist.items && histChecklist.items.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Ítems del Checklist:</p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {histChecklist.items.map((item) => (
                              <div key={item.checklist_item_id} className="text-sm bg-gray-50 p-3 rounded">
                                <p className="font-medium">
                                  {item.item_number}. {item.question_text}
                                </p>
                                {item.responses && item.responses.length > 0 && (
                                  <p className="text-gray-600 mt-1">
                                    Respuesta:{" "}
                                    {item.responses[0].value === true
                                      ? "Cumple"
                                      : item.responses[0].value === false
                                        ? "No Cumple"
                                        : "N/A"}
                                    {item.responses[0].comment && ` - ${item.responses[0].comment}`}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No hay checklists históricos para esta atracción.</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

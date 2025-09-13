"use client"

import React, { useState, useEffect, useCallback } from "react"
import ProtectedRoute from "../../../components/ProtectedRoute"
import { useAuth } from "../../../components/AuthContext"
import DailyChecklistSection from "../../../components/AttractionsCl/DailyChecklistSection"
import HistorySection from "../../../components/AttractionsCl/HistorySection"
import axios from "axios"
import Swal from "sweetalert2"
import { useSearchParams } from "next/navigation"

export default function InspectableDetailPage({ params: initialParams }) {
  const params = React.use(initialParams)
  const inspectableId = params.id
  const searchParams = useSearchParams()
  const premiseId = searchParams.get("premiseId")

  const { user, isLoading: authLoading } = useAuth()
  const [checklist, setChecklist] = useState(null)
  const [historicalChecklists, setHistoricalChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [itemResponses, setItemResponses] = useState({})
  const [modifiedResponses, setModifiedResponses] = useState(new Set())
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(false)
  const [expandedHistoricalChecklists, setExpandedHistoricalChecklists] = useState({})
  const [hasExistingResponses, setHasExistingResponses] = useState(false)

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
      let hasResponses = false
      const allAnswerableItems = []

      // Procesar ítems de forma recursiva para inicializar respuestas
      const processItems = (items) => {
        if (!items) return;
        items.forEach((item) => {
          // Si el ítem es contestable (no es una sección), procesar su respuesta.
          if (item.input_type !== "section") {
            const existingResponse = item.responses?.[0];

            if (existingResponse && (existingResponse.value !== null || existingResponse.comment)) {
              hasResponses = true;
            }

            let response_type = null;
            if (existingResponse?.value === "cumple") {
              response_type = "cumple";
            } else if (existingResponse?.value === "no cumple") {
              response_type = "no_cumple";
            } else if (existingResponse?.value === "observación") {
              response_type = "observaciones";
            }

            initialResponses[item.checklist_item_id] = {
              response_id: existingResponse?.response_id || null,
              value: existingResponse?.value ?? null,
              comment: existingResponse?.comment ?? "",
              evidence_url: existingResponse?.evidence_url ?? "",
              checklist_item_id: item.checklist_item_id,
              response_type: response_type,
            };
            allAnswerableItems.push(item);
          }

          // Si el ítem tiene sub-ítems, procesarlos recursivamente.
          if (item.subItems && item.subItems.length > 0) {
            processItems(item.subItems);
          }
        });
      };

      if (response.data && response.data.items) {
        processItems(response.data.items)
      }

      setHasExistingResponses(hasResponses)
      setItemResponses(initialResponses)

      if (allAnswerableItems.length > 0) {
        const allAnswered = allAnswerableItems.every((item) => {
          const res = initialResponses[item.checklist_item_id]
          return res && res.value !== null
        })
        setIsChecklistCollapsed(allAnswered)
      } else {
        setIsChecklistCollapsed(false)
      }
    } catch (err) {
      setError(err.message || "Failed to fetch daily checklist.")
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
    }
  }, [inspectableId, user, authLoading])

  useEffect(() => {
    fetchDailyChecklist()
    fetchHistoricalChecklists()
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
  }

  const handleResponseTypeChange = (itemId, responseType) => {
    setItemResponses((prevResponses) => {
      const currentResponse = prevResponses[itemId] || {}
      let newValue = null

      switch (responseType) {
        case "cumple":
          newValue = "cumple"
          break
        case "no_cumple":
          newValue = "no cumple"
          break
        case "observaciones":
          newValue = "observación"
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
          comment: responseType === "cumple" ? "" : currentResponse.comment || "",
          evidence_url: responseType === "cumple" ? "" : currentResponse.evidence_url || "",
        },
      }
    })
    setModifiedResponses((prev) => new Set(prev).add(itemId))
  }

  const handleFileUpload = async (itemId, file) => {
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      await Swal.fire({
        title: "Tipo de archivo no válido",
        text: "Solo se permiten archivos de imagen (JPEG, PNG, WebP)",
        icon: "warning",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      })
      return
    }

    if (file.size > maxSize) {
      await Swal.fire({
        title: "Archivo muy grande",
        text: "El archivo no debe superar los 5MB",
        icon: "warning",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      })
      return
    }

    try {
      Swal.fire({
        title: "Subiendo archivo...",
        text: "Por favor espera mientras se sube la imagen",
        allowOutsideClick: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
        },
        didOpen: () => {
          Swal.showLoading()
        },
      })

      const formData = new FormData()
      formData.append("evidence", file)

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const response = await axios.post(`${API_URL}/api/att-check/upload-evidence`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      handleResponseChange(itemId, "evidence_url", response.data.filePath)

      await Swal.fire({
        title: "¡Éxito!",
        text: "Archivo subido correctamente",
        icon: "success",
        confirmButtonColor: "#7c3aed",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
        },
      })
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: "Error al subir el archivo. Inténtalo de nuevo.",
        icon: "error",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      })
    }
  }

  const handleSubmitResponses = async () => {
    if (!user || !checklist) return

    const modifiedResponsesArray = Array.from(modifiedResponses)
    if (modifiedResponsesArray.length === 0) {
      await Swal.fire({
        title: "Sin cambios",
        text: "No hay cambios para guardar",
        icon: "info",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      })
      return
    }

    const allItems = new Map()
    const collectItems = (items) => {
      if (!items) return
      items.forEach((item) => {
        allItems.set(item.checklist_item_id, item)
        if (item.subItems) {
          collectItems(item.subItems)
        }
      })
    }
    collectItems(checklist.items)

    const formattedResponses = modifiedResponsesArray
      .map((itemId) => {
        const item = allItems.get(itemId)

        if (!item || item.parent_item_id === null) {
          return null
        }

        const response = itemResponses[itemId]

        if (response.response_type === "no_cumple" && (!response.comment || response.comment.trim() === "")) {
          Swal.fire({
            title: "Comentario requerido",
            text: `El ítem "${item.question_text}" marcado como "No Cumple" requiere un comentario explicativo.`,
            icon: "warning",
            confirmButtonColor: "#7c3aed",
            confirmButtonText: "Entendido",
            customClass: {
              popup: "rounded-2xl shadow-2xl",
              title: "text-slate-800 font-bold",
              content: "text-slate-600",
              confirmButton: "rounded-xl font-semibold px-6 py-3",
            },
          })
          return false
        }

        return {
          checklist_id: checklist.checklist_id,
          checklist_item_id: response.checklist_item_id,
          response_id: response.response_id,
          value: response.value,
          comment: response.comment || null,
          evidence_url: response.evidence_url || null,
        }
      })
      .filter((response) => response !== null)

    if (formattedResponses.includes(false)) {
      return
    }

    if (formattedResponses.length === 0) {
      setModifiedResponses(new Set())
      return
    }

    const actionText = hasExistingResponses ? "Actualizando" : "Guardando"

    Swal.fire({
      title: `${actionText} respuestas...`,
      text: "Por favor espera mientras se procesan las respuestas",
      allowOutsideClick: false,
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-slate-800 font-bold",
        content: "text-slate-600",
      },
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
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

      const successText = hasExistingResponses ? "actualizadas" : "guardadas"
      await Swal.fire({
        title: "¡Éxito!",
        text: `Respuestas ${successText} exitosamente`,
        icon: "success",
        confirmButtonColor: "#7c3aed",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
        },
      })

      setModifiedResponses(new Set())
      setHasExistingResponses(true)
      await fetchDailyChecklist()
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: err.response?.data?.error || "Error al guardar respuestas",
        icon: "error",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      })
    }
  }

  const handleCreateDailyChecklist = async () => {
    if (!user || !premiseId) return

    const result = await Swal.fire({
      title: "Crear Checklist Diario",
      text: "¿Estás seguro de que deseas crear un nuevo checklist diario?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, crear",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-slate-800 font-bold",
        content: "text-slate-600",
        confirmButton: "rounded-xl font-semibold px-6 py-3",
        cancelButton: "rounded-xl font-semibold px-6 py-3",
      },
    })

    if (!result.isConfirmed) return

    Swal.fire({
      title: "Creando checklist...",
      text: "Por favor espera mientras se crea el checklist diario",
      allowOutsideClick: false,
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-slate-800 font-bold",
        content: "text-slate-600",
      },
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
        { premise_id: Number.parseInt(premiseId), date: dateString },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )

      await Swal.fire({
        title: "¡Éxito!",
        text: "Checklist diario creado exitosamente",
        icon: "success",
        confirmButtonColor: "#7c3aed",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
        },
      })

      fetchDailyChecklist()
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: err.response?.data?.error || "Error al crear checklist diario",
        icon: "error",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      })
    }
  }

  const handleSignChecklist = async () => {
    if (!user || !checklist) return

    const result = await Swal.fire({
      title: "Firmar Checklist",
      text: "¿Estás seguro de que deseas firmar este checklist? Esta acción no se puede deshacer.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, firmar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-slate-800 font-bold",
        content: "text-slate-600",
        confirmButton: "rounded-xl font-semibold px-6 py-3",
        cancelButton: "rounded-xl font-semibold px-6 py-3",
      },
    })

    if (!result.isConfirmed) return

    Swal.fire({
      title: "Firmando checklist...",
      text: "Por favor espera mientras se procesa la firma",
      allowOutsideClick: false,
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-slate-800 font-bold",
        content: "text-slate-600",
      },
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

      await Swal.fire({
        title: "¡Éxito!",
        text: "Checklist firmado exitosamente",
        icon: "success",
        confirmButtonColor: "#7c3aed",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
        },
      })

      fetchDailyChecklist()
    } catch (err) {
      if (err.response?.data?.incompleteItems) {
        const incompleteItems = err.response.data.incompleteItems

        await Swal.fire({
          title: "Checklist Incompleto",
          html: `
            <div style="text-align: left; max-height: 400px; overflow-y: auto;">
              <p style="margin-bottom: 15px; color: #475569;">Los siguientes <strong>${incompleteItems.length}</strong> ítems deben ser respondidos antes de firmar:</p>
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #7c3aed;">
                ${incompleteItems
                  .map(
                    (item) => `
                    <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <strong style="color: #1e293b;">${item.item_number}.</strong> <span style="color: #475569;">${item.question_text}</span>
                    </div>
                  `,
                  )
                  .join("")}
              </div>
            </div>
          `,
          icon: "warning",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#7c3aed",
          width: "700px",
          customClass: {
            popup: "rounded-2xl shadow-2xl",
            title: "text-slate-800 font-bold",
            confirmButton: "rounded-xl font-semibold px-6 py-3",
          },
        })
      } else {
        await Swal.fire({
          title: "Error",
          text: err.response?.data?.error || "Error al firmar checklist",
          icon: "error",
          confirmButtonColor: "#7c3aed",
          confirmButtonText: "Entendido",
          customClass: {
            popup: "rounded-2xl shadow-2xl",
            title: "text-slate-800 font-bold",
            content: "text-slate-600",
            confirmButton: "rounded-xl font-semibold px-6 py-3",
          },
        })
      }
    }
  }

  const handleFailureClosed = (failureId) => {
    fetchDailyChecklist()
    fetchHistoricalChecklists()
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex justify-center items-center p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Cargando Sistema de Checklists</h2>
            <p className="text-slate-600 leading-relaxed">Por favor espera mientras cargamos tu información...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-800 text-balance">Sistema de Checklists</h1>
                <p className="text-slate-600 text-lg">Inspectable ID: {inspectableId}</p>
              </div>
            </div>

            <nav className="flex items-center space-x-3 text-sm bg-white px-4 py-3 rounded-xl border-2 border-slate-200 shadow-sm">
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="text-slate-600 hover:text-purple-600 transition-colors duration-200 font-medium"
              >
                Dashboard
              </button>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-600">Checklist Diario</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-semibold">Inspectable {inspectableId}</span>
            </nav>
          </div>

          <DailyChecklistSection
            checklist={checklist}
            itemResponses={itemResponses}
            modifiedResponses={modifiedResponses}
            isChecklistCollapsed={isChecklistCollapsed}
            setIsChecklistCollapsed={setIsChecklistCollapsed}
            handleResponseChange={handleResponseChange}
            handleResponseTypeChange={handleResponseTypeChange}
            handleSubmitResponses={handleSubmitResponses}
            handleSignChecklist={handleSignChecklist}
            handleCreateDailyChecklist={handleCreateDailyChecklist}
            handleFileUpload={handleFileUpload}
            user={user}
            inspectableId={inspectableId}
            premiseId={premiseId}
            error={error}
            onFailureClosed={handleFailureClosed}
          />

          <HistorySection
            historicalChecklists={historicalChecklists}
            expandedHistoricalChecklists={expandedHistoricalChecklists}
            toggleHistoricalChecklist={toggleHistoricalChecklist}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
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

      if (response.data && response.data.items) {
        response.data.items.forEach((item) => {
          const existingResponse = item.responses?.[0]

           //verificar si existen respuestas con contenido
          if (existingResponse && (existingResponse.value !== null || existingResponse.comment)) {
            hasResponses = true
          }

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
      setHasExistingResponses(hasResponses)
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
          newValue = true
          break
        case "no_cumple":
          newValue = false
          break
        case "observaciones":
          newValue = true
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

    try {
      const formData = new FormData()
      formData.append("evidence", file)

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const response = await axios.post(`${API_URL}/api/att-check/upload-evidence`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      // Actualizar la URL de evidencia con la ruta del archivo subido
      handleResponseChange(itemId, "evidence_url", response.data.filePath)

      Swal.fire("¡Éxito!", "Archivo subido correctamente", "success")
    } catch (err) {
      console.error("Error uploading file:", err)
      Swal.fire("Error", "Error al subir el archivo", "error")
    }
  }

 const handleSubmitResponses = async () => {
    if (!user || !checklist) return

    const modifiedResponsesArray = Array.from(modifiedResponses)
    if (modifiedResponsesArray.length === 0) {
      Swal.fire("Info", "No hay cambios para guardar", "info")
      return
    }

    const actionText = hasExistingResponses ? "Actualizando" : "Guardando"
    
    Swal.fire({
      title: `${actionText} Respuestas...`,
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
          response_id: response.response_id,
          value: response.value,
          comment: response.comment || null,
          evidence_url: response.evidence_url || null,
        }
      })

      console.log("[v0] Enviando respuestas:", formattedResponses)

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
      Swal.fire("¡Éxito!", `Respuestas ${successText} exitosamente`, "success")
      setModifiedResponses(new Set())
      setHasExistingResponses(true) 
      await fetchDailyChecklist()
    } catch (err) {
      console.error("Error submitting responses:", err)
      Swal.fire("Error", err.response?.data?.error || "Error al guardar respuestas", "error")
    }
  }

  const handleCreateDailyChecklist = async () => {
    if (!user || !premiseId) return

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
        { premise_id: Number.parseInt(premiseId), date: dateString },
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

  // Actualizar falla
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
      fetchHistoricalChecklists()
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
        <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando checklist...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Sistema de Checklists</h1>

          <DailyChecklistSection
            checklist={checklist}
            itemResponses={itemResponses}
            modifiedResponses={modifiedResponses}
            isChecklistCollapsed={isChecklistCollapsed}
            setIsChecklistCollapsed={setIsChecklistCollapsed}
            handleResponseChange={handleResponseChange}
            handleResponseTypeChange={handleResponseTypeChange}
            handleUpdateFailure={handleUpdateFailure}
            handleSubmitResponses={handleSubmitResponses}
            handleSignChecklist={handleSignChecklist}
            handleCreateDailyChecklist={handleCreateDailyChecklist}
            handleFileUpload={handleFileUpload}
            user={user}
            inspectableId={inspectableId}
            premiseId={premiseId}
            error={error}
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

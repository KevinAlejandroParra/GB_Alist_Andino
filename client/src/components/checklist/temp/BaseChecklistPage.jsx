'use client'

import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import ProtectedRoute from "../ProtectedRoute"
import { useAuth } from "../AuthContext"
import ChecklistSection from "./ChecklistSection"
import SignaturePad from "./SignaturePad"
import ValidationErrors from "./ValidationErrors"
import { useChecklistData } from "./hooks/useChecklistData"
import { useResponseManagement } from "./hooks/useResponseManagement"
import { useFileUpload } from "./hooks/useFileUpload"
import { useSignature } from "./hooks/useSignature"
import { useChecklistValidation } from "./hooks/useChecklistValidation"
import ChecklistHeader from "./components/ChecklistHeader"
import ChecklistActions from "./components/ChecklistActions"
import ChecklistHistory from "./components/ChecklistHistory"
import axiosInstance from "../../utils/axiosConfig"
import Swal from "sweetalert2"

export default function BaseChecklistPage({
  checklistTypeId,
  config,
  pageTitle,
  breadcrumbItems = []
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false)

  // Hook para datos del checklist
  const checklistData = useChecklistData(checklistTypeId, {
    user,
    ...config
  })

  // Hook para manejo de respuestas
  const responseManager = useResponseManagement(checklistData.checklist)

  // Hook para manejo de archivos
  const { handleFileUpload } = useFileUpload(user)
  
  // Hook para validaciones
  const validation = useChecklistValidation(config)

  // Hook para firmas
  const signatureManager = useSignature(user, checklistData.checklist?.checklist_id)

  useEffect(() => {
    if (validation.errors.length === 0) {
      setShowValidationErrors(false)
    }
  }, [validation.errors])

  const handleSave = async () => {
    const isValid = validation.validateResponses(responseManager.itemResponses)
    if (!isValid) {
      setShowValidationErrors(true)
      return
    }

    try {
      await axiosInstance.post(config.saveEndpoint, {
        responses: responseManager.itemResponses,
        checklistTypeId,
        signatureData: signatureManager.signature
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      })

      await Swal.fire({
        title: '¡Éxito!',
        text: 'Checklist guardado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })

      checklistData.refreshChecklistData()
      validation.clearErrors()
    } catch (error) {
      console.error('Error al guardar:', error)
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo guardar el checklist',
        icon: 'error'
      })
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const response = await axiosInstance.get(`${config.downloadEndpoint}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${user.token}` }
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `checklist-${checklistTypeId}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      Swal.fire({
        title: 'Error',
        text: 'No se pudo descargar el PDF',
        icon: 'error'
      })
    }
  }

  // Renderizado condicional para estados de carga y error
  if (checklistData.loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (checklistData.error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700">{checklistData.error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
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
              onResponseChange={responseManager.handleResponseChange}
              onResponseTypeChange={responseManager.handleResponseTypeChange}
              onFileUpload={handleFileUpload}
              onMarkAllSiblings={responseManager.handleMarkAllSiblings}
              config={config}
            />
          </div>

          <ChecklistActions
            onSign={() => setIsSignaturePadOpen(true)}
            onSave={handleSave}
            onDownload={handleDownloadPdf}
            allowDownload={config.allowDownload}
          />

          {!config.hideHistory && (
            <ChecklistHistory
              type={config.type}
              premiosHistoryData={checklistData.premiosHistoryData}
              historicalChecklists={checklistData.historicalChecklists}
              expandedHistoricalChecklists={checklistData.expandedHistoricalChecklists}
              onToggleExpand={checklistData.toggleHistoricalChecklist}
            />
          )}
        </div>

        {/* Modales */}
        {isSignaturePadOpen && (
          <SignaturePad
            show={isSignaturePadOpen}
            onClose={() => setIsSignaturePadOpen(false)}
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
  )
}
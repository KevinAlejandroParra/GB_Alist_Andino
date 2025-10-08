"use client"

import React, { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ProtectedRoute from "../../../components/ProtectedRoute"
import { useAuth } from "../../../components/AuthContext"
import axiosInstance from "../../../utils/axiosConfig"
import Swal from "sweetalert2"

export default function InspectableDetailPage({ params }) {
  const router = useRouter()
  const inspectableId = React.use(params).id
  const searchParams = useSearchParams()
  const premiseId = searchParams.get("premiseId")
  const checklistTypeId = searchParams.get("checklistTypeId")

  const { user, isLoading: authLoading } = useAuth()

  // Redirigir automáticamente a la página específica del tipo de checklist
  useEffect(() => {
    if (checklistTypeId && !authLoading && user) {
      const fetchChecklistType = async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
          const response = await axiosInstance.get(
            `${API_URL}/api/checklist-types/${checklistTypeId}`,
            {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            }
          )

          const checklistType = response.data

          // Redirigir según el tipo de checklist
          if (checklistType.type_category === 'attraction') {
            router.push(`/checklists/attraction/${checklistTypeId}?inspectableId=${inspectableId}&premiseId=${premiseId}`)
          } else if (checklistType.type_category === 'family') {
            router.push(`/checklists/family/${checklistTypeId}?inspectableId=${inspectableId}&premiseId=${premiseId}`)
          } else if (checklistType.type_category === 'specific') {
            router.push(`/checklists/specific/${checklistTypeId}?inspectableId=${inspectableId}&premiseId=${premiseId}`)
          } else {
            router.push(`/checklists/static/${checklistTypeId}?inspectableId=${inspectableId}&premiseId=${premiseId}`)
          }
        } catch (error) {
          console.error('Error fetching checklist type:', error)
          // Si hay error, redirigir a una página genérica o mostrar error
          Swal.fire({
            title: 'Error',
            text: 'No se pudo determinar el tipo de checklist.',
            icon: 'error'
          })
        }
      }

      fetchChecklistType()
    }
  }, [checklistTypeId, authLoading, user, router, inspectableId, premiseId])

  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex justify-center items-center p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Cargando...</h2>
            <p className="text-slate-600 leading-relaxed">Verificando autenticación...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex justify-center items-center p-6">
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Redirigiendo...</h2>
          <p className="text-slate-600 leading-relaxed">Preparando checklist para el inspectable {inspectableId}...</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}

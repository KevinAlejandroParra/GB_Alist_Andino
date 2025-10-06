'use client'
import React from 'react'
import BaseChecklistPage from '../../../components/checklist/BaseChecklistPage'
import { useParams } from 'next/navigation'

const FamilyChecklistIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
)

export default function FamilyChecklistPage() {
  const params = useParams()
  const { checklistTypeId } = params

  // El checklist de familia es especial porque:
  // 1. Se genera dinámicamente basado en los dispositivos de la familia
  // 2. No necesita seleccionar una familia específica, ya que el checklistTypeId
  //    ya determina la familia (ej: apoyo técnico)
  // 3. La plantilla se regenera automáticamente si hay nuevos dispositivos

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      title="Checklist por Familia"
      subtitle="Checklist semanal para familias de dispositivos"
      frequency="Semanal"
      category="Familia"
      icon={<FamilyChecklistIcon />}
      showEntitySelector={false} // No necesitamos selector, el tipo ya define la familia
      fetchChecklistEndpoint="latest"
      generateDynamicTemplate={true} // Indica que este checklist genera su plantilla dinámicamente
    />
  )
}
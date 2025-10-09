'use client'

import React from 'react'
import BaseChecklistPage from '../../../components/checklist/BaseChecklistPage'
import { useParams } from 'next/navigation'

const AttractionChecklistIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
)

export default function AttractionChecklistPage() {
  const params = useParams()
  const { checklistTypeId } = params

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      pageTitle="Checklist de Atracción"
      config={{
        subtitle: "Checklist diario para atracciones",
        frequency: "Diario",
        category: "Atracción",
        icon: <AttractionChecklistIcon />,
        showEntitySelector: true,
        entityType: "attraction",
        entityLabel: "Atracción",
        fetchChecklistEndpoint: "latest",
      }}
    />
  )
}
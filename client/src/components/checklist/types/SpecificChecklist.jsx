'use client'

import React from 'react'
import BaseChecklistPage from '../../../components/checklist/BaseChecklistPage'

const SpecificChecklist = ({ checklistTypeId, inspectableId }) => {
  const config = {
    type: 'specific',
    generateEndpoint: `/api/checklists/type/${checklistTypeId}/inspectable/${inspectableId}`,
    historyEndpoint: `/api/checklists/type/${checklistTypeId}/history`,
    saveEndpoint: `/api/checklists/type/${checklistTypeId}/save`,
    params: {
      date: new Date().toISOString(),
      inspectableId
    },
    validations: {
      requiresSignature: true,
      requiresEvidence: false,
      requiresNumericValidation: true,
      requiresCustomCalculations: true
    },
    responseType: 'numeric',
    frequency: 'weekly',
    showPremiosHistory: true
  }

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      config={config}
      pageTitle="Checklist de Premios"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Checklists de Premios' },
        { label: 'Nuevo Checklist' }
      ]}
    />
  )
}

export default SpecificChecklist
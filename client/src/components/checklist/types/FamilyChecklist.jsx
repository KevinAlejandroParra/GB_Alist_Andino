'use client'

import React from 'react'
import BaseChecklistPage from '../../../components/checklist/BaseChecklistPage'

const FamilyChecklist = ({ checklistTypeId, familyId }) => {
  const config = {
    type: 'family',
    generateEndpoint: `/api/checklists/family/${checklistTypeId}/generate`,
    historyEndpoint: `/api/checklists/type/${checklistTypeId}/history`,
    saveEndpoint: `/api/checklists/family/${checklistTypeId}/save`,
    params: {
      date: new Date().toISOString(),
      familyId
    },
    validations: {
      requiresSignature: true,
      requiresEvidence: true,
      requiresComment: true
    },
    responseType: 'radio',
    frequency: 'weekly',
    isDynamic: true,
    isFamilyChecklist: true
  }

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      config={config}
      pageTitle="Checklist de Familia"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Checklists de Familias' },
        { label: 'Nuevo Checklist' }
      ]}
    />
  )
}

export default FamilyChecklist
'use client'

import React from 'react'
import BaseChecklistPage from '../../../components/checklist/BaseChecklistPage'

const AttractionChecklist = ({ checklistTypeId, inspectableId, premiseId }) => {
  const config = {
    type: 'attraction',
    generateEndpoint: `/api/checklists/type/${checklistTypeId}/latest`,
    historyEndpoint: `/api/checklists/type/${checklistTypeId}/history`,
    saveEndpoint: `/api/checklists/type/${checklistTypeId}/save`,
    params: {
      date: new Date().toISOString(),
      inspectableId,
      premiseId
    },
    validations: {
      requiresSignature: true,
      requiresEvidence: true,
      requiresComment: true
    },
    responseType: 'radio',
    frequency: 'daily',
    isStatic: true
  }

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      config={config}
      pageTitle="Checklist de Atracción"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Checklists de Atracciones' },
        { label: 'Nuevo Checklist' }
      ]}
    />
  )
}

export default AttractionChecklist
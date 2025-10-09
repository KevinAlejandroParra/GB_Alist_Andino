'use client'

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';

export default function FamilyChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;
  const searchParams = useSearchParams();
  const familyId = searchParams.get('familyId');

  // Crear un objeto de entidad pre-seleccionada para pasarlo al componente base
  const preselectedEntity = familyId ? { id: familyId } : null;

  const config = {
    type: 'family',
    requiresEntitySelection: false, // La entidad viene en la URL, no se selecciona interactivamente
    entityType: 'family',
    saveEndpoint: `/api/checklists/type/${checklistTypeId}/responses`,
    downloadEndpoint: `/api/checklists/type/${checklistTypeId}/download-pdf`,
    generateDynamicTemplate: true, // Indicar que este checklist genera items dinámicamente
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists de Familia', href: '/checklists/family' },
    { label: checklistTypeId },
  ];

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      config={config}
      pageTitle="Checklist de Familia"
      breadcrumbItems={breadcrumbItems}
      preselectedEntity={preselectedEntity}
    />
  );
}

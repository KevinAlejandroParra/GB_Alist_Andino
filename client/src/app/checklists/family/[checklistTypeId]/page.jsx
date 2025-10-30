'use client'

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { CHECKLIST_TYPES, getUiConfig } from '../../../../components/checklist/config/checklistTypes.config';

export default function FamilyChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;
  const searchParams = useSearchParams();
  const familyId = searchParams.get('familyId');

  // Crear un objeto de entidad pre-seleccionada para pasarlo al componente base
  const preselectedEntity = familyId ? { id: familyId } : null;

  // Usar la configuración centralizada
  const typeConfig = CHECKLIST_TYPES.family;
  const uiConfig = getUiConfig('family');

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: uiConfig.breadcrumbLabel, href: '/checklists/family' },
    { label: checklistTypeId },
  ];

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      checklistType="family"  // Especificar el tipo de checklist
      config={typeConfig.data}
      pageTitle={typeConfig.displayName}
      pageDescription={typeConfig.description}
      breadcrumbItems={breadcrumbItems}
      preselectedEntity={preselectedEntity}
      icon={uiConfig.icon}
    />
  );
}

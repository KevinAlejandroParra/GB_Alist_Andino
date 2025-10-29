'use client'

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { CHECKLIST_TYPES, getUiConfig } from '../../../../components/checklist/config/checklistTypes.config';

export default function AttractionChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;
  const searchParams = useSearchParams();
  const inspectableId = searchParams.get('inspectableId');

  // Crear un objeto de entidad pre-seleccionada para pasarlo al componente base
  const preselectedEntity = inspectableId ? { id: inspectableId } : null;

  // Usar la configuración centralizada
  const typeConfig = CHECKLIST_TYPES.attraction;
  const uiConfig = getUiConfig('attraction');

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: uiConfig.breadcrumbLabel, href: '/checklists/attraction' },
    { label: checklistTypeId },
  ];

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      checklistType="attraction"  // Especificar el tipo de checklist
      config={typeConfig.data}
      pageTitle={typeConfig.displayName}
      pageDescription={typeConfig.description}
      breadcrumbItems={breadcrumbItems}
      preselectedEntity={preselectedEntity}
      icon={uiConfig.icon}
    />
  );
}
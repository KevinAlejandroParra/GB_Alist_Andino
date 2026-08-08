'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { CHECKLIST_TYPES, getUiConfig } from '../../../../components/checklist/config/checklistTypes.config';

export default function PremiosChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;

  // Usar la configuración centralizada
  const typeConfig = CHECKLIST_TYPES.premios;
  const uiConfig = getUiConfig('premios');

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists', href: '/checklists' },
    { label: 'Premios' },
  ];

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      checklistType="premios"  // Especificar el tipo de checklist
      config={typeConfig.data}
      pageTitle={typeConfig.displayName}
      pageDescription={typeConfig.description}
      breadcrumbItems={breadcrumbItems}
      icon={uiConfig.icon}
    />
  );
}

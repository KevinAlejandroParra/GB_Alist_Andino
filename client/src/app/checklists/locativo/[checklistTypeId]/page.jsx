'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { CHECKLIST_TYPES, getUiConfig } from '../../../../components/checklist/config/checklistTypes.config';

export default function LocativoChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;

  const typeConfig = CHECKLIST_TYPES.static;
  const uiConfig = getUiConfig('static');

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: uiConfig.breadcrumbLabel, href: '/dashboard' },
    { label: checklistTypeId },
  ];

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      checklistType="static"
      config={typeConfig.data}
      pageTitle={typeConfig.displayName}
      pageDescription={typeConfig.description}
      breadcrumbItems={breadcrumbItems}
      icon={uiConfig.icon}
    />
  );
}

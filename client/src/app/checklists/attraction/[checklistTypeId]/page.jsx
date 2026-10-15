'use client'

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { CHECKLIST_TYPES, getUiConfig } from '../../../../components/checklist/config/checklistTypes.config';

function AttractionChecklistContent() {
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
// useSearchParams() requiere un límite de Suspense para el prerender estático (Next 15)
export default function AttractionChecklistPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    }>
      <AttractionChecklistContent />
    </Suspense>
  );
}

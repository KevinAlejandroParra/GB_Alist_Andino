'use client'

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';

export default function AttractionChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;
  const searchParams = useSearchParams();
  const inspectableId = searchParams.get('inspectableId');

  // Crear un objeto de entidad pre-seleccionada para pasarlo al componente base
  const preselectedEntity = inspectableId ? { id: inspectableId } : null;

  // El endpoint de guardado debe usar el checklist_id real, que se obtiene dinámicamente
  const config = {
    type: 'attraction',
    requiresEntitySelection: false, // Revertido a false, el inspectableId se obtiene del checklistType.associated_id
    entityType: 'inspectable',
    // saveEndpoint se construirá dinámicamente en BaseChecklistPage usando checklist?.checklist_id
    saveEndpoint: null,
    downloadEndpoint: `/api/checklists/type/${checklistTypeId}/download-pdf`,
    createInstance: true, // Indicamos que esta página debe crear una instancia si no existe
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists de Atracción', href: '/checklists/attraction' },
    { label: checklistTypeId },
  ];

  return (
    <BaseChecklistPage
      checklistTypeId={checklistTypeId}
      config={config}
      pageTitle="Checklist de Atracción"
      breadcrumbItems={breadcrumbItems}
      preselectedEntity={preselectedEntity}
    />
  );
}
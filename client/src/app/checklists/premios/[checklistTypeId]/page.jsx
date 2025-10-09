'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { usePremios } from '../../../../components/checklist/hooks/usePremios';
import PremiosDataModal from '../../../../components/checklist/PremiosDataModal';

export default function PremiosChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;

  // Hook para la lógica de Premios
  const premios = usePremios(checklistTypeId);

  const config = {
    type: 'premios', // Tipo dedicado
    requiresEntitySelection: false, 
    hideHistory: true, // El historial de premios se maneja de forma especial
    allowDownload: true,
    saveEndpoint: `/api/checklists/type/${checklistTypeId}/responses`,
    downloadEndpoint: `/api/checklists/type/${checklistTypeId}/download-pdf`,
    // Acción personalizada para abrir el modal de registro de datos
    customActions: [
      {
        key: 'premios-data',
        label: 'Registrar Datos de Premios',
        onClick: premios.openPremiosModal,
        variant: 'secondary'
      }
    ],
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists', href: '/checklists' },
    { label: 'Premios' },
  ];

  return (
    <>
      <BaseChecklistPage
        checklistTypeId={checklistTypeId}
        config={config}
        pageTitle="Checklist de Apoyo Técnico (Premios)"
        breadcrumbItems={breadcrumbItems}
      />
      {/* Renderizar el modal de premios */}
      <PremiosDataModal 
        isOpen={premios.isPremiosModalOpen}
        onClose={premios.closePremiosModal}
        data={premios.premiosData}
        onChange={premios.handlePremiosDataChange}
        onSave={premios.handleSavePremiosData}
      />
    </>
  );
}

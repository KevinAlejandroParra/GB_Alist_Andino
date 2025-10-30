'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import BaseChecklistPage from '../../../../components/checklist/BaseChecklistPage';
import { usePremios } from '../../../../components/checklist/hooks/usePremios';
import PremiosDataModal from '../../../../components/checklist/PremiosDataModal';
import { CHECKLIST_TYPES, getUiConfig } from '../../../../components/checklist/config/checklistTypes.config';

export default function PremiosChecklistPage() {
  const params = useParams();
  const { checklistTypeId } = params;

  // Hook para la lógica de Premios
  const premios = usePremios(checklistTypeId);

  // Usar la configuración centralizada
  const typeConfig = CHECKLIST_TYPES.premios;
  const uiConfig = getUiConfig('premios');

  // Crear acciones personalizadas basadas en la configuración
  const customActions = typeConfig.data.customActions.map(action => ({
    ...action,
    onClick: premios.openPremiosModal
  }));

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists', href: '/checklists' },
    { label: 'Premios' },
  ];

  return (
    <>
      <BaseChecklistPage
        checklistTypeId={checklistTypeId}
        checklistType="premios"  // Especificar el tipo de checklist
        config={typeConfig.data}
        pageTitle={typeConfig.displayName}
        pageDescription={typeConfig.description}
        breadcrumbItems={breadcrumbItems}
        icon={uiConfig.icon}
        customActions={customActions}
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

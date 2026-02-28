'use client'

import React from 'react';
import InventorySearchTable from './InventorySearchTable';

const InventorySearchModal = ({
  show,
  onClose,
  onPartSelected,
  onPartNotFound,
  requestedPartInfo,
  allowMultiple = false,
  selectedParts = [],
  workOrderId,
  onMultiplePartsComplete
}) => {
  // Manejar múltiples repuestos seleccionados
  const handleMultiplePartsComplete = (parts) => {
    // Convertir cada repuesto al formato esperado por el modal padre
    const partsData = parts.map(part => ({
      useExistingPart: true,
      partData: part,
      quantityRequested: requestedPartInfo?.quantity || 1,
      inventoryId: part.id,
      workOrderId: workOrderId || null,
      registerForLater: true,
      autoDeduction: false
    }));

    if (onMultiplePartsComplete) {
      return onMultiplePartsComplete(partsData);
    }

    // Fallback al comportamiento original
    if (onPartSelected && partsData.length === 1) {
      onPartSelected(partsData[0]);
      return true;
    }

    return false;
  };

  // Transformar la selección del componente InventorySearchTable (modo único)
  const handlePartSelected = (part) => {
    if (!part) {
      // Si no hay repuesto seleccionado, proceder con requisición
      if (onPartNotFound) {
        onPartNotFound();
      }
      return;
    }

    // Convertir el formato del componente tabla al formato esperado por el modal padre
    const partData = {
      useExistingPart: true,
      partData: part,
      quantityRequested: requestedPartInfo?.quantity || 1,
      inventoryId: part.id,
      workOrderId: workOrderId || null,
      registerForLater: true, // Indica que se registrará para usar después
      autoDeduction: false
    };

    if (onPartSelected) {
      onPartSelected(partData);
    }
    onClose();
  };

  // Manejar el caso cuando no se encuentra el repuesto
  const handlePartNotFoundFromTable = () => {
    if (onPartNotFound) {
      onPartNotFound();
      // NO cerrar el modal aquí - el componente padre decide cuando cerrarlo
      // después de mostrar el modal de requisición
    }
  };

  if (!show) return null;

  return (
    <InventorySearchTable
      show={show}
      onClose={onClose}
      onPartSelected={handlePartSelected}
      onPartNotFound={handlePartNotFoundFromTable}
      initialQuery={requestedPartInfo?.name || ''}
      selectedCategories={[]}
      selectedLocations={[]}
      inStockOnly={true}
      workOrderId={workOrderId}
      failureInfo={requestedPartInfo}
      allowMultiple={allowMultiple}
      onMultiplePartsComplete={handleMultiplePartsComplete}
    />
  );
};

export default InventorySearchModal;
'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import InventorySearchModal from './InventorySearchModal';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';

import CreateRequisitionModal from './requisitions/CreateRequisitionModal';

const WorkOrderPartsManager = ({
  workOrderId,
  show,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

  const [linkedParts, setLinkedParts] = useState([]);
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);

  // Cargar repuestos existentes al abrir el modal
  useEffect(() => {
    if (show && workOrderId) {
      loadLinkedParts();
    }
  }, [show, workOrderId]);

  // Cargar repuestos ya enlazados desde work order parts
  const loadLinkedParts = async () => {
    if (!workOrderId) {
      setLinkedParts([]);
      return;
    }

    setLoadingParts(true);
    try {
      const response = await axiosInstance.get(`${API_URL}/api/work-orders/${workOrderId}/parts`);

      if (response.data.success) {
        // Transformar los datos para incluir información del inventario
        const partsWithInventoryInfo = response.data.data.map(part => ({
          ...part,
          partName: part.inventory?.part_name || `Repuesto ID: ${part.inventory_id}`,
          partCategory: part.inventory?.category || 'Repuesto',
          partLocation: part.inventory?.location || 'No especificado',
          inventoryAvailable: part.inventory?.quantity || 0
        }));

        setLinkedParts(partsWithInventoryInfo);
      } else {
        setLinkedParts([]);
      }
    } catch (error) {
      console.error('Error cargando repuestos enlazados:', error);
      setLinkedParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  // Enlazar repuestos seleccionados al work order parts y al inventario
  const handlePartsSelected = async (selectedParts) => {
    if (!workOrderId || !selectedParts || (Array.isArray(selectedParts) && selectedParts.length === 0) || (!Array.isArray(selectedParts) && !Object.keys(selectedParts).length)) {
      setShowInventorySearch(false);
      return;
    }

    setLoadingParts(true);
    try {
      // Asegurar que selectedParts es un array
      const partsToProcess = Array.isArray(selectedParts) ? selectedParts : [selectedParts];

      // Procesar cada repuesto seleccionado
      for (const part of partsToProcess) {
        try {
          const inventoryId = part.inventoryId || part.partData?.inventory_id || part.partData?.id;
          const quantityUsed = part.quantityRequested || part.quantityUsed || 1;

          // Registrar en work order parts
          const workOrderPartResponse = await axiosInstance.post(`${API_URL}/api/work-orders/${workOrderId}/parts`, {
            inventory_id: inventoryId,
            quantity_used: quantityUsed
          });

          if (workOrderPartResponse.data.success) {
            // El endpoint ya maneja automáticamente el descuento del inventario
            // NO necesitamos llamar al endpoint de inventario por separado
            console.log(`✅ Repuesto ${part.partData?.item_name || inventoryId} procesado correctamente`);
          }
        } catch (partError) {
          console.error(`Error procesando repuesto:`, partError);
        }
      }

      // Cerrar modal y recargar repuestos
      setShowInventorySearch(false);
      await loadLinkedParts();

      Swal.fire('✅ Repuestos Enlazados',
        `${partsToProcess.length} repuesto(s) enlazado(s) exitosamente a la orden de trabajo`,
        'success');

    } catch (error) {
      console.error('Error enlazando repuestos:', error);
      setShowInventorySearch(false);
      await loadLinkedParts();
      Swal.fire('Advertencia', 'Algunos repuestos pudieron no haberse enlazado correctamente.', 'warning');
    } finally {
      setLoadingParts(false);
    }
  };

  const removePart = async (index) => {
    const partToRemove = linkedParts[index];
    if (!partToRemove) return;

    // Confirmar eliminación
    const result = await Swal.fire({
      title: '¿Eliminar repuesto?',
      text: 'Se eliminará el repuesto de la orden de trabajo y se devolverá al inventario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setLoadingParts(true);
    try {
      // Eliminar del work order parts usando el ID de la relación
      await axiosInstance.delete(`${API_URL}/api/work-orders/${workOrderId}/parts/${partToRemove.id}`);

      // Devolver la cantidad al inventario
      await axiosInstance.put(`${API_URL}/api/inventory/${partToRemove.inventory_id}/increment`, {
        quantity: partToRemove.quantity_used || 1,
        reason: `Eliminado de orden de trabajo ${workOrderId}`,
        workOrderId: workOrderId
      });

      // Recargar la lista
      await loadLinkedParts();

      Swal.fire('✅ Repuesto Eliminado',
        `Se eliminó el repuesto de la orden de trabajo y se devolvió al inventario`,
        'success');

    } catch (error) {
      console.error('Error eliminando repuesto:', error);
      Swal.fire('Error', 'No se pudo eliminar el repuesto: ' + error.message, 'error');
    } finally {
      setLoadingParts(false);
    }
  };

  const getTotalParts = () => {
    return linkedParts.reduce((total, part) => total + (part.quantity_used || 1), 0);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              🛠️ Gestionar Repuestos de la Orden de Trabajo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Resumen */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-900">{linkedParts.length}</div>
                <div className="text-blue-700">Repuestos Enlazados</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-900">{getTotalParts()}</div>
                <div className="text-blue-700">Total Unidades</div>
              </div>
            </div>
          </div>

          {/* Lista de Repuestos */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Repuestos Asignados</h3>
              <button
                onClick={() => setShowInventorySearch(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                ➕ Agregar Repuesto
              </button>
            </div>

            {loadingParts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Cargando repuestos...</p>
              </div>
            ) : linkedParts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowInventorySearch(true)}
                  className="w-full py-6 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-sm font-medium">Seleccionar Repuestos del Inventario</span>
                  <span className="text-xs block">Haga clic para buscar y enlazar repuestos necesarios</span>
                </button>
              </div>
            ) : (
              <div className="overflow-hidden border border-blue-200 rounded-lg">
                <table className="min-w-full divide-y divide-blue-200">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Repuesto</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Cantidad</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Categoría</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Ubicación</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Disponible</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-blue-800 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-blue-200">
                    {linkedParts.map((part, index) => (
                      <tr key={part.id || index}>
                        <td className="px-3 py-2 text-sm text-gray-900 font-medium">{part.partName}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            {part.quantity_used || 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{part.partCategory}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{part.partLocation}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{part.inventoryAvailable}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removePart(index)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 hover:bg-red-50 rounded"
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                if (onSuccess) onSuccess(linkedParts);
                onClose();
              }}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              ✅ Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de búsqueda de inventario */}
      <InventorySearchModal
        show={showInventorySearch}
        onClose={() => {
          loadLinkedParts();
          setShowInventorySearch(false);
        }}
        onPartSelected={handlePartsSelected}
        onPartNotFound={() => {
          setShowInventorySearch(false);
          setShowRequisitionModal(true);
        }}
        allowMultiple={true}
        selectedParts={[]}
        workOrderId={workOrderId}
      />

      {/* Modal de creación de requisición */}
      <CreateRequisitionModal
        show={showRequisitionModal}
        onClose={() => setShowRequisitionModal(false)}
        onSuccess={(data) => {
          // Si la requisición se creó con éxito
          console.log('Requisición creada:', data);
          setShowRequisitionModal(false);
          // Opcionalmente recargar partes si la lógica de negocio implica
          // que una requisición aprobada agrega la parte (pero esto suele ser asíncrono)
        }}
        workOrderId={workOrderId}
      />

    </div>
  );
};

export default WorkOrderPartsManager;
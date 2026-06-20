'use client'

import React, { useState } from 'react';
import WorkOrderProcessModal from './WorkOrderProcessModal';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';

/**
 * Modal simplificado para gestionar fallas desde el libro de fallas
 * Permite crear OT o resolver fallas existentes
 */
const ManageFailureModal = ({ 
  show, 
  onClose, 
  failure, 
  user,
  onSuccess 
}) => {
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false);
  const [createdExecution, setCreatedExecution] = useState(null);

  if (!show || !failure) return null;

  const effectiveExecution = failure.repairExecution || failure.workOrder || null;
  const hasExecution = !!effectiveExecution;
  const isResolved = ['RESUELTA', 'CANCELADO'].includes(effectiveExecution?.status);

  const handleCreateWorkOrder = async () => {
    if (hasExecution) {
      setShowProcessModal(true);
      return;
    }

    // Si no tiene OT, crearla primero
    setCreatingWorkOrder(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      const response = await axiosInstance.post(`${API_URL}/api/work-orders/create-for-failure`, {
        failure_order_id: failure.id,
        created_by_id: user.user_id
      });

      if (response.data.success) {
        const created = response.data.data;
        setCreatedExecution(created);
        
        await Swal.fire({
          title: '✅ Acta de Reparación Creada',
          text: `AR ${created.repair_execution_id || created.id} creada exitosamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        setShowProcessModal(true);
      } else {
        throw new Error(response.data.error?.message || 'Error al crear el acta de reparación');
      }
    } catch (error) {
      console.error('Error creando AR:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.error?.message || error.message || 'No se pudo crear el acta de reparación',
        icon: 'error'
      });
    } finally {
      setCreatingWorkOrder(false);
    }
  };

  const handleProcessSuccess = () => {
    // Esta función se llama cuando se actualiza la orden (no cuando se cierra el modal)
    // NO debe cerrar modales ni llamar a onSuccess, solo sirve para refrescar datos si es necesario
    // El onSuccess solo se debe llamar cuando se cierra el modal completamente
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  🔧 Gestionar Falla
                </h2>
                <p className="text-sm text-gray-600">
                  {failure.failure_order_id || `OF-${failure.id}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Información de la falla */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700">{failure.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Severidad</label>
                  <p className="text-gray-900">{failure.severity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="text-gray-900">{failure.type_maintenance}</p>
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-4">
              {!hasExecution ? (
                <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                      🔧
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">
                        Crear Acta de Reparación
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Esta falla no tiene gestión iniciada. Crea el acta de reparación para poder resolverla.
                      </p>
                      <button
                        onClick={handleCreateWorkOrder}
                        disabled={creatingWorkOrder}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {creatingWorkOrder ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Creando...</span>
                          </>
                        ) : (
                          'Crear Acta de Reparación'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isResolved ? (
                <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                      ✅
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">
                        Falla Resuelta
                      </h3>
                      <p className="text-sm text-gray-600">
                        Esta falla ya ha sido resuelta. No requiere más acciones.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                        ⚙️
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-2">
                          Gestionar Resolución
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Esta falla ya tiene una ejecución activa. Puedes actualizarla, agregar repuestos si aplica o resolverla.
                        </p>
                        <button
                          onClick={handleCreateWorkOrder}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                        >
                          Resolver Falla
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Botón cerrar */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de proceso de resolución */}
      {showProcessModal && (
        <WorkOrderProcessModal
          isOpen={showProcessModal}
          onClose={async (updatedWorkOrder) => {
            // No cerrar inmediatamente, esperar a que el usuario vea el resultado
            setShowProcessModal(false);
            
            // Si la orden fue resuelta, mostrar mensaje de éxito
            if (updatedWorkOrder?.status === 'RESUELTA') {
              await Swal.fire({
                title: '✅ Éxito',
                text: 'Orden de trabajo gestionada exitosamente',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            }
            
            // Luego cerrar los modales y actualizar
            onClose();
            if (onSuccess) onSuccess();
          }}
          workOrder={createdExecution || effectiveExecution}
          failureId={failure.id}
          onUpdate={handleProcessSuccess}
          user={user}
        />
      )}
    </>
  );
};

export default ManageFailureModal;

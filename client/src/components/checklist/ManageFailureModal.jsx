'use client'

import React, { useState } from 'react';
import WorkOrderProcessModal from './WorkOrderProcessModal';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';

/**
 * Gestión de falla desde el libro de fallas — flujo AR primero, OT opcional con repuestos.
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
  const [createdWorkOrder, setCreatedWorkOrder] = useState(null);

  if (!show || !failure) return null;

  const hasWorkOrder = !!failure.workOrder;
  const isResolved = hasWorkOrder && ['RESUELTA', 'CANCELADO'].includes(failure.workOrder?.status);

  const handleCreateWorkOrder = async () => {
    if (hasWorkOrder) {
      // Si ya tiene OT, solo abrir el modal de proceso
      setShowProcessModal(true);
      return;
    }

    setCreatingRepair(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      // Crear la WorkOrder usando axiosInstance (ya tiene el token configurado)
      const response = await axiosInstance.post(`${API_URL}/api/work-orders/create-for-failure`, {
        failure_order_id: failure.id,
        created_by_id: user.user_id
      });

      if (response.data.success) {
        setCreatedWorkOrder(response.data.data);

        // Mostrar el SweetAlert primero
        await Swal.fire({
          title: '✅ Orden de Trabajo Creada',
          text: `OT ${response.data.data.work_order_id} creada exitosamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Luego abrir el modal de proceso
        setShowProcessModal(true);
      } else {
        throw new Error(response.data.error?.message || 'Error al crear la orden de trabajo');
      }
    } catch (error) {
      console.error('Error creando OT:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.error?.message || error.message || 'No se pudo crear la orden de trabajo',
        icon: 'error'
      });
    } finally {
      setCreatingRepair(false);
    }
  };

  const openOtProcess = () => {
    if (!failure.workOrder) return;
    setProcessRecord({
      ...failure.workOrder,
      failure_order_id: failure.id,
      description: failure.description
    });
    setShowProcessModal(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Resolver falla</h2>
                <p className="text-sm text-gray-600">
                  {failure.failure_order_id || `OF-${failure.id}`}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700">{failure.description}</p>
            </div>

            <div className="space-y-4">
              {!hasWorkOrder ? (
                // Sin OT: Opción de crear
                <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                      🔧
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">
                        Crear Orden de Trabajo
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Esta falla no tiene una orden de trabajo. Crea una para poder gestionarla y resolverla.
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
                          'Crear Orden de Trabajo'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isResolved ? (
                // Resuelta: Solo información
                <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                  <h3 className="font-bold text-gray-900 mb-2">
                    {effectiveStatus === 'CANCELADO' ? 'Falla cancelada' : 'Falla resuelta'}
                  </h3>
                  <p className="text-sm text-gray-600">No requiere más acciones de resolución.</p>
                </div>
              ) : (
                // Con OT activa: Opción de gestionar
                <div className="space-y-4">
                  <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                        ⚙️
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-2">
                          Gestionar Orden de Trabajo
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Esta falla tiene una orden de trabajo activa. Puedes actualizarla o resolverla.
                        </p>
                        <button
                          onClick={handleCreateWorkOrder}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                        >
                          Gestionar Orden de Trabajo
                        </button>
                      </div>
                    </div>
                  </div>

                  {hasFormalWorkOrder && (
                    <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                      <h3 className="font-bold text-orange-900 mb-2">Orden de Trabajo (OT)</h3>
                      <p className="text-sm text-orange-800 mb-4">
                        OT formal con repuestos: {failure.workOrder.work_order_id}
                      </p>
                      <button
                        onClick={openOtProcess}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                      >
                        Gestionar OT
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de proceso de OT */}
      {showProcessModal && (
        <WorkOrderProcessModal
          isOpen={showProcessModal}
          onClose={async (updated) => {
            setShowProcessModal(false);
            if (updated?.status === 'RESUELTA') {
              await Swal.fire({
                title: '✅ Falla resuelta',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
              onClose();
              onSuccess?.();
              return;
            }
            onSuccess?.();
          }}
          workOrder={createdWorkOrder || failure.workOrder}
          onUpdate={handleProcessSuccess}
          user={user}
        />
      )}
    </>
  );
};

export default ManageFailureModal;

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
  const [creatingRepair, setCreatingRepair] = useState(false);
  const [processRecord, setProcessRecord] = useState(null);

  if (!show || !failure) return null;

  const hasRepairExecution = !!failure.repairExecution;
  const hasFormalWorkOrder = !!failure.workOrder;
  const effectiveStatus = failure.repairExecution?.status || failure.workOrder?.status || null;
  const isClosed = ['RESUELTA', 'CANCELADO'].includes(effectiveStatus);

  const openProcessModal = async () => {
    if (hasRepairExecution) {
      setProcessRecord({
        ...failure.repairExecution,
        isRepairAct: true,
        failure_order_id: failure.id,
        description: failure.description,
        formalWorkOrderId: failure.workOrder?.id || null
      });
      setShowProcessModal(true);
      return;
    }

    setCreatingRepair(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
      const response = await axiosInstance.post(`${API_URL}/api/work-orders/create-for-failure`, {
        failure_order_id: failure.id,
        created_by_id: user.user_id
      });

      if (response.data.success) {
        const ar = response.data.data;
        setProcessRecord({
          ...ar,
          isRepairAct: true,
          failure_order_id: failure.id,
          description: failure.description
        });
        setShowProcessModal(true);
      } else {
        throw new Error(response.data.error?.message || 'Error al crear acta de reparación');
      }
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.error?.message || error.message || 'No se pudo iniciar la resolución',
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
              {isClosed ? (
                <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                  <h3 className="font-bold text-gray-900 mb-2">
                    {effectiveStatus === 'CANCELADO' ? 'Falla cancelada' : 'Falla resuelta'}
                  </h3>
                  <p className="text-sm text-gray-600">No requiere más acciones de resolución.</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                    <h3 className="font-bold text-blue-900 mb-2">Acta de Reparación (AR)</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      Registra actividad, evidencia, firma y horas trabajadas.
                      {hasRepairExecution && (
                        <span className="block mt-1 font-medium">
                          AR: {failure.repairExecution.repair_execution_id}
                        </span>
                      )}
                    </p>
                    <button
                      onClick={openProcessModal}
                      disabled={creatingRepair}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    >
                      {creatingRepair ? 'Iniciando...' : hasRepairExecution ? 'Continuar resolución' : 'Iniciar resolución'}
                    </button>
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

      {showProcessModal && processRecord && (
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
          workOrder={processRecord}
          onUpdate={() => {}}
          user={user}
        />
      )}
    </>
  );
};

export default ManageFailureModal;

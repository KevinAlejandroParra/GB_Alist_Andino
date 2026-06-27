'use client'

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';

const SyncSolutionModal = ({
  show,
  onClose,
  targetFailure,
  user,
  onSuccess
}) => {
  const [sourceFailureId, setSourceFailureId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourcePreview, setSourcePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  if (!show || !targetFailure) return null;

  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

  const handleSearchSource = async () => {
    const id = parseInt(sourceFailureId);
    if (!id || isNaN(id)) {
      Swal.fire('Error', 'Ingrese un ID de falla numérico válido', 'error');
      return;
    }

    setPreviewLoading(true);
    setSourcePreview(null);
    try {
      const response = await axiosInstance.get(`${API_URL}/api/failures/${id}`);
      if (response.data.success) {
        const failure = response.data.data;
        const ar = failure.repairExecution;
        const ot = failure.workOrder;

        if (!ar) {
          Swal.fire('Sin solución', 'La falla seleccionada no tiene un Acta de Reparación registrada', 'warning');
          return;
        }

        const isResolved = ['RESUELTA', 'CANCELADO'].includes(ar?.status);
        if (!isResolved) {
          Swal.fire('No resuelta', 'La falla seleccionada no está resuelta. Solo se puede sincronizar desde fallas resueltas.', 'warning');
          return;
        }

        setSourcePreview(failure);
      }
    } catch (error) {
      console.error('Error buscando falla:', error);
      Swal.fire('Error', error.response?.data?.error?.message || 'No se encontró la falla especificada', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSync = async () => {
    if (!sourcePreview) return;

    setLoading(true);
    try {
      const response = await axiosInstance.post(`${API_URL}/api/failures/${targetFailure.id}/sync-solution`, {
        source_failure_id: sourcePreview.id
      });

      if (response.data.success) {
        await Swal.fire({
          title: 'Solución Sincronizada',
          html: `
            <div class="text-left">
              <p class="mb-2">✓ AR y OT sincronizadas exitosamente desde la falla fuente.</p>
              <p class="text-sm text-gray-600">Los cambios futuros se propagarán automáticamente entre ambas fallas.</p>
            </div>
          `,
          icon: 'success',
          timer: 3000,
          showConfirmButton: true
        });
        onClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error sincronizando solución:', error);
      Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo sincronizar la solución', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sincronizar Solución</h2>
              <p className="text-sm text-gray-600">
                Copia la solución (AR + OT) de una falla ya resuelta a esta falla
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
          </div>

          {/* Falla destino info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Falla destino</h3>
            <p className="text-sm text-gray-700">
              <span className="font-mono text-blue-600">{targetFailure.failure_order_id || `OF-${targetFailure.id}`}</span>
              {' — '}{targetFailure.description}
            </p>
          </div>

          {/* Buscar falla fuente */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Buscar falla fuente (resuelta)</h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={sourceFailureId}
                onChange={(e) => { setSourceFailureId(e.target.value); setSourcePreview(null); }}
                placeholder="Ingrese el ID numérico de la falla fuente"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearchSource}
                disabled={!sourceFailureId || previewLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {previewLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Buscando...
                  </>
                ) : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Vista previa fuente */}
          {sourcePreview && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>✅</span> Falla fuente encontrada
              </h3>
              <div className="space-y-3 bg-white rounded-lg p-4 border border-green-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">ID / OF</span>
                    <span className="font-mono text-sm font-semibold text-blue-600">
                      {sourcePreview.failure_order_id || `OF-${sourcePreview.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">Estado AR</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sourcePreview.repairExecution?.status === 'RESUELTA'
                        ? 'bg-green-100 text-green-800'
                        : sourcePreview.repairExecution?.status === 'CANCELADO'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sourcePreview.repairExecution?.status || 'Sin AR'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-600 block">Descripción</span>
                  <p className="text-sm text-gray-700">{sourcePreview.description}</p>
                </div>

                {sourcePreview.repairExecution?.activity_performed && (
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">Actividad realizada</span>
                    <p className="text-sm text-gray-700">{sourcePreview.repairExecution.activity_performed}</p>
                  </div>
                )}

                {sourcePreview.workOrder && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <span className="text-xs font-medium text-orange-700 block mb-1">
                      Esta falla también tiene OT (Orden de Trabajo) que se sincronizará
                    </span>
                    <span className="font-mono text-xs text-orange-600">
                      {sourcePreview.workOrder.work_order_id}
                    </span>
                    {sourcePreview.workOrder.parts?.length > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        {sourcePreview.workOrder.parts.length} repuesto(s) incluido(s)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleSync}
                disabled={loading}
                className="mt-4 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <span>Sincronizar Solución</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncSolutionModal;

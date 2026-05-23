'use client'

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';

/**
 * Modal de Eliminación de Falla con Múltiples Advertencias
 * 
 * Este componente muestra un proceso de confirmación en 2 pasos
 * para eliminar permanentemente una orden de falla.
 * 
 * ⚠️ ADVERTENCIAS:
 * - La eliminación es PERMANENTE e IRREVERSIBLE
 * - Se elimina la falla, su WorkOrder, repuestos y la imagen del servidor
 */
const DeleteFailureModal = ({ show, onClose, failure, onSuccess }) => {
  const [step, setStep] = useState(1); // Paso actual del proceso (1 o 2)
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [understood, setUnderstood] = useState(false);

  // Texto que el usuario debe escribir para confirmar
  const CONFIRMATION_TEXT = 'ELIMINAR PERMANENTEMENTE';

  // Resetear el modal cuando se cierra
  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    setUnderstood(false);
    onClose();
  };

  // Avanzar al siguiente paso
  const handleNextStep = () => {
    if (step === 1 && !understood) {
      Swal.fire({
        icon: 'warning',
        title: 'Confirmación Requerida',
        text: 'Debes confirmar que entiendes las consecuencias antes de continuar',
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    setStep(step + 1);
  };

  // Retroceder al paso anterior
  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  // Ejecutar la eliminación
  const handleDelete = async () => {
    if (confirmText !== CONFIRMATION_TEXT) {
      Swal.fire({
        icon: 'error',
        title: 'Texto Incorrecto',
        text: `Debes escribir exactamente: "${CONFIRMATION_TEXT}"`,
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    // Confirmación final con SweetAlert2
    const finalConfirm = await Swal.fire({
      title: '⚠️ ÚLTIMA ADVERTENCIA',
      html: `
        <div class="text-left space-y-3">
          <p class="font-bold text-red-600">¿Estás ABSOLUTAMENTE seguro?</p>
          <p>Esta acción eliminará permanentemente:</p>
          <ul class="list-disc list-inside text-sm space-y-1 text-gray-700">
            <li>La orden de falla <strong>${failure.failure_order_id || `OF-${failure.id}`}</strong></li>
            <li>Su orden de trabajo asociada (si existe)</li>
            <li>Todos los repuestos vinculados</li>
            <li>La imagen de evidencia del servidor</li>
          </ul>
          <p class="font-bold text-red-600 mt-4">Esta acción NO se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!finalConfirm.isConfirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.delete(`${API_URL}/api/failures/${failure.id}`);

      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Falla Eliminada',
          text: 'La orden de falla ha sido eliminada permanentemente',
          confirmButtonColor: '#10b981'
        });

        handleClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error(response.data.error?.message || 'Error al eliminar la falla');
      }
    } catch (error) {
      console.error('Error eliminando falla:', error);
      
      let errorMessage = 'No se pudo eliminar la orden de falla';
      
      if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para eliminar órdenes de falla.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Error al Eliminar',
        text: errorMessage,
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                <span>⚠️</span>
                <span>Eliminar Orden de Falla</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Paso {step} de 2
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Información de la Falla */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">Falla a Eliminar:</h3>
            <div className="space-y-1 text-sm">
              <p><strong>ID:</strong> {failure.failure_order_id || `OF-${failure.id}`}</p>
              <p><strong>Descripción:</strong> {failure.description}</p>
              {failure.workOrder && (
                <p><strong>Orden de Trabajo:</strong> {failure.workOrder.work_order_id || `OT-${failure.workOrder.id}`}</p>
              )}
            </div>
          </div>

          {/* Paso 1: Advertencia Principal */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                      ADVERTENCIA: Acción Irreversible
                    </h3>
                    <div className="text-sm text-yellow-700 space-y-2">
                      <p className="font-semibold">Esta acción eliminará PERMANENTEMENTE:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>La orden de falla y toda su información</li>
                        <li>La orden de trabajo asociada (si existe)</li>
                        <li>Todos los repuestos vinculados a la orden</li>
                        <li>La imagen de evidencia almacenada en el servidor</li>
                        <li>Todo el historial relacionado</li>
                      </ul>
                      <p className="font-bold mt-3 text-red-600">
                        ⚠️ NO EXISTE FORMA DE RECUPERAR ESTA INFORMACIÓN
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="mt-1 h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Entiendo que esta acción es permanente e irreversible</strong> y que toda la información relacionada con esta falla será eliminada del sistema sin posibilidad de recuperación.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!understood}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Confirmación Final */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4">
                <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                  <span>�</span>
                  <span>Confirmación Final Requerida</span>
                </h3>
                <p className="text-sm text-red-800 mb-4">
                  Para confirmar que realmente deseas eliminar esta orden de falla de forma permanente, 
                  escribe exactamente el siguiente texto en el campo de abajo:
                </p>
                <div className="bg-white border-2 border-red-300 rounded p-3 mb-4">
                  <p className="text-center font-mono font-bold text-red-600 text-lg">
                    {CONFIRMATION_TEXT}
                  </p>
                </div>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Escribe el texto de confirmación aquí"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none font-mono"
                  disabled={isDeleting}
                />
                {confirmText && confirmText !== CONFIRMATION_TEXT && (
                  <p className="text-sm text-red-600 mt-2">
                    ⚠️ El texto no coincide. Debe ser exactamente: "{CONFIRMATION_TEXT}"
                  </p>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 text-center">
                  <strong>Última oportunidad:</strong> Una vez que hagas clic en "Eliminar Permanentemente", 
                  no habrá forma de recuperar esta información.
                </p>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <button
                  onClick={handlePreviousStep}
                  disabled={isDeleting}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  ← Atrás
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || confirmText !== CONFIRMATION_TEXT}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        <span>Eliminar Permanentemente</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Indicador de Progreso */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {[1, 2].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`h-2 w-24 rounded-full transition-colors ${
                      stepNumber <= step ? 'bg-red-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {step === 1 && 'Advertencia'}
                {step === 2 && 'Confirmación Final'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteFailureModal;

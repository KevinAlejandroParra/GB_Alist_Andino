'use client'

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';

/**
 * Cancelar falla — conserva historial (reemplaza eliminación permanente).
 * Devuelve repuestos al inventario y cancela requisiciones abiertas.
 */
const CancelFailureModal = ({ show, onClose, failure, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleCancel = async () => {
    if (!reason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Motivo requerido',
        text: 'Indique por qué se cancela esta falla',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    const confirmed = await Swal.fire({
      title: '¿Cancelar esta falla?',
      html: `
        <p class="text-sm text-gray-600">La falla dejará de aparecer como activa pero permanecerá en el historial.</p>
        <p class="text-sm text-gray-600 mt-2">Los repuestos usados se devolverán al inventario.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cancelar falla',
      cancelButtonText: 'Volver'
    });

    if (!confirmed.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
      const response = await axiosInstance.put(
        `${API_URL}/api/failures/${failure.id}/cancel`,
        { reason: reason.trim() }
      );

      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Falla cancelada',
          text: 'La falla fue archivada y permanece disponible en el historial',
          confirmButtonColor: '#10b981'
        });
        handleClose();
        onSuccess?.();
      } else {
        throw new Error(response.data.error?.message || 'Error al cancelar');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error?.message || error.message || 'No se pudo cancelar la falla',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-red-600">Cancelar falla</h2>
              <p className="text-sm text-gray-500 mt-1">
                {failure.failure_order_id || `OF-${failure.id}`}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-700 mb-4">{failure.description}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-900">
            La falla no se elimina. Quedará como <strong>cancelada</strong> en el historial.
            En el PDF del día de reporte se verá con su motivo; al día siguiente solo aparecerá Cumple.
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de cancelación *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
            placeholder="Ej: reporte duplicado, error de operador..."
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Volver
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelando...' : 'Cancelar falla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelFailureModal;

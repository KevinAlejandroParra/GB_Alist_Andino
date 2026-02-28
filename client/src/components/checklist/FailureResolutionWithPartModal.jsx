'use client'

import React, { useState } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';

const FailureResolutionWithPartModal = ({ 
  show, 
  onClose, 
  onSuccess,
  failureData,
  partUsageData 
}) => {
  const [resolutionConfirmed, setResolutionConfirmed] = useState(true);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [responsibleArea, setResponsibleArea] = useState('Técnico');
  const [loading, setLoading] = useState(false);
  const [needsNewFailure, setNeedsNewFailure] = useState(false);
  const [newFailureDescription, setNewFailureDescription] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

  const handleResolution = async () => {
    if (!solutionText.trim()) {
      Swal.fire('Error', 'Debe proporcionar una descripción de la solución', 'error');
      return;
    }

    setLoading(true);
    try {
      // Resolver la falla actual
      const resolutionData = {
        failureId: failureData.id,
        solutionText,
        resolutionDetails,
        responsibleArea,
        partUsageId: partUsageData.inventoryUsageId,
        resolutionConfirmed,
        autoDeduction: partUsageData.autoDeduction
      };

      const response = await axiosInstance.post(`${API_URL}/api/failures/resolve-with-part`, resolutionData);

      if (response.data.success) {
        if (resolutionConfirmed) {
          // Falla resuelta exitosamente
          Swal.fire({
            title: '✅ Falla Resuelta',
            text: 'La falla ha sido resuelta exitosamente y el repuesto ha sido descontado del inventario.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });

          onSuccess({
            action: 'resolved',
            data: response.data.data,
            partUsage: partUsageData
          });
        } else {
          // Falla no resuelta, crear nueva falla o mantener existente
          if (needsNewFailure && newFailureDescription.trim()) {
            // Crear nueva falla
            const newFailureData = {
              originalFailureId: failureData.id,
              description: newFailureDescription,
              severity: failureData.severity,
              inspectableId: failureData.inspectable_id,
              checklistResponseId: failureData.checklist_response_id,
              checklistItemId: failureData.checklist_item_id,
              reportedBy: failureData.reported_by_id,
              relatedToPartUsage: partUsageData.inventoryUsageId,
              reasonForNewFailure: 'Falla anterior no resuelta completamente'
            };

            const newFailureResponse = await axiosInstance.post(`${API_URL}/api/failures/create-new-from-existing`, newFailureData);

            if (newFailureResponse.data.success) {
              Swal.fire({
                title: '⚠️ Nueva Falla Creada',
                text: 'Se ha creado una nueva falla debido a que la falla original no quedó completamente resuelta.',
                icon: 'info',
                confirmButtonText: 'Aceptar'
              });

              onSuccess({
                action: 'new_failure_created',
                originalData: response.data.data,
                newData: newFailureResponse.data.data,
                partUsage: partUsageData
              });
            }
          } else {
            // Mantener la falla existente
            Swal.fire({
              title: '🔄 Falla Mantenida',
              text: 'La falla se mantiene activa para seguimiento continuo.',
              icon: 'warning',
              confirmButtonText: 'Aceptar'
            });

            onSuccess({
              action: 'maintained',
              data: response.data.data,
              partUsage: partUsageData
            });
          }
        }

        onClose();
      }
    } catch (error) {
      console.error('Error resolviendo falla:', error);
      Swal.fire('Error', 'No se pudo resolver la falla', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPartUsageSummary = () => {
    if (!partUsageData) return null;

    return {
      name: partUsageData.partData?.item_name || partUsageData.partData?.name,
      quantity: partUsageData.quantityUsed,
      location: partUsageData.partData?.location,
      autoDeduction: partUsageData.autoDeduction
    };
  };

  const partSummary = getPartUsageSummary();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {resolutionConfirmed ? '✅ Resolver Falla con Repuesto' : '⚠️ Falla No Resuelta'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Información del repuesto usado */}
          {partSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">📦 Repuesto Utilizado:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                <div><strong>Nombre:</strong> {partSummary.name}</div>
                <div><strong>Cantidad:</strong> {partSummary.quantity}</div>
                <div><strong>Ubicación:</strong> {partSummary.location}</div>
                <div><strong>Tipo:</strong> {partSummary.autoDeduction ? 'Descuento Automático' : 'Manual'}</div>
              </div>
              {partSummary.autoDeduction && (
                <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-green-800 text-xs">
                  ✅ El repuesto ya ha sido descontado automáticamente del inventario
                </div>
              )}
            </div>
          )}

          {/* Información de la falla */}
          {failureData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">🔧 Falla:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <div><strong>ID:</strong> {failureData.id}</div>
                <div><strong>Severidad:</strong> {failureData.severity}</div>
                <div><strong>Descripción:</strong> {failureData.description?.substring(0, 50)}...</div>
                <div><strong>Estado:</strong> {failureData.status}</div>
              </div>
            </div>
          )}

          {/* Pregunta de resolución */}
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-yellow-900 mb-2">🔍 ¿La falla quedó resuelta?</h4>
              <p className="text-sm text-yellow-700">
                Indique si el uso del repuesto resolvió completamente el problema detectado.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  checked={resolutionConfirmed}
                  onChange={() => setResolutionConfirmed(true)}
                  className="form-radio text-green-600"
                />
                <div>
                  <span className="text-lg">✅</span>
                  <span className="ml-2 font-medium text-green-700">Sí, la falla quedó resuelta</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  checked={!resolutionConfirmed}
                  onChange={() => setResolutionConfirmed(false)}
                  className="form-radio text-red-600"
                />
                <div>
                  <span className="text-lg">❌</span>
                  <span className="ml-2 font-medium text-red-700">No, la falla no quedó resuelta</span>
                </div>
              </label>
            </div>
          </div>

          {/* Formulario de resolución */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solución aplicada: *
              </label>
              <textarea
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
                placeholder="Describa la solución que se aplicó con el repuesto..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detalles de la reparación:
              </label>
              <textarea
                value={resolutionDetails}
                onChange={(e) => setResolutionDetails(e.target.value)}
                placeholder="Detalles técnicos adicionales de la reparación..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área responsable: *
              </label>
              <select
                value={responsibleArea}
                onChange={(e) => setResponsibleArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Técnico">Técnico</option>
                <option value="Operación">Operación</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
          </div>

          {/* Si la falla no se resolvió, opciones adicionales */}
          {!resolutionConfirmed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-red-900 mb-3">⚠️ Acción para falla no resuelta:</h4>
              
              <div className="space-y-3 mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="newFailure"
                    checked={needsNewFailure}
                    onChange={() => setNeedsNewFailure(true)}
                    className="form-radio text-blue-600"
                  />
                  <div>
                    <span className="text-lg">➕</span>
                    <span className="ml-2 font-medium text-blue-700">Crear nueva falla</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="newFailure"
                    checked={!needsNewFailure}
                    onChange={() => setNeedsNewFailure(false)}
                    className="form-radio text-gray-600"
                  />
                  <div>
                    <span className="text-lg">🔄</span>
                    <span className="ml-2 font-medium text-gray-700">Mantener falla existente</span>
                  </div>
                </label>
              </div>

              {needsNewFailure && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción de la nueva falla: *
                  </label>
                  <textarea
                    value={newFailureDescription}
                    onChange={(e) => setNewFailureDescription(e.target.value)}
                    placeholder="Describa la nueva falla que se debe crear..."
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    required
                  />
                </div>
              )}

              <div className="mt-3 text-xs text-red-600">
                <strong>Nota:</strong> Si crea una nueva falla, la falla original quedará resuelta 
                y se creará una nueva para el seguimiento continuo.
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleResolution}
              disabled={loading || !solutionText.trim() || (!resolutionConfirmed && needsNewFailure && !newFailureDescription.trim())}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : resolutionConfirmed ? '✅ Resolver Falla' : '⚠️ Procesar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FailureResolutionWithPartModal;
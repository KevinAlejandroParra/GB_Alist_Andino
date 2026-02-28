'use client'

import React, { useState, useEffect } from 'react';
import useFailureRequisitionSystem from './hooks/useFailureRequisitionSystem';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

const ResolveFailureWithPartModal = ({ 
  show, 
  onClose, 
  failure,
  onSuccess 
}) => {
  const { user } = useAuth();
  const failureSystem = useFailureRequisitionSystem();
  
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantityToUse, setQuantityToUse] = useState(0);
  const [formData, setFormData] = useState({
    resolutionDetails: '',
    resolutionText: '',
    partsUsed: []
  });

  const [loading, setLoading] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);

  // Cargar repuestos disponibles cuando se abre el modal
  useEffect(() => {
    if (show && failure?.id) {
      loadAvailableParts();
    }
  }, [show, failure?.id]);

  const loadAvailableParts = async () => {
    setLoadingParts(true);
    try {
      const result = await failureSystem.getAvailablePartsForFailure(failure.id);
      if (result.success) {
        setAvailableParts(result.data.availableParts || []);
        setSelectedPart(result.data.requestedPart || null);
        
        // Pre-llenar cantidad con la solicitada si existe
        if (result.data.requestedPart?.quantity_available) {
          setQuantityToUse(1); // Default 1 unidad
        }
      }
    } catch (error) {
      console.error('Error cargando repuestos:', error);
    } finally {
      setLoadingParts(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePartSelect = (part) => {
    setSelectedPart(part);
    setQuantityToUse(part ? 1 : 0);
  };

  const handleQuantityChange = (quantity) => {
    const qty = Math.max(0, Math.min(quantity, selectedPart?.quantity_available || 0));
    setQuantityToUse(qty);
  };

  const handleAddPart = () => {
    if (!selectedPart || quantityToUse <= 0) return;

    const newPart = {
      inventoryId: selectedPart.id,
      quantityUsed: quantityToUse,
      location: selectedPart.location,
      partName: selectedPart.part_name,
      unitCost: selectedPart.unit_cost || 0
    };

    setFormData(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, newPart]
    }));

    // Reset selection
    setSelectedPart(null);
    setQuantityToUse(0);
  };

  const handleRemovePart = (index) => {
    setFormData(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== index)
    }));
  };

  const getTotalCost = () => {
    return formData.partsUsed.reduce((total, part) => {
      return total + (part.quantityUsed * part.unitCost);
    }, 0);
  };

  const getStatusChip = (status) => {
    const statusMap = {
      'REPORTADO': { label: 'Reportado', color: 'bg-blue-100 text-blue-800' },
      'ANALIZANDO': { label: 'Analizando', color: 'bg-yellow-100 text-yellow-800' },
      'ESPERANDO_REPUESTO': { label: 'Esperando Repuesto', color: 'bg-orange-100 text-orange-800' },
      'EN_REPARACION': { label: 'En Reparación', color: 'bg-purple-100 text-purple-800' },
      'RESUELTO': { label: 'Resuelto', color: 'bg-green-100 text-green-800' },
      'CERRADO': { label: 'Cerrado', color: 'bg-gray-100 text-gray-800' }
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getSeverityChip = (severity) => {
    const severityMap = {
      'LEVE': { label: 'Leve', color: 'bg-green-100 text-green-800' },
      'MODERADA': { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800' },
      'CRITICA': { label: 'Crítica', color: 'bg-red-100 text-red-800' }
    };
    
    const severityInfo = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityInfo.color}`}>
        {severityInfo.label}
      </span>
    );
  };

  const handleResolve = async () => {
    if (!user) {
      Swal.fire('Error', 'Usuario no autenticado', 'error');
      return;
    }

    // Validaciones
    if (!formData.resolutionDetails.trim()) {
      Swal.fire('Error', 'Los detalles de la resolución son requeridos', 'error');
      return;
    }

    if (formData.partsUsed.length === 0) {
      Swal.fire('Error', 'Debe agregar al menos un repuesto utilizado', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await failureSystem.resolveFailureWithPart(failure.id, {
        resolutionDetails: formData.resolutionDetails,
        resolutionText: formData.resolutionText,
        partsUsed: formData.partsUsed,
        quantityUsed: formData.partsUsed.reduce((total, part) => total + part.quantityUsed, 0)
      });

      if (result.success) {
        Swal.fire({
          title: '¡Falla Resuelta!',
          text: 'La falla ha sido marcada como resuelta y el inventario actualizado.',
          icon: 'success',
          timer: 3000,
          showConfirmButton: true
        });

        if (onSuccess) {
          onSuccess(result.data);
        }
        
        onClose();
      } else {
        Swal.fire('Error', result.error, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'Error interno del servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              🔧 Resolver Falla con Descuento de Inventario
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda: Información de la Falla */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-medium text-blue-900 mb-3">📋 Información de la Falla</h3>
                
                {failure && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ID Falla:</label>
                      <p className="text-sm text-gray-900 font-mono">{failure.failure_order_id || `OF-${failure.id}`}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Descripción:</label>
                      <p className="text-sm text-gray-900">{failure.description}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Estado:</label>
                      <div className="mt-1">
                        {getStatusChip(failure.status)}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Severidad:</label>
                      <div className="mt-1">
                        {getSeverityChip(failure.severity)}
                      </div>
                    </div>

                    {failure.reported_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Reportado:</label>
                        <p className="text-sm text-gray-900">
                          {new Date(failure.reported_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {failure.requested_part_info && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Repuesto Solicitado:</label>
                        <div className="mt-1 p-2 bg-white rounded border">
                          <p className="text-sm font-medium">{failure.requested_part_info.name}</p>
                          <p className="text-xs text-gray-600">Cantidad: {failure.requested_part_info.quantity}</p>
                          <p className="text-xs text-gray-600">Urgencia: {failure.requested_part_info.urgency}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Repuestos Utilizados */}
              <div className="bg-green-50 p-4 rounded-md">
                <h3 className="font-medium text-green-900 mb-3">🛠️ Repuestos a Utilizar</h3>
                
                {formData.partsUsed.length === 0 ? (
                  <p className="text-sm text-gray-600">No se han agregado repuestos</p>
                ) : (
                  <div className="space-y-2">
                    {formData.partsUsed.map((part, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{part.partName}</p>
                            <p className="text-xs text-gray-600">
                              Cantidad: {part.quantityUsed} | {part.location}
                            </p>
                            {part.unitCost > 0 && (
                              <p className="text-xs text-gray-600">
                                Costo: ${(part.quantityUsed * part.unitCost).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemovePart(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-2 mt-3">
                      <p className="text-sm font-medium">
                        Total de Repuestos: {formData.partsUsed.reduce((total, part) => total + part.quantityUsed, 0)}
                      </p>
                      {getTotalCost() > 0 && (
                        <p className="text-sm font-medium">
                          Costo Total: ${getTotalCost().toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Central: Repuestos Disponibles */}
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-md">
                <h3 className="font-medium text-yellow-900 mb-3">📦 Repuestos Disponibles</h3>
                
                {loadingParts ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-sm text-gray-600">Cargando repuestos...</span>
                  </div>
                ) : availableParts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">No hay repuestos disponibles</p>
                    <p className="text-xs text-gray-500 mt-1">Agregue repuestos manualmente en el campo de detalles</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableParts.map((part) => (
                      <div 
                        key={part.id} 
                        className={`bg-white p-3 rounded border cursor-pointer transition-colors ${
                          selectedPart?.id === part.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePartSelect(part)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{part.part_name}</p>
                            <p className="text-xs text-gray-600">
                              Disponible: {part.quantity} unidades
                            </p>
                            <p className="text-xs text-gray-600">
                              📍 {part.location}
                            </p>
                            {part.category && (
                              <p className="text-xs text-blue-600">
                                🏷️ {part.category}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {part.quantity > 0 ? (
                              <span className="text-green-600 text-xs">✓ Disponible</span>
                            ) : (
                              <span className="text-red-600 text-xs">✗ Agotado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Formulario de Resolución */}
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-md">
                <h3 className="font-medium text-purple-900 mb-3">✏️ Detalles de la Resolución</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detalles de la Resolución *
                    </label>
                    <textarea
                      value={formData.resolutionDetails}
                      onChange={(e) => handleInputChange('resolutionDetails', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={4}
                      placeholder="Describe los trabajos realizados, pasos seguidos, etc..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resumen de la Solución
                    </label>
                    <textarea
                      value={formData.resolutionText}
                      onChange={(e) => handleInputChange('resolutionText', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="Resumen breve de la solución aplicada..."
                    />
                  </div>

                  {/* Seleccionar cantidad del repuesto */}
                  {selectedPart && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-gray-900 mb-2">Agregar Repuesto</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{selectedPart.part_name}</span>
                        <input
                          type="number"
                          min="1"
                          max={selectedPart.quantity_available}
                          value={quantityToUse}
                          onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-600">/ {selectedPart.quantity_available} disponibles</span>
                      </div>
                      <button
                        onClick={handleAddPart}
                        disabled={!selectedPart || quantityToUse <= 0}
                        className="mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        ➕ Agregar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleResolve}
              disabled={loading || formData.partsUsed.length === 0}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resolviendo...
                </>
              ) : (
                <>
                  ✅ Marcar como Resuelto
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolveFailureWithPartModal;
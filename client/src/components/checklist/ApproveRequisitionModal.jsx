'use client'

import React, { useState, useEffect } from 'react';
import useFailureRequisitionSystem from './hooks/useFailureRequisitionSystem';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

const ApproveRequisitionModal = ({ 
  show, 
  onClose, 
  requisition,
  onSuccess 
}) => {
  const { user } = useAuth();
  const failureSystem = useFailureRequisitionSystem();
  
  const [formData, setFormData] = useState({
    location: 'Almacén Central',
    category: 'Repuesto',
    status: 'Disponible',
    notes: 'Aprobado automáticamente desde requisición',
    image_url: null
  });

  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Pre-cargar datos si se proporciona una requisición
  useEffect(() => {
    if (requisition) {
      setFormData(prev => ({
        ...prev,
        location: prev.location,
        category: requisition.part_reference || 'Repuesto',
        notes: `Aprobado para OT-${requisition.workOrder?.work_order_id || 'N/A'}${requisition.workOrder?.failureOrder?.failure_order_id ? ` (OF: ${requisition.workOrder.failureOrder.failure_order_id})` : ''}`
      }));
    }
  }, [requisition]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Solo se permiten archivos de imagen', 'error');
        return;
      }

      // Validar tamaño (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', 'La imagen no debe ser mayor a 5MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Aquí se manejaría la subida real del archivo
      setFormData(prev => ({
        ...prev,
        image_url: URL.createObjectURL(file) // Temporal para preview
      }));
    }
  };

  const handleApprove = async () => {
    if (!user) {
      Swal.fire('Error', 'Usuario no autenticado', 'error');
      return;
    }

    if (!requisition) {
      Swal.fire('Error', 'No se proporcionó requisición', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await failureSystem.approveRequisitionAndAddToInventory(
        requisition.id,
        formData
      );

      if (result.success) {
        Swal.fire({
          title: '¡Requisición Aprobada!',
          text: 'El repuesto ha sido agregado al inventario exitosamente.',
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

  const getLocationOptions = () => [
    'Almacén Central',
    'Almacén Técnico',
    'Almacén Operaciones',
    'Taller de Mantenimiento',
    'Depósito 1',
    'Depósito 2'
  ];

  const getStatusOptions = () => [
    { value: 'Disponible', label: '🟢 Disponible', color: 'text-green-600' },
    { value: 'Reservado', label: '🟡 Reservado', color: 'text-yellow-600' },
    { value: 'Agotado', label: '🔴 Agotado', color: 'text-red-600' }
  ];

  const getSeverityInfo = (severity) => {
    const info = {
      'LEVE': { label: 'Leve', color: 'text-green-600', bg: 'bg-green-100' },
      'MODERADA': { label: 'Moderada', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      'CRITICA': { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-100' }
    };
    return info[severity] || { label: severity, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              ✅ Aprobar Requisición y Agregar al Inventario
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Información de la Requisición */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-medium text-blue-900 mb-3">📋 Detalles de la Requisición</h3>
                
                {requisition && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ID Requisición:</label>
                      <p className="text-sm text-gray-900 font-mono">{requisition.id}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Repuesto Solicitado:</label>
                      <p className="text-sm text-gray-900 font-semibold">{requisition.part_reference}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                      <p className="text-sm text-gray-900">{requisition.quantity_requested} unidades</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Estado Actual:</label>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        {requisition.status}
                      </span>
                    </div>

                    {requisition.workOrder && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Orden de Trabajo:</label>
                        <p className="text-sm text-gray-900">{requisition.workOrder.work_order_id}</p>
                      </div>
                    )}

                    {requisition.workOrder?.failureOrder && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Falla Asociada:</label>
                        <div className="mt-1">
                          <p className="text-sm text-gray-900">{requisition.workOrder.failureOrder.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {(() => {
                              const severityInfo = getSeverityInfo(requisition.workOrder.failureOrder.severity);
                              return (
                                <span className={`px-2 py-1 ${severityInfo.bg} ${severityInfo.color} rounded-full text-xs`}>
                                  {severityInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {requisition.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Notas:</label>
                        <p className="text-sm text-gray-900">{requisition.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Información del Solicitante */}
              {requisition?.requester && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-2">👤 Solicitante</h4>
                  <p className="text-sm text-gray-900">{requisition.requester.user_name}</p>
                  <p className="text-xs text-gray-600">ID: {requisition.requester.user_id}</p>
                </div>
              )}
            </div>

            {/* Columna Derecha: Datos para Inventario */}
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-md">
                <h3 className="font-medium text-green-900 mb-3">📦 Datos para Agregar al Inventario</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación en Inventario *
                    </label>
                    <select
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {getLocationOptions().map(location => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Ej: Motor, Sensor, Batería..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado en Inventario
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {getStatusOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas Adicionales
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                      placeholder="Notas sobre el repuesto, ubicación específica, etc..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Imagen del Repuesto
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo 5MB. Formatos: JPG, PNG, GIF</p>
                  </div>

                  {previewImage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vista Previa
                      </label>
                      <img
                        src={previewImage}
                        alt="Vista previa"
                        className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                      />
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
              onClick={handleApprove}
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  ✅ Aprobar y Agregar al Inventario
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApproveRequisitionModal;
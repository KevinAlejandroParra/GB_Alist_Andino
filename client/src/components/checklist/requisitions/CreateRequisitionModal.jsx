'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../AuthContext';
import Swal from 'sweetalert2';
import { getLatestWorkOrderByUser } from '../../../utils/inventoryApi';

/**
 * Modal para crear una nueva requisición de repuesto
 * Se muestra cuando el usuario no encuentra el repuesto en el inventario
 */
const CreateRequisitionModal = ({
  show,
  onClose,
  onSuccess,
  workOrderId,
  partInfo,
  failureInfo
}) => {
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

  const [formData, setFormData] = useState({
    partReference: '',
    quantityRequested: 1,
    notes: '',
    urgencyLevel: 'NORMAL',
    image: null
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [obtainingWorkOrder, setObtainingWorkOrder] = useState(false);
  const [currentWorkOrderId, setCurrentWorkOrderId] = useState(workOrderId);


  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setFormData({
        partReference: partInfo?.name || '',
        quantityRequested: partInfo?.quantity || 1,
        notes: partInfo?.description || '',
        urgencyLevel: partInfo?.urgency || 'NORMAL',
        image: null
      });
      setErrors({});
      setCurrentWorkOrderId(workOrderId);
    }
  }, [show, partInfo, workOrderId]);

  // Función para obtener automáticamente la última orden de trabajo
  const obtainLatestWorkOrder = async () => {
    if (workOrderId && !isNaN(workOrderId)) {
      // Si ya tenemos un workOrderId válido, usarlo
      setCurrentWorkOrderId(workOrderId);
      return;
    }

    setObtainingWorkOrder(true);
    try {
      const result = await getLatestWorkOrderByUser();
      
      if (result.success) {
        setCurrentWorkOrderId(result.workOrderId);
        console.log('✅ Última orden de trabajo obtenida:', result.workOrderId);
      } else {
        setErrors({
          workOrderId: 'No se pudo obtener una orden de trabajo válida. Por favor, asegúrate de tener una orden de trabajo activa.'
        });
        console.warn('⚠️ No se pudo obtener workOrderId:', result.error);
      }
    } catch (error) {
      setErrors({
        workOrderId: 'Error al obtener la orden de trabajo. Intenta nuevamente.'
      });
      console.error('❌ Error obteniendo workOrderId:', error);
    } finally {
      setObtainingWorkOrder(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleFileChange = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
    // Clear error when user selects file
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
   const newErrors = {};

   if (!formData.partReference.trim()) {
     newErrors.partReference = 'El nombre del repuesto es requerido';
   }

   if (!formData.quantityRequested || formData.quantityRequested < 1) {
     newErrors.quantityRequested = 'La cantidad debe ser mayor a 0';
   }

   if (!formData.image) {
     newErrors.image = 'La foto del repuesto es obligatoria';
   }

   if (!currentWorkOrderId || isNaN(currentWorkOrderId)) {
     newErrors.workOrderId = 'No se ha especificado una orden de trabajo válida';
   }

   setErrors(newErrors);
   return Object.keys(newErrors).length === 0;
  };

  // Función para subir imagen
  const uploadImageToServer = async (file) => {
    if (!file) return null;

    setUploadingImage(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const formData = new FormData();
      formData.append("evidence", file);

      console.log('📤 Subiendo imagen:', file.name, 'Tamaño:', file.size);

      const response = await axiosInstance.post(`${API_URL}/api/checklists/upload-evidence`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log('📥 Respuesta de subida:', response.data);

      // Verificar si la respuesta contiene filePath
      const filePath = response.data?.filePath;
      if (!filePath) {
        throw new Error('La respuesta del servidor no contiene la ruta del archivo');
      }

      console.log('✅ Imagen subida exitosamente:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      throw new Error(`Error al subir imagen: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🚀 Iniciando creación de requisición...');
    console.log('📋 FormData actual:', formData);
    console.log('🆔 currentWorkOrderId:', currentWorkOrderId, 'isNaN:', isNaN(currentWorkOrderId));

    if (!user) {
      Swal.fire('Error', 'Usuario no autenticado', 'error');
      return;
    }

    // Si no tenemos workOrderId válido y aún no hemos intentado obtenerlo, intentarlo
    if (!currentWorkOrderId || isNaN(currentWorkOrderId)) {
      await obtainLatestWorkOrder();
      if (!currentWorkOrderId || isNaN(currentWorkOrderId)) {
        return; // La función ya mostró el error
      }
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Subir imagen (obligatoria)
      let imageUrl = null;
      try {
        imageUrl = await uploadImageToServer(formData.image);
      } catch (imageError) {
        console.error('Error subiendo imagen:', imageError);
        // Detener el proceso si no se puede subir la imagen obligatoria
        Swal.fire({
          title: 'Error',
          text: 'No se pudo subir la imagen del repuesto. Es obligatoria para crear la requisición.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        return;
      }

      const requisitionData = {
        workOrderId: currentWorkOrderId,
        partReference: formData.partReference.trim(),
        quantityRequested: parseInt(formData.quantityRequested),
        notes: formData.notes.trim(),
        urgencyLevel: formData.urgencyLevel,
        imageUrl // Agregar URL de imagen si se subió exitosamente
      };

      console.log('📋 Creando requisición:', requisitionData);

      const response = await axiosInstance.post(`${API_URL}/api/requisitions`, requisitionData);

      if (response.data.success) {
        console.log('✅ Requisición creada exitosamente:', response.data.data);

        Swal.fire({
          title: '✅ Requisición Creada',
          text: `Se ha creado la requisición #${response.data.data.id} para el repuesto "${formData.partReference}".`,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });

        if (onSuccess) {
          onSuccess({
            action: 'requisition_created',
            requisition: response.data.data,
            partInfo: formData,
            imageUrl: imageUrl
          });
        }

        onClose();
      } else {
        throw new Error(response.data.error?.message || 'Error desconocido');
      }

    } catch (error) {
      console.error('❌ Error creando requisición:', error);

      const errorMessage = error.response?.data?.error?.message ||
                          error.response?.data?.message ||
                          error.message ||
                          'Error interno del servidor';

      Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      setLoading(false);
    }
  };

  const urgencyOptions = [
    { value: 'NORMAL', label: 'Normal', color: 'text-blue-600' },
    { value: 'URGENTE', label: 'Urgente', color: 'text-orange-600' },
    { value: 'EMERGENCY', label: 'Emergencia', color: 'text-red-600' }
  ];

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            📦 Solicitar Requisición de Repuesto
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Información del contexto */}
          {currentWorkOrderId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📋 Información del Contexto</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>OT:</strong> {`OT-${currentWorkOrderId}`}</p>
                {failureInfo && (
                  <p><strong>Falla:</strong> {failureInfo.description?.substring(0, 50)}...</p>
                )}
              </div>
            </div>
          )}

          {/* Repuesto solicitado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repuesto solicitado *
            </label>
            <input
              type="text"
              value={formData.partReference}
              onChange={(e) => handleInputChange('partReference', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.partReference ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: Motor de 12V, Sensor de proximidad..."
              required
            />
            {errors.partReference && (
              <p className="text-red-500 text-xs mt-1">{errors.partReference}</p>
            )}
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad requerida *
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantityRequested}
              onChange={(e) => handleInputChange('quantityRequested', parseInt(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.quantityRequested ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.quantityRequested && (
              <p className="text-red-500 text-xs mt-1">{errors.quantityRequested}</p>
            )}
          </div>

          {/* Urgencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel de urgencia
            </label>
            <select
              value={formData.urgencyLevel}
              onChange={(e) => handleInputChange('urgencyLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {urgencyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Imagen del repuesto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto del repuesto *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange('image', e.target.files[0])}
              className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
                errors.image ? 'border-red-500' : ''
              }`}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Sube una foto del repuesto (obligatorio)
            </p>
            {errors.image && (
              <p className="text-red-500 text-xs mt-1">{errors.image}</p>
            )}

            {/* Vista previa de imagen */}
            {formData.image && (
              <div className="mt-3">
                <img
                  src={URL.createObjectURL(formData.image)}
                  alt="Vista previa del repuesto"
                  className="max-w-32 max-h-32 object-cover rounded-lg border border-gray-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Especificaciones técnicas, marca, modelo, observaciones..."
            />
          </div>

          {/* Error general */}
          {errors.workOrderId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{errors.workOrderId}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploadingImage || !formData.image}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploadingImage ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploadingImage ? 'Subiendo imagen...' : 'Creando...'}
              </>
            ) : (
              '📦 Crear Requisición'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRequisitionModal;
'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import SignaturePad from './SignaturePad';
import { 
  getFailureSignaturesInfo, 
  createFailureReportSignature, 
  canUserCreateReportSignature 
} from '../../utils/failureSignaturesApi';

const StandaloneFailureModal = ({
  show,
  onClose,
  inspectableId: propInspectableId,
  onSuccess
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const initialFormData = {
    description: '',
    tipoMantenimiento: 'TECNICA',
    severity: 'LEVE',
    assignedTo: 'TECNICA', // 'TECNICA' o 'OPERATIVA'
    inspectableId: propInspectableId || '',
    evidenceFile: null,
    evidencePreview: null,
    signatureData: null,
    // reportedBy se obtiene automáticamente del token
  };

  const [formData, setFormData] = useState(initialFormData);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [inspectables, setInspectables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInspectables, setLoadingInspectables] = useState(false);

  useEffect(() => {
    if (show) {
      setFormData(initialFormData);
      loadInspectables();
    }
  }, [show]);

  const loadInspectables = async () => {
    console.log('🚀 Iniciando carga de inspectables...');
    setLoadingInspectables(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      console.log('🔍 Cargando inspectables desde:', `${API_URL}/api/inspectables`);
      
      const response = await axiosInstance.get('/api/inspectables');
      console.log('📦 Respuesta completa:', response);
      console.log('📦 Status:', response.status);
      console.log('📦 Data:', response.data);
      
      if (response.data && response.data.success) {
        console.log('✅ Inspectables cargados:', response.data.data);
        setInspectables(response.data.data);
      } else {
        console.error('❌ Error en respuesta:', response.data);
      }
    } catch (error) {
      console.error('❌ Error cargando inspectables:', error.message);
      console.error('❌ Error details:', error);
    } finally {
      setLoadingInspectables(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEvidenceChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Solo se permiten archivos de imagen', 'error');
        return;
      }
      
      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('Error', 'La imagen debe ser menor a 10MB', 'error');
        return;
      }

      setFormData(prev => ({
        ...prev,
        evidenceFile: file,
        evidencePreview: URL.createObjectURL(file)
      }));
    }
  };

  const removeEvidence = () => {
    setFormData(prev => ({
      ...prev,
      evidenceFile: null,
      evidencePreview: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSignatureSave = (signatureData) => {
    setFormData(prev => ({ ...prev, signatureData }));
    setShowSignaturePad(false);
  };

  const handleCloseSignaturePad = () => {
    setShowSignaturePad(false);
  };

  const createStandaloneFailure = async () => {
    // Validaciones obligatorias
    if (!formData.description.trim()) {
      Swal.fire('Error', 'La descripción de la falla es requerida', 'error');
      return;
    }

    if (!formData.evidenceFile) {
      Swal.fire('Error', 'La evidencia es obligatoria', 'error');
      return;
    }

    if (!formData.signatureData) {
      Swal.fire('Error', 'La firma es obligatoria', 'error');
      setShowSignaturePad(true);
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      const submitData = new FormData();
      submitData.append('description', formData.description);
      submitData.append('tipo_maintenance', formData.tipoMantenimiento);
      submitData.append('severity', formData.severity);
      submitData.append('assigned_to', formData.assignedTo);
      
      // Agregar inspectableId solo si se seleccionó uno
      if (formData.inspectableId) {
        submitData.append('inspectableId', formData.inspectableId);
      }
      
      // Agregar evidencia (obligatorio)
      if (formData.evidenceFile) {
        submitData.append('evidence', formData.evidenceFile);
      }

      console.log('🚀 Enviando datos de falla independiente:', {
        description: formData.description,
        tipo_maintenance: formData.tipoMantenimiento,
        severity: formData.severity,
        assigned_to: formData.assignedTo,
        inspectableId: formData.inspectableId,
        hasEvidence: !!formData.evidenceFile,
        hasSignature: !!formData.signatureData
      });

      const response = await axiosInstance.post(`${API_URL}/api/failures/independent`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const failureOrder = response.data.data;
        
        console.log('📋 [StandaloneFailureModal] Orden de falla creada:', {
          id: failureOrder.id,
          failure_order_id: failureOrder.failure_order_id,
          allFields: Object.keys(failureOrder),
          fullResponse: failureOrder
        });
        
        // Validar que tenemos un ID válido
        if (!failureOrder.id) {
          throw new Error('No se pudo obtener el ID de la orden de falla creada');
        }
        
        // Asegurar que el ID sea un número
        const failureOrderId = parseInt(failureOrder.id);
        if (isNaN(failureOrderId)) {
          throw new Error(`ID de orden de falla inválido: ${failureOrder.id}`);
        }
        
        console.log('🔑 [StandaloneFailureModal] Creando firma de reporte para ID:', failureOrderId);
        console.log('🔑 [StandaloneFailureModal] Datos de firma:', {
          signatureDataLength: formData.signatureData?.length,
          userName: user.user_name,
          roleName: user.role_name,
          signatureDataPreview: formData.signatureData?.substring(0, 50) + '...'
        });
        
        console.log('🚀 [StandaloneFailureModal] Llamando a createFailureReportSignature...');
        
        // Crear la firma de reporte usando la nueva utilidad
        const signatureResult = await createFailureReportSignature(
          failureOrderId,
          formData.signatureData,
          user.user_name,
          user.role_name
        );
        
        console.log('📝 [StandaloneFailureModal] Resultado de firma:', signatureResult);

        if (signatureResult.success) {
          Swal.fire('✅ Falla Reportada y Firmada', 
            `Se ha creado la orden de falla ${failureOrder.failure_order_id} exitosamente.`, 
            'success');
          if (onSuccess) onSuccess(failureOrder);
          onClose();
        } else {
          throw new Error(signatureResult.error?.message || 'No se pudo crear la firma de reporte.');
        }
      } else {
        throw new Error(response.data.error || 'No se pudo crear la falla independiente.');
      }
    } catch (error) {
      console.error('❌ Error creando falla:', error);
      console.error('❌ Error stack:', error.stack);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityOptions = () => [
    { value: 'LEVE', label: 'Leve' },
    { value: 'MODERADA', label: 'Moderada' },
    { value: 'CRITICA', label: 'Crítica' }
  ];

  const getTipoMantenimientoOptions = () => [
    { value: 'TECNICA', label: 'Técnica' },
    { value: 'OPERATIVA', label: 'Operativa' },
    { value: 'LOCATIVA', label: 'Locativa' },
    { value: 'SST', label: 'SST' }
  ];

  const getAssignedToOptions = () => [
    { value: 'TECNICA', label: 'Técnicos' },
    { value: 'OPERATIVA', label: 'Anfitriones' }
  ];

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">📝</span>Reportar Falla Independiente
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
              title="Cerrar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Información automática */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Reportado por:</span>
                <p className="text-gray-900">{user?.user_name || 'Usuario actual'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID de Orden:</span>
                <p className="text-gray-900">Se generará automáticamente</p>
              </div>
            </div>
          </div>

          {/* Descripción de la Falla (Obligatorio) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción de la Falla <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Ej: El motor del carrusel hace un ruido extraño y se detiene intermittently."
              required
            />
          </div>

          {/* Tipo de Mantenimiento y Severidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Mantenimiento <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipoMantenimiento}
                onChange={(e) => handleInputChange('tipoMantenimiento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {getTipoMantenimientoOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severidad <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.severity}
                onChange={(e) => handleInputChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {getSeverityOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Asignado a */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignado a <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => handleInputChange('assignedTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {getAssignedToOptions().map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Inspectable Afectado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipo/Dispositivo Afectado
            </label>
            <select
              value={formData.inspectableId}
              onChange={(e) => handleInputChange('inspectableId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingInspectables}
            >
              <option value="">Seleccionar equipo/dispositivo...</option>
              {inspectables.map(inspectable => (
                <option key={inspectable.inspectable_id} value={inspectable.inspectable_id}>
                  {inspectable.inspectable_name} - {inspectable.location}
                </option>
              ))}
            </select>
            {loadingInspectables && (
              <p className="text-sm text-gray-500 mt-1">Cargando equipos disponibles...</p>
            )}
          </div>

          {/* Evidencia (Obligatorio) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidencia de la Falla <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {!formData.evidencePreview ? (
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEvidenceChange}
                    className="hidden"
                    id="evidence-upload"
                    required
                  />
                  <label
                    htmlFor="evidence-upload"
                    className="cursor-pointer inline-flex flex-col items-center space-y-2 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-medium">Subir foto de la falla</span>
                    <span className="text-xs">PNG, JPG hasta 10MB</span>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={formData.evidencePreview}
                    alt="Evidencia"
                    className="max-w-full h-48 object-cover rounded mx-auto"
                  />
                  <button
                    type="button"
                    onClick={removeEvidence}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Firma (Obligatorio) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firma del Reporte <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {!formData.signatureData ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    className="cursor-pointer inline-flex flex-col items-center space-y-2 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-sm font-medium">Firmar reporte de la falla</span>
                    <span className="text-xs">Su firma confirma el reporte oficial</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="bg-white border rounded p-2">
                    <img
                      src={formData.signatureData}
                      alt="Firma"
                      className="max-w-full h-24 mx-auto"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-blue-600"
                    title="Cambiar firma"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Esta firma confirma que ha reportado oficialmente esta falla.
            </p>
          </div>

          {/* Información sobre el proceso */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">ℹ️ Información del proceso</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Esta falla será creada como una orden de falla independiente</p>
              <p>• Se generará automáticamente una orden de trabajo si es necesaria</p>
              <p>• Su firma confirma el reporte oficial de la falla</p>
              <p>• Una vez firmada, no se podrá modificar ni eliminar</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors duration-200"
            >
              Cancelar
            </button>
            
            <button
              onClick={createStandaloneFailure}
              disabled={loading || !formData.description.trim() || !formData.evidenceFile || !formData.signatureData}
              className="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? '🔄 Creando Falla...' : '📝 Reportar Falla ✅'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Firma */}
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={handleCloseSignaturePad}
        />
      )}
    </div>
  );
};

export default StandaloneFailureModal;
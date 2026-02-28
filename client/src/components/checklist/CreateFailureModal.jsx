'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import SignaturePad from './SignaturePad';

const CreateFailureModal = ({
  show,
  onClose,
  checklistResponseId,
  checklistItemId,
  inspectableId,
  onSuccess
}) => {
  const { user } = useAuth();
  
  const initialFormData = {
    description: '',
    severity: 'LEVE',
    categoria: 'TECNICA',
    evidence_file: null,
    signature: null,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (show) {
      setFormData(initialFormData);
      setShowSignaturePad(false);
      setImagePreview(null);
      setUploadingImage(false);
    }
  }, [show]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Función para manejar la carga de imagen
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validaciones del archivo
    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Solo se permiten archivos de imagen', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB máximo
      Swal.fire('Error', 'La imagen no debe ser mayor a 5MB', 'error');
      return;
    }

    setFormData(prev => ({ ...prev, evidence_file: file }));
    
    // Crear vista previa
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Función para cancelar vista previa
  const cancelImagePreview = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, evidence_file: null }));
  };

  // Función para subir imagen al servidor
  const uploadImageToServer = async (file) => {
    if (!file) return null;

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

      const filePath = response.data?.filePath;
      if (!filePath) {
        throw new Error('La respuesta del servidor no contiene la ruta del archivo');
      }

      console.log('✅ Imagen subida exitosamente:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      throw new Error(`Error al subir imagen: ${error.response?.data?.error || error.message}`);
    }
  };

  // Función para manejar la firma
  const handleSignatureSave = (signatureData) => {
    setFormData(prev => ({ ...prev, signature: signatureData }));
    setShowSignaturePad(false);
  };

  // Función para limpiar la firma
  const clearSignature = () => {
    setFormData(prev => ({ ...prev, signature: null }));
  };

  const createFailure = async () => {
    if (!formData.description.trim()) {
      Swal.fire('Error', 'La descripción de la falla es requerida', 'error');
      return;
    }

    if (!formData.signature) {
      Swal.fire('Error', 'La firma digital es obligatoria para reportar una falla', 'error');
      return;
    }

    setLoading(true);
    let evidenceUrl = null;

    try {
      // Subir imagen si se proporcionó
      if (formData.evidence_file) {
        setUploadingImage(true);
        try {
          evidenceUrl = await uploadImageToServer(formData.evidence_file);
        } catch (imageError) {
          console.error('Error subiendo imagen:', imageError);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo subir la imagen. ¿Deseas continuar sin imagen?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'No, cancelar',
            confirmButtonColor: '#7c3aed',
          }).then((result) => {
            if (!result.isConfirmed) {
              setLoading(false);
              setUploadingImage(false);
              return;
            }
          });
        } finally {
          setUploadingImage(false);
        }
      }

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const requestData = {
        description: formData.description,
        severity: formData.severity,
        categoria: formData.categoria,
        inspectableId,
        checklistResponseId,
        checklistItemId,
        reported_by: user?.user_id,
        evidence_url: evidenceUrl,
        report_signature: formData.signature // Campo de firma de reporte
      };

      console.log('📤 [CreateFailureModal] Enviando datos:', requestData);

      const response = await axiosInstance.post(`${API_URL}/api/failures`, requestData);

      if (response.data.success) {
        Swal.fire('✅ Falla Creada', 'Se ha creado la orden de falla exitosamente.', 'success');
        if (onSuccess) onSuccess(response.data.data);
        onClose();
      } else {
        throw new Error(response.data.error || 'No se pudo crear la falla.');
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const getSeverityOptions = () => [
    { value: 'LEVE', label: 'Leve' },
    { value: 'MODERADA', label: 'Moderada' },
    { value: 'CRITICA', label: 'Crítica' }
  ];

  const getCategoriaOptions = () => [
    { value: 'TECNICA', label: 'Técnica' },
    { value: 'OPERATIVA', label: 'Operativa' },
    { value: 'LOCATIVA', label: 'Locativa' }
  ];

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Reportar Nueva Falla</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la Falla *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Ej: El motor del carrusel hace un ruido extraño."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severidad *</label>
                <select
                  value={formData.severity}
                  onChange={(e) => handleInputChange('severity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {getSeverityOptions().map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {getCategoriaOptions().map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            {/* Sección de Carga de Imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evidencia Fotográfica</label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-600 mb-2">Haz clic para subir una imagen</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="evidence-upload"
                    />
                    <label
                      htmlFor="evidence-upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                      Cargar Foto
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Máximo 5MB</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Vista previa de evidencia"
                      className="w-full max-w-md h-48 object-cover rounded-lg border shadow-sm"
                    />
                    <button
                      onClick={cancelImagePreview}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Cancelar imagen"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Vista previa de la imagen</p>
                </div>
              )}
            </div>

            {/* Sección de Firma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma Digital <span className="text-red-500">*</span>
              </label>
              
              {formData.signature ? (
                <div className="mt-3">
                  <div className="relative inline-block border rounded-lg p-2">
                    <img
                      src={formData.signature}
                      alt="Firma digital"
                      className="h-20 object-contain"
                    />
                    <button
                      onClick={clearSignature}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                      title="Limpiar firma"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Firma capturada</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Firmar Digitalmente</span>
                  </div>
                </button>
              )}
            </div>

            <div className="flex justify-end items-center pt-4">
              <button 
                onClick={onClose} 
                className="text-sm text-gray-600 hover:underline mr-4"
                disabled={loading || uploadingImage}
              >
                Cancelar
              </button>
              <button 
                onClick={createFailure} 
                disabled={loading || uploadingImage || !formData.description.trim() || !formData.categoria || !formData.signature}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                {loading || uploadingImage ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadingImage ? 'Subiendo imagen...' : 'Creando...'}
                  </>
                ) : (
                  'Crear Falla'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Firma */}
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
    </>
  );
};

export default CreateFailureModal;
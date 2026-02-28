'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import SignaturePad from './SignaturePad';
import FailureSignatureHistory from './FailureSignatureHistory';

const ResolutionFailureModal = ({
  show,
  onClose,
  failureOrder,
  onSuccess
}) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    resolutionDetails: '',
    signatureData: null
  });
  
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showSignatureHistory, setShowSignatureHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signatureSummary, setSignatureSummary] = useState(null);

  useEffect(() => {
    if (show && failureOrder) {
      setFormData({
        resolutionDetails: '',
        signatureData: null
      });
      setShowSignaturePad(false);
      checkSignatureRequirements();
    }
  }, [show, failureOrder]);

  const checkSignatureRequirements = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/failures/${failureOrder.id}/signatures-check`);
      
      if (response.data.success) {
        setSignatureSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error verificando firmas:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignatureSave = (signatureData) => {
    setFormData(prev => ({ ...prev, signatureData }));
    setShowSignaturePad(false);
  };

  const handleCloseSignaturePad = () => {
    setShowSignaturePad(false);
  };

  const resolveFailure = async () => {
    if (!formData.resolutionDetails.trim()) {
      Swal.fire('Error', 'Los detalles de la resolución son requeridos', 'error');
      return;
    }

    if (!formData.signatureData) {
      Swal.fire('Error', 'La firma es requerida para resolver la falla', 'error');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      // Usar el endpoint de firmar y avanzar
      const response = await axiosInstance.post(`${API_URL}/api/failures/${failureOrder.id}/sign-and-advance`, {
        signatureData: formData.signatureData,
        signatureType: 'RESOLUTION',
        userName: user.user_name,
        roleName: user.role_name,
        newStatus: 'RESUELTO',
        resolutionDetails: formData.resolutionDetails
      });

      if (response.data.success) {
        Swal.fire('✅ Falla Resuelta y Firmada', 'La falla ha sido resuelta y firmada exitosamente.', 'success');
        if (onSuccess) onSuccess(response.data.data);
        onClose();
      } else {
        throw new Error(response.data.error || 'No se pudo resolver la falla.');
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!show || !failureOrder) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Resolver Falla</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSignatureHistory(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver Historial de Firmas
                </button>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
              </div>
            </div>

            {/* Información de la falla */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Información de la Falla</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>ID:</strong> {failureOrder.failure_order_id}</p>
                <p><strong>Descripción:</strong> {failureOrder.description}</p>
                <p><strong>Severidad:</strong> {failureOrder.severity}</p>
                <p><strong>Estado:</strong> {failureOrder.status}</p>
                <p><strong>Categoría:</strong> {failureOrder.categoria}</p>
              </div>
            </div>

            {/* Estado de firmas */}
            {signatureSummary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Estado de Firmas</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-1 ${signatureSummary.signatureSummary?.hasReport ? 'bg-green-500' : 'bg-gray-300'}`}>
                      ✓
                    </div>
                    <div className="font-medium">Reporte</div>
                    <div className="text-xs text-gray-600">{signatureSummary.signatureSummary?.hasReport ? 'Firmado' : 'Pendiente'}</div>
                  </div>
                  <div className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-1 ${signatureSummary.signatureSummary?.hasResolution ? 'bg-green-500' : 'bg-gray-300'}`}>
                      ✓
                    </div>
                    <div className="font-medium">Resolución</div>
                    <div className="text-xs text-gray-600">{signatureSummary.signatureSummary?.hasResolution ? 'Firmado' : 'Pendiente'}</div>
                  </div>
                  <div className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-1 ${signatureSummary.signatureSummary?.hasClose ? 'bg-green-500' : 'bg-gray-300'}`}>
                      ✓
                    </div>
                    <div className="font-medium">Cierre</div>
                    <div className="text-xs text-gray-600">{signatureSummary.signatureSummary?.hasClose ? 'Firmado' : 'Pendiente'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Detalles de resolución */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detalles de la Resolución *
              </label>
              <textarea
                value={formData.resolutionDetails}
                onChange={(e) => handleInputChange('resolutionDetails', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="Describir cómo se resolvió la falla, qué trabajos se realizaron, repuestos utilizados, etc."
              />
            </div>

            {/* Firma obligatoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firma de Resolución <span className="text-red-500">*</span>
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
                      <span className="text-sm font-medium">Firmar resolución</span>
                      <span className="text-xs">Su firma es requerida para resolver</span>
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
                      className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-blue-600"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end items-center pt-4">
              <button onClick={onClose} className="text-sm text-gray-600 hover:underline mr-4">Cancelar</button>
              <button
                onClick={resolveFailure}
                disabled={loading || !formData.resolutionDetails.trim() || !formData.signatureData}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Resolviendo...' : 'Resolver y Firmar'}
              </button>
            </div>
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

      {/* Modal de Historial de Firmas */}
      <FailureSignatureHistory
        failureOrderId={failureOrder.id}
        show={showSignatureHistory}
        onClose={() => setShowSignatureHistory(false)}
      />
    </>
  );
};

export default ResolutionFailureModal;
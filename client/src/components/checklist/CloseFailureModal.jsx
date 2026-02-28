'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import SignaturePad from './SignaturePad';
import FailureSignatureHistory from './FailureSignatureHistory';
import { 
  getFailureSignaturesInfo, 
  formatSignatureForDisplay,
  getSignatureStatus 
} from '../../utils/failureSignaturesApi';

const CloseFailureModal = ({
  show,
  onClose,
  failureOrder,
  onSuccess
}) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    closureDetails: '',
    signatureData: null
  });
  
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showSignatureHistory, setShowSignatureHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signaturesInfo, setSignaturesInfo] = useState(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  useEffect(() => {
    if (show && failureOrder) {
      setFormData({
        closureDetails: '',
        signatureData: null
      });
      setShowSignaturePad(false);
      loadSignaturesInfo();
    }
  }, [show, failureOrder]);

  const loadSignaturesInfo = async () => {
    setLoadingSignatures(true);
    try {
      const info = await getFailureSignaturesInfo(failureOrder.id);
      setSignaturesInfo(info.data);
    } catch (error) {
      console.error('Error cargando información de firmas:', error);
    } finally {
      setLoadingSignatures(false);
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

  const closeFailure = async () => {
    if (!formData.closureDetails.trim()) {
      Swal.fire('Error', 'Los detalles del cierre son requeridos', 'error');
      return;
    }

    if (!formData.signatureData) {
      Swal.fire('Error', 'La firma es requerida para cerrar la falla', 'error');
      return;
    }

    // Verificar que solo administradores pueden cerrar fallas
    if (user.role_name !== 'ADMIN') {
      Swal.fire('Error', 'Solo los administradores pueden cerrar fallas', 'error');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      // Actualizar la OT con la firma de cierre
      if (failureOrder.workOrder && failureOrder.workOrder.id) {
        const workOrderResponse = await axiosInstance.post(
          `${API_URL}/api/work-orders/${failureOrder.workOrder.id}/close`, 
          {
            closureSignature: formData.signatureData,
            closureDetails: formData.closureDetails,
            userName: user.user_name,
            roleName: user.role_name
          }
        );

        if (!workOrderResponse.data.success) {
          throw new Error(workOrderResponse.data.error || 'Error al cerrar la orden de trabajo');
        }
      }

      // Actualizar el estado de la falla a CERRADO
      const failureResponse = await axiosInstance.put(
        `${API_URL}/api/failures/${failureOrder.id}`, 
        {
          status: 'CERRADO',
          closureDetails: formData.closureDetails
        }
      );

      if (failureResponse.data.success) {
        Swal.fire('✅ Falla Cerrada', 'La falla y su orden de trabajo han sido cerradas exitosamente.', 'success');
        if (onSuccess) onSuccess(failureResponse.data.data);
        onClose();
      } else {
        throw new Error(failureResponse.data.error || 'Error al cerrar la falla');
      }
    } catch (error) {
      console.error('Error cerrando falla:', error);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!show || !failureOrder) return null;

  const signatureStatus = signaturesInfo ? getSignatureStatus(signaturesInfo) : null;

  // Verificar permisos
  if (user.role_name !== 'ADMIN') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600 mb-4">Solo los administradores pueden cerrar fallas.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔒</span>Cerrar Falla y Orden de Trabajo
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSignatureHistory(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-50"
                >
                  📝 Ver Historial de Firmas
                </button>
                <button 
                  onClick={onClose} 
                  className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Información de la falla y OT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información de la Falla */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📋</span>Información de la Falla
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-gray-700">ID de Falla</label>
                      <p className="text-gray-900 font-mono">{failureOrder.failure_order_id || `OF-${failureOrder.id}`}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Estado Actual</label>
                      <p className="text-gray-900">{failureOrder.status}</p>
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Descripción</label>
                    <p className="text-gray-900">{failureOrder.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-gray-700">Severidad</label>
                      <p className="text-gray-900">{failureOrder.severity}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Categoría</label>
                      <p className="text-gray-900">{failureOrder.categoria}</p>
                    </div>
                  </div>
                  {failureOrder.resolution_details && (
                    <div>
                      <label className="font-medium text-gray-700">Resolución Actual</label>
                      <p className="text-gray-900">{failureOrder.resolution_details}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de la Orden de Trabajo */}
              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🔧</span>Orden de Trabajo
                </h3>
                {failureOrder.workOrder ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium text-gray-700">ID de OT</label>
                        <p className="text-gray-900 font-mono">{failureOrder.workOrder.work_order_id || `OT-${failureOrder.workOrder.id}`}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Estado de OT</label>
                        <p className="text-gray-900">{failureOrder.workOrder.status}</p>
                      </div>
                    </div>
                    {failureOrder.workOrder.description && (
                      <div>
                        <label className="font-medium text-gray-700">Descripción OT</label>
                        <p className="text-gray-900">{failureOrder.workOrder.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No hay orden de trabajo asociada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Estado de Firmas */}
            {!loadingSignatures && signatureStatus && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                <h3 className="font-semibold text-purple-900 mb-4">Estado de Firmas del Proceso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Firma de Reporte de Falla */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <span className="mr-2">📝</span>Firma de Reporte
                      </h4>
                      {signatureStatus.hasReportSignature ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completada</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Pendiente</span>
                      )}
                    </div>
                    {signatureStatus.reportSignature ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 border rounded overflow-hidden">
                          <img 
                            src={signatureStatus.reportSignature.image} 
                            alt="Firma de reporte" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{signatureStatus.reportSignature.signedBy}</p>
                          <p className="text-gray-600 text-xs">{signatureStatus.reportSignature.role}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No hay firma de reporte</p>
                    )}
                  </div>

                  {/* Firma de Cierre de OT */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <span className="mr-2">🔧</span>Firma de Cierre (OT)
                      </h4>
                      {signatureStatus.hasWorkOrderSignature ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completada</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Pendiente</span>
                      )}
                    </div>
                    {signatureStatus.workOrderSignature ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 border rounded overflow-hidden">
                          <img 
                            src={signatureStatus.workOrderSignature.image} 
                            alt="Firma de cierre" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{signatureStatus.workOrderSignature.signedBy}</p>
                          <p className="text-gray-600 text-xs">{signatureStatus.workOrderSignature.role}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        {failureOrder.workOrder ? 'Pendiente' : 'Sin orden de trabajo'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detalles de cierre */}
            <div className="bg-yellow-50 rounded-lg p-5">
              <h3 className="font-semibold text-yellow-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>Detalles Finales del Cierre
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios y validaciones del administrador *
                </label>
                <textarea
                  value={formData.closureDetails}
                  onChange={(e) => handleInputChange('closureDetails', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={4}
                  placeholder="Describa las validaciones realizadas, trabajos completados, pruebas efectuadas, y cualquier comentario administrativo para el cierre definitivo."
                />
                <p className="text-xs text-gray-600 mt-2">
                  Estos detalles quedarán registrados como parte del historial oficial de la falla.
                </p>
              </div>
            </div>

            {/* Firma de cierre */}
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">✍️</span>Firma Administrativa de Cierre
              </h3>
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-6">
                {!formData.signatureData ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="cursor-pointer inline-flex flex-col items-center space-y-3 text-purple-600 hover:text-purple-800"
                    >
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <div>
                        <div className="text-lg font-medium">Firmar Cierre Administrativo</div>
                        <div className="text-sm">Su firma autoriza el cierre definitivo</div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="bg-white border-2 border-gray-200 rounded p-4">
                      <img
                        src={formData.signatureData}
                        alt="Firma de cierre"
                        className="max-w-full h-24 mx-auto"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-purple-600 transition-colors"
                      title="Cambiar firma"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-3 text-center">
                  Como administrador, su firma valida y autoriza el cierre definitivo de esta falla y su orden de trabajo.
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center pt-6 border-t border-gray-200">
              <button 
                onClick={onClose} 
                className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors mr-4"
              >
                Cancelar
              </button>
              <button
                onClick={closeFailure}
                disabled={loading || !formData.closureDetails.trim() || !formData.signatureData}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? '🔄 Cerrando...' : '🔒 Cerrar y Firmar Definitivamente'}
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
        failure={failureOrder}
      />
    </>
  );
};

export default CloseFailureModal;

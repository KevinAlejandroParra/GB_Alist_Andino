'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import SignaturePad from './SignaturePad';
import { 
  getFailureSignaturesInfo, 
  createFailureReportSignature, 
  canUserCreateReportSignature,
  formatSignatureForDisplay,
  getSignatureStatus
} from '../../utils/failureSignaturesApi';
import Swal from 'sweetalert2';

const FailureSignatureHistory = ({ failureOrderId, show = false, onClose, failure }) => {
  const { user } = useAuth();
  const [signaturesInfo, setSignaturesInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  useEffect(() => {
    if (show && failureOrderId) {
      loadSignaturesInfo();
    }
  }, [show, failureOrderId]);

  const loadSignaturesInfo = async () => {
    setLoading(true);
    try {
      const info = await getFailureSignaturesInfo(failureOrderId);
      setSignaturesInfo(info.data);
    } catch (error) {
      console.error('Error cargando información de firmas:', error);
      Swal.fire('Error', 'No se pudo cargar la información de firmas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureSave = async (signatureData) => {
    try {
      setShowSignaturePad(false);
      
      const result = await createFailureReportSignature(
        failureOrderId,
        signatureData,
        user.user_name,
        user.role_name
      );

      if (result.success) {
        await loadSignaturesInfo();
        Swal.fire('✅ Firma Guardada', 'Firma de reporte guardada exitosamente', 'success');
        
        if (onClose) onClose();
      } else {
        throw new Error(result.error?.message || 'Error al firmar');
      }
    } catch (error) {
      console.error('Error guardando firma:', error);
      Swal.fire('Error', error.message, 'error');
    }
  };

  const handleSignReport = () => {
    if (!canUserCreateReportSignature(user)) {
      Swal.fire('Error', 'No tienes permisos para crear firma de reporte', 'error');
      return;
    }
    setShowSignaturePad(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!show) return null;

  const signatureStatus = signaturesInfo ? getSignatureStatus(signaturesInfo) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">
                📝 Firma de Reporte
              </h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                Falla #{failureOrderId}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando información de firmas...</span>
            </div>
          ) : signatureStatus ? (
            <div className="space-y-6">
              {/* Información de la Falla */}
              {failure && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Información de la Falla</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">Descripción:</label>
                      <p className="text-gray-900 mt-1">{failure.description}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Severidad:</label>
                      <p className="text-gray-900 mt-1">{failure.severity}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Reportado por:</label>
                      <p className="text-gray-900 mt-1">{failure.reporter?.user_name || 'Desconocido'}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Fecha de reporte:</label>
                      <p className="text-gray-900 mt-1">{formatDate(failure.createdAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Firma de Reporte */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">📝</span>Firma de Reporte de Falla
                  </h3>
                  {signatureStatus.hasReportSignature ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                      ✅ Completada
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                      ⚠️ Pendiente
                    </span>
                  )}
                </div>

                {signatureStatus.reportSignature ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Información de la firma */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Firmado por
                        </label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded border font-medium">
                          {signatureStatus.reportSignature.signedBy}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rol
                        </label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                          {signatureStatus.reportSignature.role}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha y hora
                        </label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                          {formatDate(signatureStatus.reportSignature.signedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Imagen de la firma */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Firma Digital
                      </label>
                      <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                        <SignatureImage
                          src={signatureStatus.reportSignature.image}
                          alt="Firma de reporte"
                          className="w-full h-24 object-contain"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Esta firma confirma el reporte oficial de la falla
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No hay firma de reporte</h4>
                    <p className="text-gray-600 mb-6">
                      Esta falla aún no ha sido firmada por el usuario que la reportó.
                    </p>
                    
                    {signatureStatus.canCreateReportSignature && (
                      <button
                        onClick={handleSignReport}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        ✍️ Firmar Reporte
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">ℹ️ Información sobre firmas de falla</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• La firma de reporte confirma que la falla ha sido documentada oficialmente</p>
                  <p>• Solo el usuario que reportó la falla puede crear esta firma</p>
                  <p>• Esta firma es independiente de las firmas de cierre de órdenes de trabajo</p>
                  <p>• Una vez firmada, no se puede modificar ni eliminar</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se pudo cargar la información</h3>
              <p className="text-gray-600">Hubo un problema al cargar los datos de firmas.</p>
              <button
                onClick={loadSignaturesInfo}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Modal de Firma */}
        {showSignaturePad && (
          <SignaturePad
            onSave={handleSignatureSave}
            onClose={() => setShowSignaturePad(false)}
          />
        )}
      </div>
    </div>
  );
};

export default FailureSignatureHistory;
'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';

const LinkedFailuresSection = ({ failureId, currentFailureOrderId, onUnlink }) => {
  const [linkedFailures, setLinkedFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    if (failureId) {
      loadLinkedFailures();
    }
  }, [failureId]);

  const loadLinkedFailures = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/failures/${failureId}/linked-failures`);

      if (response.data.success) {
        // Filtrar la falla actual para no mostrarla en la lista
        const otherFailures = response.data.data.filter(f => f.id !== failureId);
        setLinkedFailures(otherFailures);
      }
    } catch (error) {
      console.error('Error cargando fallas enlazadas:', error);
      setLinkedFailures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    const result = await Swal.fire({
      title: '¿Desenlazar esta falla?',
      html: `
        <div class="text-left">
          <p class="mb-3">Estás a punto de desenlazar esta falla de la orden de trabajo sincronizada.</p>
          <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <p class="text-sm text-yellow-800">
              <strong>⚠️ Importante:</strong>
            </p>
            <ul class="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• Se eliminará la orden de trabajo de esta falla</li>
              <li>• Ya no se sincronizará con las otras fallas</li>
              <li>• Las otras ${linkedFailures.length} falla${linkedFailures.length > 1 ? 's' : ''} seguirán enlazadas entre sí</li>
              <li>• Esta acción no se puede deshacer</li>
            </ul>
          </div>
          <p class="text-sm text-gray-600">¿Estás seguro de continuar?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, desenlazar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'text-left'
      }
    });

    if (!result.isConfirmed) return;

    setUnlinking(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.delete(`${API_URL}/api/failures/${failureId}/unlink-work-order`);

      if (response.data.success) {
        await Swal.fire({
          title: '✅ Falla Desenlazada',
          text: 'La falla se ha desenlazado exitosamente de la orden de trabajo.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Notificar al componente padre para recargar
        if (onUnlink) {
          onUnlink();
        }
      }
    } catch (error) {
      console.error('Error desenlazando falla:', error);
      
      let errorMessage = 'No se pudo desenlazar la falla';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error'
      });
    } finally {
      setUnlinking(false);
    }
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

  const getSeverityColor = (severity) => {
    const colors = {
      'LEVE': 'bg-green-100 text-green-800',
      'MODERADA': 'bg-yellow-100 text-yellow-800',
      'CRITICA': 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center">
          <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-blue-700 text-sm">Verificando fallas enlazadas...</p>
        </div>
      </div>
    );
  }

  if (linkedFailures.length === 0) {
    return null; // No mostrar nada si no hay fallas enlazadas
  }

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 overflow-hidden">
        {/* Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                🔗
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Orden de Trabajo Sincronizada
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                    {linkedFailures.length + 1} fallas enlazadas
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Esta orden está conectada con otras fallas. Todas se actualizan juntas automáticamente.
                </p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-800 transition-colors">
              <svg 
                className={`w-6 h-6 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido expandible */}
        {expanded && (
          <div className="border-t border-blue-200 bg-white p-4">
            <div className="mb-3">
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span className="text-blue-600 text-xl">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    ¿Qué significa esto?
                  </p>
                  <p className="text-xs text-blue-700">
                    Cuando actualizas el estado, actividad realizada, evidencias o repuestos de esta orden de trabajo, 
                    <strong> automáticamente se actualizan todas las fallas enlazadas</strong>. 
                    Esto evita duplicar trabajo y mantiene la información consistente.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de desenlazar */}
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unlinking ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Desenlazando...</span>
                  </>
                ) : (
                  <>
                    <span>🔓</span>
                    <span>Desenlazar esta falla</span>
                  </>
                )}
              </button>
            </div>

            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📋</span>
              Fallas Enlazadas ({linkedFailures.length})
            </h4>
            
            <div className="space-y-3">
              {linkedFailures.map((failure, index) => (
                <div 
                  key={failure.id} 
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {failure.failure_order_id || `OF-${failure.id}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(failure.severity)}`}>
                          {failure.severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                        {failure.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>{failure.reporter?.user_name || 'Desconocido'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{formatDate(failure.createdAt)}</span>
                        </div>
                        {failure.affectedInspectable && (
                          <div className="flex items-center gap-1">
                            <span>🎯</span>
                            <span>{failure.affectedInspectable.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        Sincronizada ✓
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-lg">⚡</span>
                <div className="flex-1">
                  <p className="text-xs text-yellow-800">
                    <strong>Actualización automática:</strong> Cualquier cambio que hagas en esta orden de trabajo 
                    se reflejará instantáneamente en las {linkedFailures.length} falla{linkedFailures.length > 1 ? 's' : ''} enlazada{linkedFailures.length > 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedFailuresSection;

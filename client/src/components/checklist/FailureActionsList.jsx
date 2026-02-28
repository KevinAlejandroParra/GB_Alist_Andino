'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';
import ResolutionFailureModal from './ResolutionFailureModal';
import CloseFailureModal from './CloseFailureModal';
import FailureSignatureHistory from './FailureSignatureHistory';

const FailureActionsList = ({ 
  failures, 
  user, 
  onUpdate,
  showOnlyActions = false 
}) => {
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSignatureHistory, setShowSignatureHistory] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [signatureSummary, setSignatureSummary] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (failures && failures.length > 0) {
      // Verificar estado de firmas para cada falla
      failures.forEach(failure => {
        checkSignatureRequirements(failure.id);
      });
    }
  }, [failures]);

  const checkSignatureRequirements = async (failureId) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/failures/${failureId}/signatures-check`);
      
      if (response.data.success) {
        setSignatureSummary(prev => ({
          ...prev,
          [failureId]: response.data.data
        }));
      }
    } catch (error) {
      console.error('Error verificando firmas:', error);
    }
  };

  const handleResolution = (failure) => {
    setSelectedFailure(failure);
    setShowResolutionModal(true);
  };

  const handleClose = (failure) => {
    // Solo administradores pueden cerrar fallas
    if (user.role_name !== 'ADMIN') {
      Swal.fire('Error', 'Solo los administradores pueden cerrar fallas', 'error');
      return;
    }
    setSelectedFailure(failure);
    setShowCloseModal(true);
  };

  const handleShowHistory = (failure) => {
    setSelectedFailure(failure);
    setShowSignatureHistory(true);
  };

  const handleModalSuccess = () => {
    setShowResolutionModal(false);
    setShowCloseModal(false);
    setSelectedFailure(null);
    if (onUpdate) onUpdate();
  };

  const getActionButtons = (failure) => {
    const summary = signatureSummary[failure.id];
    const canResolve = user.role_name === 'TECNICO' || user.role_name === 'OPERADOR';
    const canClose = user.role_name === 'ADMIN';

    const buttons = [];

    // Botón para ver historial de firmas (siempre disponible si hay datos)
    buttons.push(
      <button
        key="history"
        onClick={() => handleShowHistory(failure)}
        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
        title="Ver historial de firmas"
      >
        📋 Firmas
      </button>
    );

    // Botón para resolver (solo técnicos y operadores)
    if (canResolve && failure.status === 'REPORTADO') {
      buttons.push(
        <button
          key="resolve"
          onClick={() => handleResolution(failure)}
          className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium hover:bg-green-200 transition-colors"
          title="Resolver falla (requiere firma)"
        >
          ✅ Resolver
        </button>
      );
    }

    // Botón para cerrar (solo administradores)
    if (canClose && failure.status === 'RESUELTO') {
      buttons.push(
        <button
          key="close"
          onClick={() => handleClose(failure)}
          className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium hover:bg-purple-200 transition-colors"
          title="Cerrar falla (solo admin, requiere firma)"
        >
          🔒 Cerrar
        </button>
      );
    }

    return buttons;
  };

  const getSignatureStatusIndicator = (failure) => {
    const summary = signatureSummary[failure.id];
    if (!summary) return null;

    const { signatureSummary } = summary;
    const statuses = [
      { key: 'hasReport', label: 'Reporte', color: 'blue' },
      { key: 'hasResolution', label: 'Resolución', color: 'green' },
      { key: 'hasClose', label: 'Cierre', color: 'purple' }
    ];

    return (
      <div className="flex items-center space-x-1 mt-1">
        {statuses.map(status => (
          <div
            key={status.key}
            className={`w-3 h-3 rounded-full ${
              signatureSummary?.[status.key] 
                ? `bg-${status.color}-500` 
                : 'bg-gray-300'
            }`}
            title={`${status.label}: ${signatureSummary?.[status.key] ? 'Firmado' : 'Pendiente'}`}
          />
        ))}
      </div>
    );
  };

  if (!failures || failures.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {failures.map((failure, index) => (
          <div
            key={failure.id || `failure-${index}`}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {failure.failure_order_id || `OF-${failure.id}`}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    failure.status === 'REPORTADO' ? 'bg-blue-100 text-blue-800' :
                    failure.status === 'RESUELTO' ? 'bg-green-100 text-green-800' :
                    failure.status === 'CERRADO' ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {failure.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    failure.severity === 'CRITICA' ? 'bg-red-100 text-red-800' :
                    failure.severity === 'MODERADA' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {failure.severity}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {failure.description}
                </p>
                
                <div className="text-xs text-gray-500">
                  <span>Reportado: {new Date(failure.createdAt).toLocaleDateString()}</span>
                  {failure.reported_by_id && (
                    <span className="ml-4">Por: Usuario #{failure.reported_by_id}</span>
                  )}
                </div>

                {/* Indicador de estado de firmas */}
                {getSignatureStatusIndicator(failure)}
              </div>
            </div>

            {/* Acciones disponibles */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-600 mr-2">Acciones:</span>
              {getActionButtons(failure)}
            </div>

            {/* Información adicional sobre firmas pendientes */}
            {signatureSummary[failure.id] && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                <div className="text-gray-600">
                  <strong>Estado de firmas:</strong>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <div className={`text-center ${signatureSummary[failure.id].signatureSummary?.hasReport ? 'text-green-600' : 'text-red-600'}`}>
                      📝 {signatureSummary[failure.id].signatureSummary?.hasReport ? 'Reporte ✓' : 'Reporte pendiente'}
                    </div>
                    <div className={`text-center ${signatureSummary[failure.id].signatureSummary?.hasResolution ? 'text-green-600' : 'text-gray-500'}`}>
                      🔧 {signatureSummary[failure.id].signatureSummary?.hasResolution ? 'Resolución ✓' : 'Resolución pendiente'}
                    </div>
                    <div className={`text-center ${signatureSummary[failure.id].signatureSummary?.hasClose ? 'text-green-600' : 'text-gray-500'}`}>
                      🔒 {signatureSummary[failure.id].signatureSummary?.hasClose ? 'Cierre ✓' : 'Cierre pendiente'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modales */}
      {showResolutionModal && selectedFailure && (
        <ResolutionFailureModal
          show={showResolutionModal}
          onClose={() => {
            setShowResolutionModal(false);
            setSelectedFailure(null);
          }}
          failureOrder={selectedFailure}
          onSuccess={handleModalSuccess}
        />
      )}

      {showCloseModal && selectedFailure && (
        <CloseFailureModal
          show={showCloseModal}
          onClose={() => {
            setShowCloseModal(false);
            setSelectedFailure(null);
          }}
          failureOrder={selectedFailure}
          onSuccess={handleModalSuccess}
        />
      )}

      {showSignatureHistory && selectedFailure && (
        <FailureSignatureHistory
          failureOrderId={selectedFailure.id}
          show={showSignatureHistory}
          onClose={() => {
            setShowSignatureHistory(false);
            setSelectedFailure(null);
          }}
        />
      )}
    </>
  );
};

export default FailureActionsList;
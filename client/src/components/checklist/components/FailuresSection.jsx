'use client'

import React, { useState } from 'react';
import { formatLocalDateTime } from '../../../utils/dateUtils';
import CloseFailureModal from '../CloseFailureModal';

export default function FailuresSection({ pendingFailures = [], closedFailures = [], onCloseFailure }) {
  const [showCloseFailureModal, setShowCloseFailureModal] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);

  const handleOpenCloseFailureModal = (failure) => {
    setSelectedFailure(failure);
    setShowCloseFailureModal(true);
  };

  const handleCloseFailureModal = () => {
    setShowCloseFailureModal(false);
    setSelectedFailure(null);
  };

  const handleCloseFailureSubmit = async (failureId, solutionText, responsibleArea) => {
    await onCloseFailure(failureId, solutionText, responsibleArea);
    handleCloseFailureModal();
  };

  const renderFailureTable = (failures, isPending = true) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ítem
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descripción
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severidad
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reportado por
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            {!isPending && (
              <>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solución
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cerrado por
                </th>
              </>
            )}
            {isPending && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {failures.map((failure) => (
            <tr key={failure.failure_id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {failure.response?.checklistItem?.question_text}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {failure.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  failure.severity === 'crítica' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {failure.severity}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {failure.response?.respondedBy?.user_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatLocalDateTime(failure.reported_at)}
              </td>
              {!isPending && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {failure.solution_text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {failure.failureCloser?.user_name}
                  </td>
                </>
              )}
              {isPending && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenCloseFailureModal(failure)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Cerrar Falla
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="space-y-8">
        {/* Sección de Fallas Pendientes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fallas Pendientes</h2>
          {pendingFailures.length > 0 ? (
            renderFailureTable(pendingFailures)
          ) : (
            <p className="text-gray-500 text-center py-4">No hay fallas pendientes</p>
          )}
        </div>

        {/* Sección de Fallas Cerradas */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Fallas</h2>
          {closedFailures.length > 0 ? (
            renderFailureTable(closedFailures, false)
          ) : (
            <p className="text-gray-500 text-center py-4">No hay fallas cerradas en el historial</p>
          )}
        </div>
      </div>

      {/* Modal para cerrar fallas */}
      {showCloseFailureModal && (
        <CloseFailureModal
          show={showCloseFailureModal}
          onClose={handleCloseFailureModal}
          failure={selectedFailure}
          onSubmit={handleCloseFailureSubmit}
        />
      )}
    </div>
  );
}
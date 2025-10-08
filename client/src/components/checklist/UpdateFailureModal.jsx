'use client'

import React, { useState, useEffect } from 'react';

const UpdateFailureModal = ({ isOpen, onClose, failure, onUpdate }) => {
  const [solutionText, setSolutionText] = useState('');
  const [responsibleArea, setResponsibleArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (failure) {
      setSolutionText(failure.solution_text || '');
      setResponsibleArea(failure.responsible_area || '');
    }
  }, [failure]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const updatePayload = {
      solution_text: solutionText,
      responsible_area: responsibleArea,
      status: 'resuelto',
    };

    try {
      await onUpdate(updatePayload);
      onClose(); // Cierra el modal en caso de éxito
    } catch (err) {
      setError(err.message || 'Ocurrió un error al actualizar la falla.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Actualizar Falla</h2>
        
        <div className="mb-4">
            <p className="text-sm text-gray-500">Item</p>
            <p className="font-medium">{failure?.response?.checklistItem?.question_text || 'N/A'}</p>
        </div>
        <div className="mb-4">
            <p className="text-sm text-gray-500">Descripción de la Falla</p>
            <p className="font-medium">{failure?.description || 'N/A'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="solution_text" className="block text-sm font-medium text-gray-700">Texto de la Solución</label>
            <textarea
              id="solution_text"
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="responsible_area" className="block text-sm font-medium text-gray-700">Área Responsable</label>
            <select
              id="responsible_area"
              value={responsibleArea}
              onChange={(e) => setResponsibleArea(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              required
            >
              <option value="">Seleccione un área</option>
              <option value="Técnico">Técnico</option>
              <option value="Operación">Operación</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
              disabled={isLoading}
            >
              {isLoading ? 'Actualizando...' : 'Marcar como Resuelto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateFailureModal;

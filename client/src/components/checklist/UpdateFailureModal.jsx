'use client'

import React, { useState, useEffect } from 'react';
import failuresApi, { FAILURE_STATES, SEVERITY_LEVELS } from '../../utils/failuresApi';

const UpdateFailureModal = ({ isOpen, onClose, failure, onUpdate, checklistId, itemId }) => {
  const [step, setStep] = useState(1); // 1: Info básica, 2: Detalles del repuesto
  const [requiresPart, setRequiresPart] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [partQuantity, setPartQuantity] = useState(1);
  const [severity, setSeverity] = useState(SEVERITY_LEVELS.LEVE);
  const [failureType, setFailureType] = useState('mecanico');
  const [description, setDescription] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [responsibleArea, setResponsibleArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (failure) {
        // Editando falla existente
        setIsCreatingNew(false);
        setDescription(failure.description || '');
        setSolutionText(failure.solution_text || '');
        setResponsibleArea(failure.responsible_area || '');
        setRequiresPart(failure.requiresPart || false);
        setSeverity(failure.severity || SEVERITY_LEVELS.LEVE);
        setFailureType(failure.failureType || 'mecanico');
      } else {
        // Creando nueva falla
        setIsCreatingNew(true);
        setDescription('');
        setSolutionText('');
        setResponsibleArea('');
        setRequiresPart(false);
        setSeverity(SEVERITY_LEVELS.LEVE);
        setFailureType('mecanico');
        setStep(1);
      }
    }
  }, [isOpen, failure]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1) {
      // Validaciones del paso 1
      if (!description.trim()) {
        setError('La descripción de la falla es obligatoria');
        return;
      }
      if (!responsibleArea) {
        setError('Debe seleccionar un área responsable');
        return;
      }
      setError(null);
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const failureData = {
        checklistId,
        itemId,
        failureType,
        severity,
        description: description.trim(),
        solution_text: solutionText.trim(),
        responsible_area: responsibleArea,
        requiresPart,
        ...(requiresPart && selectedPart && {
          requiredPart: {
            partId: selectedPart.id,
            name: selectedPart.name,
            quantity: partQuantity,
            reference: selectedPart.reference
          }
        })
      };

      if (isCreatingNew) {
        // Crear nueva orden de falla
        const result = await failuresApi.createFailure(failureData);
        console.log('Nueva orden de falla creada:', result);
      } else if (failure) {
        // Actualizar falla existente
        await onUpdate(failureData);
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la falla');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartSelect = (part) => {
    setSelectedPart(part);
  };

  const resetModal = () => {
    setStep(1);
    setRequiresPart(false);
    setSelectedPart(null);
    setPartQuantity(1);
    setSeverity(SEVERITY_LEVELS.LEVE);
    setFailureType('mecanico');
    setDescription('');
    setSolutionText('');
    setResponsibleArea('');
    setError(null);
    setIsCreatingNew(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {isCreatingNew ? 'Reportar Nueva Falla' : 'Actualizar Falla'}
        </h2>

        {/* Indicador de pasos */}
        <div className="flex items-center mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            1
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* PASO 1: Información básica */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-4">
                <label htmlFor="failureType" className="block text-sm font-medium text-gray-700">Tipo de Falla</label>
                <select
                  id="failureType"
                  value={failureType}
                  onChange={(e) => setFailureType(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  required
                >
                  <option value="mecanico">Mecánico</option>
                  <option value="electrico">Eléctrico</option>
                  <option value="electronico">Electrónico</option>
                  <option value="hidraulico">Hidráulico</option>
                  <option value="neumatico">Neumático</option>
                  <option value="optico">Óptico</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="severity" className="block text-sm font-medium text-gray-700">Severidad</label>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  required
                >
                  <option value={SEVERITY_LEVELS.LEVE}>Leve</option>
                  <option value={SEVERITY_LEVELS.MEDIA}>Media</option>
                  <option value={SEVERITY_LEVELS.CRITICA}>Crítica</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción de la Falla</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  placeholder="Describa detalladamente la falla encontrada..."
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="responsibleArea" className="block text-sm font-medium text-gray-700">Área Responsable</label>
                <select
                  id="responsibleArea"
                  value={responsibleArea}
                  onChange={(e) => setResponsibleArea(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  required
                >
                  <option value="">Seleccione un área</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Operación">Operación</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Administración">Administración</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>

              {/* Opción de repuesto */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={requiresPart}
                    onChange={(e) => setRequiresPart(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Esta falla requiere repuesto/parte</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Detalles del repuesto y solución */}
          {step === 2 && (
            <div className="space-y-4">
              {requiresPart && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Gestión de Repuesto</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Se creará automáticamente una orden de trabajo (OT) para gestionar este repuesto.
                      {selectedPart ? (
                        <span className="block mt-1">
                          <strong>Repuesto seleccionado:</strong> {selectedPart.name} 
                          {selectedPart.reference && ` (${selectedPart.reference})`}
                        </span>
                      ) : (
                        <span className="block mt-1 text-blue-600">
                          Si el repuesto no está disponible en inventario, se creará una requisición automáticamente.
                        </span>
                      )}
                    </p>
                  </div>
                </>
              )}

              {!requiresPart && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Orden de Falla Simple</h3>
                  <p className="text-sm text-green-700">
                    Se creará una orden de falla (OF) simple sin necesidad de repuestos adicionales.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="solutionText" className="block text-sm font-medium text-gray-700">
                  Solución Propuesta {isCreatingNew && <span className="text-gray-500">(Opcional)</span>}
                </label>
                <textarea
                  id="solutionText"
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  placeholder="Describa la solución aplicada o propuesta..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Anterior
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Procesando...' : (isCreatingNew ? 'Crear Orden' : 'Actualizar')}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateFailureModal;

'use client'

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosConfig';

const DEBOUNCE_MS = 350;

const SyncSolutionModal = ({
  show,
  onClose,
  targetFailure,
  user,
  onSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  if (!show || !targetFailure) return null;

  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  const doSearch = async (q) => {
    const trimmed = (q || '').trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await axiosInstance.get(`${API_URL}/api/failures/search-resolved-sources`, {
        params: { q: trimmed, limit: 10 }
      });
      if (res.data?.success) {
        setResults(res.data.data || []);
      }
    } catch (err) {
      console.error('Error buscando fallas:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSelectedSource(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), DEBOUNCE_MS);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(searchQuery);
    }
  };

  const handleSelectSource = (failure) => {
    setSelectedSource(failure);
    setSearchQuery('');
    setResults([]);
  };

  const handleClearSelected = () => {
    setSelectedSource(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSync = async () => {
    if (!selectedSource) return;

    setSyncing(true);
    try {
      const response = await axiosInstance.post(`${API_URL}/api/failures/${targetFailure.id}/sync-solution`, {
        source_failure_id: selectedSource.id
      });

      if (response.data.success) {
        await Swal.fire({
          title: 'Solución Sincronizada',
          html: `
            <div class="text-left">
              <p class="mb-2">AR${selectedSource.workOrder ? ' y OT' : ''} sincronizada${selectedSource.workOrder ? 's' : ''} exitosamente desde la falla fuente.</p>
              <p class="text-sm text-gray-600">Los cambios futuros se propagarán automáticamente entre ambas fallas.</p>
            </div>
          `,
          icon: 'success',
          timer: 3000,
          showConfirmButton: true
        });
        onClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error sincronizando solución:', error);
      Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo sincronizar la solución', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sincronizar Solución</h2>
              <p className="text-sm text-gray-600">
                Copia la solución (AR + OT) de una falla ya resuelta a esta falla
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
          </div>

          {/* Falla destino info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Falla destino</h3>
            <p className="text-sm text-gray-700">
              <span className="font-mono text-blue-600">{targetFailure.failure_order_id || `OF-${targetFailure.id}`}</span>
              {' — '}{targetFailure.description}
            </p>
          </div>

          {/* Buscador inteligente */}
          {!selectedSource && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar falla fuente (resuelta)
              </label>
              <div className="relative">
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <div className="px-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar por descripción, ID de falla, actividad realizada o técnico..."
                    className="flex-1 px-2 py-3 text-sm outline-none border-none bg-transparent"
                  />
                  {searching && (
                    <div className="px-3">
                      <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Resultados */}
                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {results.map((failure) => (
                      <button
                        key={failure.id}
                        onClick={() => handleSelectSource(failure)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm font-semibold text-blue-600">
                            {failure.failure_order_id || `OF-${failure.id}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            failure.repairExecution?.status === 'RESUELTA'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {failure.repairExecution?.status || 'SIN AR'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                          {failure.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {failure.repairExecution?.activity_performed && (
                            <span className="truncate max-w-[200px]">
                              Actividad: {failure.repairExecution.activity_performed}
                            </span>
                          )}
                          {failure.repairExecution?.resolver?.user_name && (
                            <span>👤 {failure.repairExecution.resolver.user_name}</span>
                          )}
                          {failure.workOrder && (
                            <span className="text-orange-600">🛠️ Tiene OT</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length > 0 && !searching && results.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                    No se encontraron fallas resueltas con ese criterio
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Busca por descripción, ID de falla (OF-XXXX), actividad de solución registrada, o nombre del técnico que la resolvió
              </p>
            </div>
          )}

          {/* Fallas resueltas recientes cuando no hay búsqueda */}
          {!selectedSource && searchQuery.trim().length === 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 text-xl">💡</span>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Escribe arriba para buscar
                  </p>
                  <p className="text-xs text-blue-700">
                    Puedes buscar por el nombre de la falla, el ID, la actividad que registraste como solución, 
                    o el nombre del técnico que la resolvió.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Vista previa de la seleccionada */}
          {selectedSource && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span>✅</span> Falla fuente seleccionada
                </h3>
                <button
                  onClick={handleClearSelected}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Cambiar
                </button>
              </div>

              <div className="space-y-3 bg-white rounded-lg p-4 border border-green-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">ID / OF</span>
                    <span className="font-mono text-sm font-semibold text-blue-600">
                      {selectedSource.failure_order_id || `OF-${selectedSource.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">Estado AR</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedSource.repairExecution?.status === 'RESUELTA'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedSource.repairExecution?.status || 'Sin AR'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-600 block">Descripción</span>
                  <p className="text-sm text-gray-700">{selectedSource.description}</p>
                </div>

                {selectedSource.repairExecution?.resolver?.user_name && (
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">Resuelto por</span>
                    <p className="text-sm text-gray-700">👤 {selectedSource.repairExecution.resolver.user_name}</p>
                  </div>
                )}

                {selectedSource.repairExecution?.activity_performed && (
                  <div>
                    <span className="text-xs font-medium text-gray-600 block">Actividad realizada</span>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">{selectedSource.repairExecution.activity_performed}</p>
                  </div>
                )}

                {selectedSource.workOrder && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <span className="text-xs font-medium text-orange-700 block mb-1">
                      Esta falla también tiene OT (Orden de Trabajo) que se sincronizará
                    </span>
                    <span className="font-mono text-xs text-orange-600">
                      {selectedSource.workOrder.work_order_id}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-4 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <span>Sincronizar Solución</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncSolutionModal;

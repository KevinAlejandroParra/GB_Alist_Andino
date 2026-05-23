'use client';

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

/**
 * Componente para capturar dos firmas: usuario impersonado y personal de soporte
 */
export default function DualSignaturePad({ 
  onSave, 
  onCancel, 
  impersonatedUserName,
  supportUserName,
  showDatePicker = false,
  defaultDate = null
}) {
  const [activeTab, setActiveTab] = useState('user'); // 'user' o 'support'
  const [userSignature, setUserSignature] = useState(null);
  const [supportSignature, setSupportSignature] = useState(null);
  const [signatureDate, setSignatureDate] = useState(
    defaultDate || new Date().toISOString().slice(0, 16)
  );
  
  const userSigPad = useRef(null);
  const supportSigPad = useRef(null);

  const clearUserSignature = () => {
    userSigPad.current?.clear();
    setUserSignature(null);
  };

  const clearSupportSignature = () => {
    supportSigPad.current?.clear();
    setSupportSignature(null);
  };

  const saveUserSignature = () => {
    if (userSigPad.current && !userSigPad.current.isEmpty()) {
      const dataURL = userSigPad.current.toDataURL();
      setUserSignature(dataURL);
      setActiveTab('support');
    }
  };

  const saveSupportSignature = () => {
    if (supportSigPad.current && !supportSigPad.current.isEmpty()) {
      const dataURL = supportSigPad.current.toDataURL();
      setSupportSignature(dataURL);
    }
  };

  const handleSaveAll = () => {
    if (!userSignature) {
      alert('Debes capturar la firma del usuario impersonado');
      return;
    }
    if (!supportSignature) {
      alert('Debes capturar la firma del personal de soporte');
      return;
    }

    onSave({
      userSignature,
      supportSignature,
      signatureDate: showDatePicker ? new Date(signatureDate).toISOString() : null
    });
  };

  const canSave = userSignature && supportSignature;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <i className="fa fa-signature"></i>
            Captura de Firmas - Modo Soporte
          </h2>
          <p className="mt-2 text-purple-100">
            Se requieren dos firmas: usuario impersonado y personal de soporte
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'user'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <i className="fa fa-user"></i>
              <span>Firma de {impersonatedUserName}</span>
              {userSignature && <i className="fa fa-check-circle text-green-600"></i>}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'support'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <i className="fa fa-user-shield"></i>
              <span>Firma de {supportUserName} (Soporte)</span>
              {supportSignature && <i className="fa fa-check-circle text-green-600"></i>}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Fecha personalizada */}
          {showDatePicker && activeTab === 'user' && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa fa-calendar mr-2 text-orange-600"></i>
                Fecha de la firma (retroactiva)
              </label>
              <input
                type="datetime-local"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Esta fecha se aplicará a la firma del usuario impersonado
              </p>
            </div>
          )}

          {/* Firma del usuario impersonado */}
          {activeTab === 'user' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Firma de {impersonatedUserName}
                </h3>
                <p className="text-sm text-gray-600">
                  Esta firma representa la autorización del usuario impersonado
                </p>
              </div>

              {userSignature ? (
                <div className="space-y-4">
                  <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-700 font-semibold flex items-center gap-2">
                        <i className="fa fa-check-circle"></i>
                        Firma capturada
                      </span>
                      <button
                        onClick={() => {
                          setUserSignature(null);
                          clearUserSignature();
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        <i className="fa fa-trash mr-1"></i>
                        Eliminar
                      </button>
                    </div>
                    <img 
                      src={userSignature} 
                      alt="Firma del usuario" 
                      className="w-full border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <button
                    onClick={() => setActiveTab('support')}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Continuar a firma de soporte
                    <i className="fa fa-arrow-right ml-2"></i>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <SignatureCanvas
                      ref={userSigPad}
                      canvasProps={{
                        className: 'w-full h-64 cursor-crosshair',
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearUserSignature}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      <i className="fa fa-eraser mr-2"></i>
                      Limpiar
                    </button>
                    <button
                      onClick={saveUserSignature}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <i className="fa fa-check mr-2"></i>
                      Guardar firma
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Firma del personal de soporte */}
          {activeTab === 'support' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Firma de {supportUserName} (Personal de Soporte)
                </h3>
                <p className="text-sm text-gray-600">
                  Esta firma certifica que el personal de soporte realizó la acción con autorización
                </p>
              </div>

              {!userSignature && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <i className="fa fa-exclamation-triangle mr-2"></i>
                    Primero debes capturar la firma del usuario impersonado
                  </p>
                </div>
              )}

              {supportSignature ? (
                <div className="space-y-4">
                  <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-700 font-semibold flex items-center gap-2">
                        <i className="fa fa-check-circle"></i>
                        Firma capturada
                      </span>
                      <button
                        onClick={() => {
                          setSupportSignature(null);
                          clearSupportSignature();
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        <i className="fa fa-trash mr-1"></i>
                        Eliminar
                      </button>
                    </div>
                    <img 
                      src={supportSignature} 
                      alt="Firma del soporte" 
                      className="w-full border border-gray-300 rounded bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <SignatureCanvas
                      ref={supportSigPad}
                      canvasProps={{
                        className: 'w-full h-64 cursor-crosshair',
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearSupportSignature}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      <i className="fa fa-eraser mr-2"></i>
                      Limpiar
                    </button>
                    <button
                      onClick={saveSupportSignature}
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <i className="fa fa-check mr-2"></i>
                      Guardar firma
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen de firmas */}
          {(userSignature || supportSignature) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Resumen de firmas:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {userSignature ? (
                    <i className="fa fa-check-circle text-green-600"></i>
                  ) : (
                    <i className="fa fa-circle text-gray-300"></i>
                  )}
                  <span className="text-sm text-gray-700">
                    Firma de {impersonatedUserName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {supportSignature ? (
                    <i className="fa fa-check-circle text-green-600"></i>
                  ) : (
                    <i className="fa fa-circle text-gray-300"></i>
                  )}
                  <span className="text-sm text-gray-700">
                    Firma de {supportUserName} (Soporte)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            <i className="fa fa-times mr-2"></i>
            Cancelar
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!canSave}
            className={`flex-1 py-3 rounded-lg font-semibold ${
              canSave
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <i className="fa fa-save mr-2"></i>
            Guardar ambas firmas
          </button>
        </div>
      </div>
    </div>
  );
}

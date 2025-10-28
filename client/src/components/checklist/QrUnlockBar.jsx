'use client';

import React from 'react';

export default function QrUnlockBar({
  nextLockedSection,
  onUnlockRequest,
  isLoading = false,
  disabled = false,
  qrValidationEnabled = false
}) {
  // Si QR no está habilitado, no mostrar la barra
  if (!qrValidationEnabled) {
    return null;
  }

  // Si no hay sección bloqueada pero QR está habilitado, mostrar barra genérica
  const hasLockedSection = !!nextLockedSection;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg px-6 py-3 flex items-center gap-3 animate-pulse">
        <div className="text-white">
          <span className="text-sm font-medium">
            {hasLockedSection ? "🔒 Sección bloqueada disponible" : "🔓 Escanear código QR"}
          </span>
        </div>

        <div className="w-px h-6 bg-white/30"></div>

        <button
          onClick={onUnlockRequest}
          disabled={disabled || isLoading}
          className="bg-white text-purple-600 px-4 py-2 rounded-full font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
              Validando...
            </>
          ) : (
            <>
              <span>📱</span>
              {hasLockedSection ? `Desbloquear Sección ${nextLockedSection.sectionNumber}` : "Escanear QR"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
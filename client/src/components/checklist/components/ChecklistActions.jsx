'use client'

import React from 'react'

export default function ChecklistActions({ 
  onSign, 
  onSave, 
  onDownload, 
  allowDownload, 
  disabled = false, 
  disableSignature = false,
  hasExistingResponses = false 
}) {
  return (
    <div className="flex justify-end space-x-3">
      <button
        onClick={onSave}
        disabled={disabled}
        className={`px-4 py-2 bg-purple-600 text-white rounded-lg transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
      >
        {hasExistingResponses ? 'Actualizar' : 'Guardar'}
      </button>
      <button
        onClick={onSign}
        disabled={disabled || disableSignature}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${(disabled || disableSignature) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
        title={disableSignature ? 'Debes completar todas las secciones QR antes de firmar' : ''}
      >
        Firmar
      </button>
    </div>
  )
}
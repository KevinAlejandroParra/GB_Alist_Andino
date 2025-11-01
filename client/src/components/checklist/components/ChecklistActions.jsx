'use client'

import React from 'react'

export default function ChecklistActions({ onSign, onSave, onDownload, allowDownload, disabled = false, hasExistingResponses = false }) {
  return (
    <div className="flex justify-end space-x-4">
      <button
        onClick={onSign}
        disabled={disabled}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
      >
        Firmar
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className={`px-4 py-2 bg-purple-600 text-white rounded-lg transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
      >
        {hasExistingResponses ? 'Actualizar' : 'Guardar'}
      </button>

    </div>
  )
}
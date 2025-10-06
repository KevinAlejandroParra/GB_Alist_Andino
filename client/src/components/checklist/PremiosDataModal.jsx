'use client'

import React from 'react';

// Componente de UI "tonto" para el modal de datos de premios
export default function PremiosDataModal({ 
    isOpen, 
    onClose, 
    data, 
    onChange, 
    onSave 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Registrar Datos de Premios</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Fecha</label>
            <input 
              type="date" 
              value={data.fecha}
              onChange={(e) => onChange('fecha', e.target.value)}
              className="w-full p-2 border rounded-md mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tickets Vendidos</label>
            <input 
              type="number" 
              value={data.tickets_vendidos}
              onChange={(e) => onChange('tickets_vendidos', e.target.value)}
              className="w-full p-2 border rounded-md mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tickets Canjeados</label>
            <input 
              type="number" 
              value={data.tickets_canjeados}
              onChange={(e) => onChange('tickets_canjeados', e.target.value)}
              className="w-full p-2 border rounded-md mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Observaciones</label>
            <textarea 
              value={data.observaciones}
              onChange={(e) => onChange('observaciones', e.target.value)}
              className="w-full p-2 border rounded-md mt-1" 
              rows={3}
            />
          </div>
        </div>
        <div className="p-6 border-t flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
            Cancelar
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

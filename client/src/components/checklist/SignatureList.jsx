
'use client'

import React from 'react';

// Helper para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return 'Fecha no disponible';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'America/Bogota'
  }).format(date);
};

const SignatureList = ({ signatures }) => {
  if (!signatures || signatures.length === 0) {
    return null; // No renderizar nada si no hay firmas
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Firmas Registradas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signatures.map((signature) => (
          <div key={signature.signature_id} className="border rounded-lg p-4 flex flex-col items-center text-center bg-slate-50">
            <div className="w-full h-32 mb-4 bg-white border-dashed border-2 rounded-md flex items-center justify-center">
              {signature.digital_token ? (
                <img 
                  src={signature.digital_token} 
                  alt={`Firma de ${signature.user?.user_name}`} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-slate-400 text-sm">Firma no disponible</span>
              )}
            </div>
            <p className="font-semibold text-purple-950">{signature.user?.user_name || 'Usuario desconocido'}</p>
            <p className="text-sm slate-900">{signature.role?.role_name || 'Rol no especificado'}</p>
            <p className="text-xs text-slate-900 mt-2">{formatDate(signature.signed_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignatureList;

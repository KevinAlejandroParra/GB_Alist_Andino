'use client';

import React from 'react';

/**
 * Banner que indica que el checklist fue creado por personal de soporte
 * Se muestra en la vista del checklist para que gerencia pueda identificarlo
 */
export default function SupportCreatedBanner({ checklistData }) {
  if (!checklistData?.created_by_support) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 p-4 mb-4 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <i className="fa fa-user-shield text-orange-600"></i>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2">
            <i className="fa fa-exclamation-triangle"></i>
            Checklist Creado por Soporte
          </h3>
          <div className="mt-2 text-sm text-orange-800">
            <p className="font-medium">
              Este checklist fue diligenciado por personal de soporte en modo de asistencia.
            </p>
            {checklistData.support_notes && (
              <p className="mt-1 text-orange-700">
                <i className="fa fa-info-circle mr-1"></i>
                {checklistData.support_notes}
              </p>
            )}
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-orange-100 p-2 rounded">
                <span className="font-semibold">Usuario Original:</span>{' '}
                {checklistData.creator?.user_name || 'N/A'}
              </div>
              {checklistData.support_user && (
                <div className="bg-orange-100 p-2 rounded">
                  <span className="font-semibold">Personal de Soporte:</span>{' '}
                  {checklistData.support_user?.user_name || 'N/A'}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-orange-700 bg-orange-100 p-2 rounded">
            <i className="fa fa-shield-alt mr-1"></i>
            <strong>Nota:</strong> Este checklist requiere firmas de autorización adicionales.
            El personal de soporte y el administrador deben firmar usando "Firmas Retroactivas".
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

/**
 * Banner informativo para checklists semanales
 * Muestra el rango de la semana y días restantes
 */
export default function WeeklyChecklistBanner({ weekInfo }) {
  if (!weekInfo) return null;

  const { week_identifier, week_range, days_remaining } = weekInfo;

  // Determinar el color del badge según los días restantes
  const getBadgeColor = () => {
    if (days_remaining === 0) return 'bg-red-100 text-red-800 border-red-300';
    if (days_remaining <= 2) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  // Mensaje según días restantes
  const getDaysMessage = () => {
    if (days_remaining === 0) return '¡Último día!';
    if (days_remaining === 1) return '1 día restante';
    return `${days_remaining} días restantes`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Información de la semana */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg 
              className="w-8 h-8 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Checklist Semanal - {week_identifier}
            </h3>
            <p className="text-sm text-gray-600">
              📅 {week_range}
            </p>
          </div>
        </div>

        {/* Badge de días restantes */}
        <div className={`px-4 py-2 rounded-full border-2 ${getBadgeColor()} font-semibold text-sm flex items-center gap-2`}>
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          {getDaysMessage()}
        </div>
      </div>

      {/* Mensaje informativo */}
      <div className="mt-3 text-xs text-gray-600 bg-white bg-opacity-60 rounded px-3 py-2">
        <span className="font-medium">ℹ️ Importante:</span> Este checklist debe completarse antes del domingo a las 23:59. 
        Puedes guardar tu progreso y continuar en cualquier momento durante la semana.
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export default function MaintenanceDayDrawer({
  dayData,
  onClose,
  onOpenSlotWizard
}) {
  if (!dayData) return null;

  const { dateStr, dayNum, slots = [], dayStatus } = dayData;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AZUL':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <i className="fas fa-check-circle mr-1" /> 100% CUMPLIDO (AZUL)
          </span>
        );
      case 'AMARILLO':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <i className="fas fa-spinner fa-spin mr-1" /> EN PROCESO (AMARILLO)
          </span>
        );
      case 'VERDE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <i className="fas fa-medal mr-1" /> BONIFICADO (VERDE)
          </span>
        );
      case 'ROJO':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <i className="fas fa-times-circle mr-1" /> SIN CUMPLIMIENTO (ROJO)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50 transition-all">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">Día {dayNum}</h3>
              <span className="text-xs text-gray-500 font-mono">({dateStr})</span>
            </div>
            <div className="mt-2">{getStatusBadge(dayStatus)}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Máquinas Planificadas ({slots.length})
            </h4>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <i className="fas fa-calendar-day text-4xl mb-3 block text-gray-300" />
              <p className="text-sm">No hay mantenimientos planificados para esta fecha.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map(slot => {
                const isCompleted = slot.slot_display_status === 'AZUL';
                const isInProgress = slot.slot_display_status === 'AMARILLO';

                return (
                  <div
                    key={slot.id}
                    className={`border rounded-2xl p-4 shadow-xs transition-all ${
                      isCompleted
                        ? 'border-blue-200 bg-blue-50/30'
                        : isInProgress
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              slot.slot_type === 'WEEKLY'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {slot.slot_type === 'WEEKLY' ? 'Preventivo Semanal' : 'Preventivo Programado (PP)'}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isCompleted
                                ? 'bg-blue-600 text-white'
                                : isInProgress
                                ? 'bg-amber-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            {slot.slot_display_status}
                          </span>
                        </div>

                        <h5 className="text-base font-bold text-gray-900 mt-1">
                          {slot.inspectable?.name || `Máquina #${slot.ins_id}`}
                        </h5>
                        <p className="text-xs text-gray-500">
                          Familia: <span className="font-medium text-gray-700">{slot.family_name}</span>
                        </p>
                      </div>
                    </div>

                    {/* Session metadata if started */}
                    {slot.latest_session && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                        {slot.latest_session.technician && (
                          <p>
                            <i className="fas fa-user-cog mr-1 text-gray-400" />
                            Técnico: <span className="font-semibold">{slot.latest_session.technician.user_name || slot.latest_session.technician.name || slot.latest_session.technician.username}</span>
                          </p>
                        )}
                        {slot.latest_session.duration_minutes && (
                          <p>
                            <i className="fas fa-stopwatch mr-1 text-gray-400" />
                            Duración: <span className="font-semibold">{slot.latest_session.duration_minutes} min</span>
                          </p>
                        )}
                        {slot.latest_session.description && (
                          <p className="text-gray-700 italic bg-white p-2 rounded border border-gray-100">
                            "{slot.latest_session.description}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    <div className="mt-4 pt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenSlotWizard(slot)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          isCompleted
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                            : isInProgress
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <i className={`fas ${isCompleted ? 'fa-eye' : 'fa-play'}`} />
                        {isCompleted ? 'Ver Detalles de Sesión' : isInProgress ? 'Continuar Mantenimiento' : 'Iniciar con QR'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

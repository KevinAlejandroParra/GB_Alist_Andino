'use client';

import React from 'react';

export default function MaintenanceCalendarView({
  planData,
  currentMonth,
  onMonthChange,
  onGeneratePlan,
  onPublishPlan,
  loading,
  onSelectSlot,
  onSelectDay
}) {
  const [yearStr, monthStr] = (currentMonth || '').split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || new Date().getMonth() + 1;

  // Compute calendar days for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Dom, 1 = Lun...

  const plan = planData?.plan;
  const slots = planData?.slots || [];
  const dayDisplayStatuses = planData?.dayDisplayStatuses || {};
  const stats = planData?.stats || { total: 0, completed: 0, draft: 0, pending: 0 };

  // Group slots by scheduled date
  const slotsByDate = {};
  slots.forEach(slot => {
    const d = slot.scheduled_date;
    if (!slotsByDate[d]) slotsByDate[d] = [];
    slotsByDate[d].push(slot);
  });

  const getSlotColorClasses = (status) => {
    switch (status) {
      case 'AZUL':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
      case 'AMARILLO':
        return 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600';
      case 'VERDE':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
      case 'ROJO':
      default:
        return 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600';
    }
  };

  const getDayBadgeClasses = (status) => {
    switch (status) {
      case 'AZUL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AMARILLO':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'VERDE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ROJO':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const weekDayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* Top Header & KPIs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Mes a Consultar
            </label>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-2 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            {plan ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                plan.status === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <i className={`fas ${plan.status === 'PUBLISHED' ? 'fa-check-circle' : 'fa-clock'} mr-1.5`} />
                {plan.status === 'PUBLISHED' ? 'Plan Publicado' : 'Borrador (DRAFT)'}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Sin Plan para este Mes
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGeneratePlan}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <i className="fas fa-magic" />
            {plan ? 'Regenerar Plan' : 'Generar Plan'}
          </button>

          {plan && plan.status === 'DRAFT' && (
            <button
              type="button"
              onClick={onPublishPlan}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <i className="fas fa-check-double" />
              Publicar Plan
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Total Slots</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            <i className="fas fa-calendar-check" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Completados (Azul)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <i className="fas fa-check-circle" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">En Proceso (Amarillo)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.draft}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i className="fas fa-spinner fa-spin" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Pendientes (Rojo)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
            <i className="fas fa-exclamation-circle" />
          </div>
        </div>
      </div>

      {/* Visual Status Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        <span className="font-semibold text-slate-800">
          <i className="fas fa-palette mr-1.5 text-indigo-600" /> Estados Visuales:
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block" />
            <strong>Azul:</strong> 100% Cumplido (QR + 4 fotos + Descripción)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" />
            <strong>Amarillo:</strong> Iniciado o Incompleto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block" />
            <strong>Rojo:</strong> Sin iniciar / Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
            <strong>Verde (Fase 2):</strong> Azul + Cierre falla en otra máquina
          </span>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center font-bold text-xs uppercase text-gray-600 py-3">
          {weekDayNames.map((d, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-gray-400' : 'text-gray-700'}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-200 bg-gray-100">
          {/* Empty days before month start */}
          {Array.from({ length: firstDayWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[110px] p-2 opacity-50" />
          ))}

          {/* Actual days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${yearMonth}-${String(dayNum).padStart(2, '0')}`;
            const daySlots = slotsByDate[dateStr] || [];
            const dayStatus = dayDisplayStatuses[dateStr];
            const isWeekend = new Date(year, month - 1, dayNum).getDay() === 0 || new Date(year, month - 1, dayNum).getDay() === 6;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDay({ dateStr, dayNum, slots: daySlots, dayStatus })}
                className={`bg-white min-h-[120px] p-2 hover:bg-blue-50/40 transition-colors flex flex-col justify-between cursor-pointer group ${
                  isWeekend ? 'bg-slate-50/60' : ''
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {dayNum}
                  </span>

                  {daySlots.length > 0 && dayStatus && (
                    <span
                      title={`Estado agregado del día: ${dayStatus}`}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getDayBadgeClasses(dayStatus)}`}
                    >
                      {dayStatus}
                    </span>
                  )}
                </div>

                {/* Day Slots List */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[140px] pr-0.5">
                  {daySlots.map(slot => (
                    <div
                      key={slot.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSlot(slot);
                      }}
                      className={`text-[11px] p-1.5 rounded-lg border shadow-xs transition-all flex items-center justify-between gap-1 cursor-pointer font-medium ${getSlotColorClasses(
                        slot.slot_display_status
                      )}`}
                    >
                      <div className="truncate flex-1">
                        <span className="font-bold mr-1">
                          {slot.slot_type === 'WEEKLY' ? '🗓️' : '⚙️'}
                        </span>
                        <span className="truncate">{slot.inspectable?.name || `Máquina #${slot.ins_id}`}</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold opacity-90 px-1 py-0.2 rounded bg-black/20 shrink-0">
                        {slot.slot_display_status}
                      </span>
                    </div>
                  ))}

                  {daySlots.length === 0 && !isWeekend && (
                    <p className="text-[11px] text-gray-300 italic pt-2 text-center">Sin actividad</p>
                  )}
                </div>

                {/* Slot counter indicator */}
                {daySlots.length > 0 && (
                  <div className="pt-1 mt-1 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                    <span>{daySlots.length} {daySlots.length === 1 ? 'máquina' : 'máquinas'}</span>
                    <span className="text-blue-600 font-semibold group-hover:underline">Ver día →</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

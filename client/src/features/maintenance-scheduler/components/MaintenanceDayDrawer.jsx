'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceApi } from '../utils/maintenanceSchedulerApi';
import Swal from 'sweetalert2';

export default function MaintenanceDayDrawer({
  dayData,
  onClose,
  onOpenSlotWizard,
  onDayStatusChange
}) {
  const [failures, setFailures] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loadingF, setLoadingF] = useState(false);
  const [savingClosure, setSavingClosure] = useState(null);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadDayPdf = async () => {
    if (!dayData?.dateStr) return;
    setDownloadingPdf(true);
    try {
      const blob = await maintenanceApi.downloadDayReportPdf(dayData.dateStr);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_diario_${dayData.dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el informe',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const fetchFailures = useCallback(async () => {
    if (!dayData?.dateStr) return;
    setLoadingF(true);
    try {
      const [f, c] = await Promise.all([
        maintenanceApi.getActiveFailuresForDay(dayData.dateStr),
        maintenanceApi.getClosuresForDay(dayData.dateStr)
      ]);
      setFailures(f || []);
      setClosures(c || []);
    } catch (err) {
      console.error('Error fetching failures/closures:', err);
    } finally {
      setLoadingF(false);
    }
  }, [dayData?.dateStr]);

  useEffect(() => {
    if (sectionOpen) fetchFailures();
  }, [sectionOpen, fetchFailures]);

  const handleLinkClosure = async (failureOrderId) => {
    setSavingClosure(failureOrderId);
    try {
      await maintenanceApi.linkFailureClosure(dayData.dateStr, failureOrderId);
      await fetchFailures();
      if (onDayStatusChange) onDayStatusChange();
      Swal.fire({
        icon: 'success',
        title: 'Cierre registrado',
        text: 'El cierre quedó vinculado al día. Si todos los preventivos están cumplidos y la falla es de otra máquina, el día se bonifica (VERDE).',
        confirmButtonColor: '#3b82f6',
        timer: 3500,
        timerProgressBar: true
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo registrar',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    } finally {
      setSavingClosure(null);
    }
  };

  const handleUnlinkClosure = async (closureId) => {
    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar cierre?',
      text: 'Se desvinculará este cierre del día y el estado VERDE se recalculará.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });
    if (!confirm.isConfirmed) return;
    try {
      await maintenanceApi.unlinkFailureClosure(dayData.dateStr, closureId);
      await fetchFailures();
      if (onDayStatusChange) onDayStatusChange();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    }
  };

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadDayPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-black disabled:bg-gray-300 text-white transition-colors"
              title="Descargar informe consolidado del día (preventivos, tiempos, fallas cerradas y repuestos)"
            >
              <i className={`fas ${downloadingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} />
              {downloadingPdf ? 'Generando…' : 'Informe del Día (PDF)'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-times text-lg" />
            </button>
          </div>
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
                                : slot.slot_type === 'BIWEEKLY'
                                  ? 'bg-cyan-100 text-cyan-700'
                                  : slot.slot_type === 'QUARTERLY'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {slot.slot_type === 'WEEKLY' ? 'Preventivo Semanal' : slot.slot_type === 'BIWEEKLY' ? 'Preventivo Quincenal' : slot.slot_type === 'QUARTERLY' ? 'Preventivo Cuatrimestral' : 'Preventivo Programado (PP)'}
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

          {/* ─── Failures / Day Closures (Fase 2) ─── */}
          <div className="border rounded-2xl overflow-hidden border-emerald-200">
            <button
              type="button"
              onClick={() => setSectionOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <span className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <i className="fas fa-wrench" />
                Correctivos del Día — Cierres de Falla
                {closures.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {closures.length}
                  </span>
                )}
              </span>
              <i className={`fas fa-chevron-${sectionOpen ? 'up' : 'down'} text-emerald-600`} />
            </button>

            {sectionOpen && (
              <div className="p-4 space-y-4 bg-white">
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                  <i className="fas fa-user-check mr-1" />
                  Solo puedes vincular fallas que resolviste el <b>{dateStr}</b>.
                </p>
                {/* Registered closures */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Mis cierres registrados ({closures.length})
                  </p>
                  {closures.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin cierres registrados este día.</p>
                  ) : (
                    <ul className="space-y-2">
                      {closures.map(c => (
                        <li key={c.id} className="flex items-start justify-between gap-2 border border-emerald-100 bg-emerald-50/40 rounded-xl p-2.5">
                          <div className="text-xs">
                            <p className="font-semibold text-gray-800">
                              {c.inspectable?.name || `Máquina #${c.affected_ins_id}`}
                            </p>
                            <p className="text-gray-500">
                              {c.failureOrder?.failure_order_id || c.failure_order_id} ·{' '}
                              {c.failureOrder?.repairExecution?.status || '—'}
                            </p>
                            {c.technician && (
                              <p className="text-gray-400 mt-0.5">
                                <i className="fas fa-user-cog mr-1" />
                                {c.technician.user_name || c.technician.name}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlinkClosure(c.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                            title="Eliminar cierre del día"
                          >
                            <i className="fas fa-trash-alt text-xs" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Available failures to close */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Fallas que resolví este día (sin vincular)
                    </p>
                    <button
                      type="button"
                      onClick={fetchFailures}
                      className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-50"
                      title="Recargar"
                    >
                      <i className={`fas ${loadingF ? 'fa-spinner fa-spin' : 'fa-sync-alt'} text-xs`} />
                    </button>
                  </div>
                  {loadingF ? (
                    <p className="text-xs text-gray-400 py-2 text-center">
                      <i className="fas fa-spinner fa-spin mr-1" /> Cargando fallas…
                    </p>
                  ) : failures.filter(f => !closures.some(c => c.failure_order_id === f.id)).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      No tienes fallas resueltas este dia pendientes de vincular.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                      {failures.filter(f => !closures.some(c => c.failure_order_id === f.id)).map(f => (
                        <li key={f.id} className="border border-gray-200 rounded-xl p-2.5 flex items-start justify-between gap-2">
                          <div className="text-xs">
                            <p className="font-semibold text-gray-800">
                              {f.affected_name}
                              {f.severity && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  f.severity === 'CRITICA' ? 'bg-rose-100 text-rose-700'
                                    : f.severity === 'MODERADA' ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {f.severity}
                                </span>
                              )}
                            </p>
                            <p className="text-gray-500 mt-0.5">{f.description || '—'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                {f.status}
                              </span>
                              {f.repair_execution?.end_time && (
                                <span className="text-[10px] text-gray-400">
                                  Resuelta: {new Date(f.repair_execution.end_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={savingClosure === f.id}
                            onClick={() => handleLinkClosure(f.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shrink-0"
                            title="Vincular este correctivo al día laboral"
                          >
                            {savingClosure === f.id ? (
                              <i className="fas fa-spinner fa-spin" />
                            ) : (
                              <i className="fas fa-link" />
                            )}
                            Vincular
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 leading-relaxed">
                  <i className="fas fa-info-circle mr-1" />
                  El día se bonifica (VERDE) cuando todos los preventivos están cumplidos y se
                  registró al menos un cierre de falla en una máquina <b>distinta</b> a las
                  planificadas ese día.
                </p>
              </div>
            )}
          </div>
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

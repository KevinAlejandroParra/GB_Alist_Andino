'use client';

import React, { useState, useEffect } from 'react';
import { maintenanceApi } from '../utils/maintenanceSchedulerApi';
import Swal from 'sweetalert2';

export default function MaintenanceConfigPanel({ premiseId = 1 }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, WEEKLY, SCHEDULED, EXEMPT
  const [savingId, setSavingId] = useState(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await maintenanceApi.getMachineConfigs(premiseId);
      setConfigs(data || []);
    } catch (err) {
      console.error('Error fetching machine configs:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar máquinas',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [premiseId]);

  const handleUpdate = async (insId, patch) => {
    setSavingId(insId);
    try {
      await maintenanceApi.updateMachineConfig(insId, patch);
      setConfigs(prev =>
        prev.map(c => (c.ins_id === insId ? { ...c, ...patch } : c))
      );
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleGenerateQr = async (insId) => {
    try {
      const res = await maintenanceApi.generateMachineQr(insId);
      setConfigs(prev =>
        prev.map(c => (c.ins_id === insId ? { ...c, has_qr: true, qr_code: res.qr_code } : c))
      );
      Swal.fire({
        title: 'Código QR Generado',
        text: `QR: ${res.qr_code}`,
        imageUrl: res.dataUrl,
        imageWidth: 200,
        imageHeight: 200,
        imageAlt: 'Código QR',
        confirmButtonText: 'Listo',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error generando QR',
        text: err.response?.data?.error || err.message
      });
    }
  };

  const weekdays = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' }
  ];

  const filtered = configs.filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (c.family_name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    if (filterType === 'WEEKLY') return c.weekly_enabled;
    if (filterType === 'SCHEDULED') return !c.weekly_enabled && !c.scheduled_exempt;
    if (filterType === 'EXEMPT') return c.scheduled_exempt;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px]">
          <div className="relative">
            <i className="fas fa-search absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar máquina por nombre o familia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'ALL', label: `Todas (${configs.length})` },
            { id: 'WEEKLY', label: `Semanales (${configs.filter(c => c.weekly_enabled).length})` },
            { id: 'SCHEDULED', label: `Programadas (${configs.filter(c => !c.weekly_enabled && !c.scheduled_exempt).length})` },
            { id: 'EXEMPT', label: `Exentas (${configs.filter(c => c.scheduled_exempt).length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === tab.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchConfigs}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Recargar máquinas"
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
        </button>
      </div>

      {/* Machines Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-5 py-4">Máquina</th>
                <th className="px-5 py-4 text-center">Preventivo Semanal</th>
                <th className="px-5 py-4">Día Fijo Semanal</th>
                <th className="px-5 py-4 text-center">Exento de PP</th>
                <th className="px-5 py-4">Último Programado</th>
                <th className="px-5 py-4 text-center">Código QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2 block" />
                    Cargando máquinas y configuraciones...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    No se encontraron máquinas con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filtered.map(cfg => {
                  const isSaving = savingId === cfg.ins_id;

                  return (
                    <tr key={cfg.ins_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Family */}
                      <td className="px-5 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                            #{cfg.ins_id}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{cfg.name}</p>
                            <span className="text-xs text-gray-500">{cfg.family_name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Weekly Toggle */}
                      <td className="px-5 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.weekly_enabled}
                            onChange={(e) =>
                              handleUpdate(cfg.ins_id, { weekly_enabled: e.target.checked })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </td>

                      {/* Weekday Selector */}
                      <td className="px-5 py-4">
                        {cfg.weekly_enabled ? (
                          <select
                            value={cfg.weekly_weekday ?? 1}
                            onChange={(e) =>
                              handleUpdate(cfg.ins_id, { weekly_weekday: parseInt(e.target.value, 10) })
                            }
                            className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
                          >
                            {weekdays.map(w => (
                              <option key={w.id} value={w.id}>
                                {w.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No aplica</span>
                        )}
                      </td>

                      {/* Scheduled Exempt Toggle */}
                      <td className="px-5 py-4 text-center">
                        {!cfg.weekly_enabled ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.scheduled_exempt}
                              onChange={(e) =>
                                handleUpdate(cfg.ins_id, { scheduled_exempt: e.target.checked })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Es semanal</span>
                        )}
                      </td>

                      {/* Last Scheduled At */}
                      <td className="px-5 py-4">
                        <input
                          type="date"
                          value={cfg.last_scheduled_at ? String(cfg.last_scheduled_at).slice(0, 10) : ''}
                          onChange={(e) =>
                            handleUpdate(cfg.ins_id, { last_scheduled_at: e.target.value || null })
                          }
                          className="bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>

                      {/* QR Code Action */}
                      <td className="px-5 py-4 text-center">
                        {cfg.has_qr ? (
                          <button
                            type="button"
                            onClick={() => handleGenerateQr(cfg.ins_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <i className="fas fa-qrcode" />
                            Ver QR
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateQr(cfg.ins_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            <i className="fas fa-plus" />
                            Generar QR
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

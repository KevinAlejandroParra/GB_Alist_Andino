'use client';

import React, { useState, useEffect } from 'react';
import { maintenanceApi } from '../utils/maintenanceSchedulerApi';
import Swal from 'sweetalert2';

export default function MaintenanceSettingsPanel({ premiseId = 1 }) {
  const [settings, setSettings] = useState({
    strategy: 'HYBRID',
    max_scheduled_per_day: 5,
    working_days: '1,2,3,4,5',
    hybrid_weights: { failure_count: 0.6, days_since_last: 0.4 }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await maintenanceApi.getSettings(premiseId);
        if (data) {
          setSettings({
            strategy: data.strategy || 'HYBRID',
            max_scheduled_per_day: data.max_scheduled_per_day || 5,
            working_days: data.working_days || '1,2,3,4,5',
            hybrid_weights: data.hybrid_weights || { failure_count: 0.6, days_since_last: 0.4 }
          });
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [premiseId]);

  const handleWorkingDayToggle = (dayId) => {
    const current = settings.working_days
      ? settings.working_days.split(',').map(s => parseInt(s.trim(), 10))
      : [1, 2, 3, 4, 5];

    let updated;
    if (current.includes(dayId)) {
      updated = current.filter(d => d !== dayId);
    } else {
      updated = [...current, dayId].sort();
    }
    setSettings(prev => ({ ...prev, working_days: updated.join(',') }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await maintenanceApi.updateSettings(premiseId, settings);
      Swal.fire({
        icon: 'success',
        title: 'Parámetros actualizados',
        text: 'La estrategia y capacidad del cronograma se guardaron correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error guardando parámetros',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setSaving(false);
    }
  };

  const daysList = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' }
  ];

  const workingDaysArray = (settings.working_days || '')
    .split(',')
    .map(s => parseInt(s.trim(), 10));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            <i className="fas fa-sliders-h mr-2 text-indigo-600" />
            Estrategia de Planificación y Capacidad
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Define cómo el motor de planificación distribuye los preventivos programados en el mes.
          </p>
        </div>

        {/* Strategy Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700">
            Estrategia de Priorización
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'HYBRID',
                title: 'Híbrido (Recomendado)',
                desc: 'Combina fallas activas + antigüedad del último preventivo programado.',
                icon: 'fa-balance-scale'
              },
              {
                id: 'FAILURE_COUNT',
                title: 'Por Fallas Acumuladas',
                desc: 'Prioriza primero las máquinas con mayor cantidad de fallas correctivas abiertas.',
                icon: 'fa-wrench'
              },
              {
                id: 'LAST_SCHEDULED',
                title: 'Por Último Preventivo',
                desc: 'Prioriza las máquinas que llevan más tiempo sin recibir preventivo programado.',
                icon: 'fa-history'
              }
            ].map(strat => (
              <div
                key={strat.id}
                onClick={() => setSettings(prev => ({ ...prev, strategy: strat.id }))}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.strategy === strat.id
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <i className={`fas ${strat.icon} ${settings.strategy === strat.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="font-bold text-sm">{strat.title}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{strat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hybrid Weights if HYBRID is selected */}
        {settings.strategy === 'HYBRID' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ponderación del Algoritmo Híbrido
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Peso de Fallas Activas ({Math.round(settings.hybrid_weights.failure_count * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={settings.hybrid_weights.failure_count}
                  onChange={(e) => {
                    const fc = parseFloat(e.target.value);
                    const ds = parseFloat((1 - fc).toFixed(2));
                    setSettings(prev => ({
                      ...prev,
                      hybrid_weights: { failure_count: fc, days_since_last: ds }
                    }));
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Peso de Antigüedad Preventivo ({Math.round(settings.hybrid_weights.days_since_last * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={settings.hybrid_weights.days_since_last}
                  onChange={(e) => {
                    const ds = parseFloat(e.target.value);
                    const fc = parseFloat((1 - ds).toFixed(2));
                    setSettings(prev => ({
                      ...prev,
                      hybrid_weights: { failure_count: fc, days_since_last: ds }
                    }));
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Max Per Day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Capacidad Máxima Diaria (Máquinas Programadas / Día)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Límite de preventivos programados asignables en un solo día laborable.
            </p>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.max_scheduled_per_day}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, max_scheduled_per_day: parseInt(e.target.value, 10) || 1 }))
              }
              className="w-32 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Días Laborables para Preventivos
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Días de la semana en los que se programarán slots preventivos.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {daysList.map(d => {
                const isActive = workingDaysArray.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleWorkingDayToggle(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            Guardar Parámetros
          </button>
        </div>
      </div>
    </div>
  );
}

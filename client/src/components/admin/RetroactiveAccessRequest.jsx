'use client';
import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';

/**
 * Formulario de 3 pasos para solicitar acceso retroactivo.
 * Paso 1: Seleccionar fecha + tipo de checklist
 * Paso 2: Ver checklists existentes y elegir acción (retomar / crear nuevo)
 * Paso 3: Escribir justificación y enviar
 */
export default function RetroactiveAccessRequestForm({ onRequestSent }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Paso 1
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [targetDate, setTargetDate] = useState('');

  // Paso 2
  const [existingChecklists, setExistingChecklists] = useState([]);
  const [actionType, setActionType] = useState(''); // 'access_existing' | 'create_new'
  const [selectedChecklistId, setSelectedChecklistId] = useState(null);

  // Paso 3
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fechas permitidas: desde ayer hasta hace 30 días
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() - 1);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 30);

  const toInputDate = (d) => d.toISOString().split('T')[0];

  useEffect(() => {
    loadChecklistTypes();
  }, []);

  const loadChecklistTypes = async () => {
    try {
      const res = await axiosInstance.get('/api/support/types');
      setChecklistTypes(res.data.data || []);
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los tipos de checklist', 'error');
    }
  };

  const handleStep1Next = async () => {
    if (!selectedType || !targetDate) {
      Swal.fire('Atención', 'Selecciona un tipo de checklist y una fecha', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/retroactive-access/existing-checklists', {
        params: { checklist_type_id: selectedType.checklist_type_id, target_date: targetDate },
      });
      setExistingChecklists(res.data.data || []);
      setActionType('');
      setSelectedChecklistId(null);
      setStep(2);
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los checklists existentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = () => {
    if (!actionType) {
      Swal.fire('Atención', 'Debes seleccionar una acción', 'warning');
      return;
    }
    if (actionType === 'access_existing' && !selectedChecklistId) {
      Swal.fire('Atención', 'Selecciona el checklist que deseas retomar', 'warning');
      return;
    }
    setJustification('');
    setStep(3);
  };

  const handleSubmit = async () => {
    if (justification.trim().length < 10) {
      Swal.fire('Atención', 'La justificación debe tener al menos 10 caracteres', 'warning');
      return;
    }
    if (justification.trim().length > 500) {
      Swal.fire('Atención', 'La justificación no puede superar 500 caracteres', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post('/api/retroactive-access/requests', {
        checklist_type_id: selectedType.checklist_type_id,
        target_date: targetDate,
        action_type: actionType,
        target_checklist_id: actionType === 'access_existing' ? selectedChecklistId : undefined,
        justification: justification.trim(),
      });

      Swal.fire({
        title: '¡Solicitud enviada!',
        html: `
          <p>Tu solicitud fue enviada al técnico de sistemas.</p>
          <p class="text-sm text-gray-500 mt-2">Recibirás un correo con el enlace de acceso una vez sea aprobada.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#7c3aed',
      });

      // Reset
      setStep(1);
      setSelectedType(null);
      setTargetDate('');
      setExistingChecklists([]);
      setActionType('');
      setSelectedChecklistId(null);
      setJustification('');
      if (onRequestSent) onRequestSent();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'No se pudo enviar la solicitud';
      if (status === 409) {
        Swal.fire('Solicitud duplicada', msg, 'warning');
      } else {
        Swal.fire('Error', msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center space-x-2">
        {[
          { n: 1, label: 'Fecha y tipo' },
          { n: 2, label: 'Acción' },
          { n: 3, label: 'Justificación' },
        ].map(({ n, label }, i, arr) => (
          <React.Fragment key={n}>
            <div className={`flex items-center gap-2 ${step >= n ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step > n ? 'bg-green-500 text-white' : step === n ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                {step > n ? '✓' : n}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{label}</span>
            </div>
            {i < arr.length - 1 && <div className="w-8 h-0.5 bg-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Paso 1: Fecha + tipo ── */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow space-y-5">
          <h3 className="text-base font-semibold text-gray-800">Selecciona la fecha y el tipo de checklist</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Fecha retroactiva</label>
            <input
              type="date"
              value={targetDate}
              min={toInputDate(minDate)}
              max={toInputDate(maxDate)}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Rango permitido: hasta {toInputDate(maxDate)} (máx 30 días atrás)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📋 Tipo de checklist</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {checklistTypes.map(type => (
                <div
                  key={type.checklist_type_id}
                  onClick={() => setSelectedType(type)}
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-all text-sm
                    ${selectedType?.checklist_type_id === type.checklist_type_id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'}`}
                >
                  <p className="font-semibold text-gray-800">{type.name}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">{type.type_category}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{type.role?.role_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStep1Next}
            disabled={loading || !targetDate || !selectedType}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Consultando...' : 'Siguiente →'}
          </button>
        </div>
      )}

      {/* ── Paso 2: Elegir acción ── */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">¿Qué deseas hacer?</h3>
            <button onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-purple-600">
              ← Cambiar fecha/tipo
            </button>
          </div>

          {/* Resumen selección */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
            <p><span className="font-semibold">Checklist:</span> {selectedType?.name}</p>
            <p><span className="font-semibold">Fecha:</span> {formatDate(targetDate)}</p>
          </div>

          {/* Checklists existentes */}
          {existingChecklists.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Se encontraron {existingChecklists.length} checklist(s) para esa fecha:
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {existingChecklists.map(c => (
                  <div
                    key={c.checklist_id}
                    onClick={() => { setActionType('access_existing'); setSelectedChecklistId(c.checklist_id); }}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all
                      ${selectedChecklistId === c.checklist_id && actionType === 'access_existing'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Checklist #{c.checklist_id}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {new Date(c.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {c.created_by_name && (
                          <span className="ml-2 text-xs text-gray-400">— {c.created_by_name}</span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                        ${c.is_complete ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {c.is_complete ? '✓ Completo' : '⏳ Incompleto'}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      <span>📝 {c.response_count} respuestas</span>
                      <span>✍️ {c.signature_count} firmas</span>
                      {c.week_identifier && <span>📅 {c.week_identifier}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  onClick={() => { setActionType('create_new'); setSelectedChecklistId(null); }}
                  className={`w-full border-2 rounded-lg p-3 text-sm font-semibold transition-all
                    ${actionType === 'create_new'
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-dashed border-gray-300 text-gray-600 hover:border-green-400'}`}
                >
                  ➕ Crear uno nuevo desde cero
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600 mb-3">
                No se encontraron checklists para esa fecha. Se creará uno nuevo.
              </div>
              <button
                onClick={() => setActionType('create_new')}
                className={`w-full border-2 rounded-lg p-3 text-sm font-semibold transition-all
                  ${actionType === 'create_new'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-green-300 text-green-700 hover:bg-green-50'}`}
              >
                ➕ Crear nuevo checklist
              </button>
            </div>
          )}

          <button
            onClick={handleStep2Next}
            disabled={!actionType}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* ── Paso 3: Justificación ── */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-xl shadow space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Justifica tu solicitud</h3>
            <button onClick={() => setStep(2)} className="text-xs text-gray-500 hover:text-purple-600">
              ← Cambiar acción
            </button>
          </div>

          {/* Resumen */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
            <p><span className="font-semibold">Checklist:</span> {selectedType?.name}</p>
            <p><span className="font-semibold">Fecha:</span> {formatDate(targetDate)}</p>
            <p><span className="font-semibold">Acción:</span>{' '}
              {actionType === 'access_existing'
                ? `📂 Retomar checklist #${selectedChecklistId}`
                : '➕ Crear nuevo checklist'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📝 ¿Por qué no pudiste completarlo en su momento?
            </label>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="Explica brevemente la razón por la que no pudiste completar el checklist ese día (mín. 10 caracteres)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className={`text-xs text-right mt-1 ${justification.length > 480 ? 'text-red-500' : 'text-gray-400'}`}>
              {justification.length}/500
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            ℹ️ Tu solicitud será revisada por el técnico de sistemas. Recibirás un correo con el resultado.
            El enlace de acceso expira a las 24 horas de ser emitido.
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || justification.trim().length < 10}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Enviando...
              </>
            ) : '📨 Enviar solicitud'}
          </button>
        </div>
      )}
    </div>
  );
}

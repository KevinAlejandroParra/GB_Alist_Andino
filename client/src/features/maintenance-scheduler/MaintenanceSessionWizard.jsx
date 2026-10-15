'use client';

import React, { useState, useEffect } from 'react';
import { maintenanceApi } from './utils/maintenanceSchedulerApi';
import { getImageSrc } from '../../utils/imageUrl';
import QrScannerModal from '../../components/checklist/QrScannerModal';
import Swal from 'sweetalert2';

const PHASES = [
  { key: 'INICIO', label: '1. Foto de Inicio', desc: 'Estado inicial antes de intervenir' },
  { key: 'PROCESO_1', label: '2. Foto Proceso 1', desc: 'Desarme o limpieza intermedia' },
  { key: 'PROCESO_2', label: '3. Foto Proceso 2', desc: 'Ajuste, lubricación o recambio' },
  { key: 'FIN', label: '4. Foto Final', desc: 'Máquina rearmada y operativa' }
];

export default function MaintenanceSessionWizard({ slot, onComplete, onClose }) {
  const [step, setStep] = useState(0); // 0: QR, 1: Evidencias, 2: Descripción, 3: Finalizar
  const [session, setSession] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [description, setDescription] = useState('');
  const [uploadingPhase, setUploadingPhase] = useState(null);
  const [loading, setLoading] = useState(false);

  const [evidences, setEvidences] = useState({
    INICIO: null,
    PROCESO_1: null,
    PROCESO_2: null,
    FIN: null
  });

  // Check if slot already has an existing session
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const existing = await maintenanceApi.getSessionBySlot(slot.id);
        if (existing) {
          setSession(existing);
          setSessionId(existing.id);
          setDescription(existing.description || '');

          // Map existing evidences
          const evMap = { INICIO: null, PROCESO_1: null, PROCESO_2: null, FIN: null };
          (existing.evidences || []).forEach(e => {
            if (evMap[e.phase] !== undefined) {
              evMap[e.phase] = e.file_url;
            }
          });
          setEvidences(evMap);

          if (existing.status === 'COMPLETED') {
            setStep(3); // View completed summary
          } else {
            setStep(1); // Resume at evidences
          }
        }
      } catch (err) {
        console.error("Error checking existing session:", err);
      }
    };

    if (slot?.id) {
      checkExistingSession();
    }
  }, [slot]);

  // Start session with QR
  const handleStartSession = async (codeToUse) => {
    const code = codeToUse || qrCode;
    if (!code || !code.trim()) {
      return Swal.fire({
        icon: 'warning',
        title: 'Código QR requerido',
        text: 'Por favor escanee o ingrese el código QR de la máquina.',
        confirmButtonColor: '#3b82f6'
      });
    }

    setLoading(true);
    try {
      const res = await maintenanceApi.startSession(slot.id, code.trim());
      setSession(res);
      setSessionId(res.id);

      // Pre-fill existing evidences if any
      const evMap = { INICIO: null, PROCESO_1: null, PROCESO_2: null, FIN: null };
      (res.evidences || []).forEach(e => {
        if (evMap[e.phase] !== undefined) evMap[e.phase] = e.file_url;
      });
      setEvidences(evMap);

      setStep(1);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'QR Inválido para esta máquina',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload single photo evidence
  const handleUploadEvidence = async (phase, file) => {
    if (!file || !sessionId) return;

    setUploadingPhase(phase);
    try {
      const result = await maintenanceApi.uploadEvidence(sessionId, phase, file);
      setEvidences(prev => ({ ...prev, [phase]: result.file_url }));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error subiendo fotografía',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setUploadingPhase(null);
    }
  };

  // Complete session
  const handleComplete = async () => {
    const hasAll = Object.values(evidences).every(v => v !== null && v !== '');
    if (!hasAll) {
      return Swal.fire({
        icon: 'warning',
        title: 'Evidencias incompletas',
        text: 'Debe cargar las 4 fotografías obligatorias antes de completar la sesión.',
        confirmButtonColor: '#3b82f6'
      });
    }

    setLoading(true);
    try {
      await maintenanceApi.completeSession(sessionId, description);
      await Swal.fire({
        icon: 'success',
        title: '¡Mantenimiento Completado!',
        text: 'La sesión se guardó con éxito y el slot pasó a color AZUL (100% cumplido).',
        confirmButtonColor: '#10b981'
      });
      if (onComplete) onComplete();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al finalizar sesión',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = session?.status === 'COMPLETED';
  const allEvidencesUploaded = Object.values(evidences).every(v => v !== null && v !== '');

  const stepLabels = ['Validar QR', '4 Evidencias', 'Descripción', 'Finalizar'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                slot.slot_type === 'WEEKLY' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {slot.slot_type === 'WEEKLY' ? 'Preventivo Semanal' : 'Preventivo Programado (PP)'}
              </span>
              {isCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-600 text-white">
                  Completado (AZUL)
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-1">
              {slot.inspectable?.name || `Máquina #${slot.ins_id}`}
            </h3>
            <p className="text-xs text-gray-500">
              Fecha programada: <span className="font-semibold">{slot.scheduled_date}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        {/* Stepper Progress */}
        {!isCompleted && (
          <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between text-xs font-semibold">
            {stepLabels.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : step > idx
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > idx ? '✓' : idx + 1}
                </span>
                <span className={step === idx ? 'text-indigo-600 font-bold' : 'text-gray-500'}>
                  {label}
                </span>
                {idx < stepLabels.length - 1 && <span className="text-gray-200 hidden sm:inline">———</span>}
              </div>
            ))}
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 0: QR VALIDATION */}
          {step === 0 && !isCompleted && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-inner">
                <i className="fas fa-qrcode" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-900">Validación Obligatoria de QR</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Para iniciar el mantenimiento preventivo, debe escanear el código QR adherido a la máquina <strong>{slot.inspectable?.name}</strong>.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-camera text-lg" />
                  Abrir Cámara para Escanear QR
                </button>

                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 uppercase font-semibold">o ingresar código</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. MAINT-12-AB34CD"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleStartSession()}
                    disabled={loading || !qrCode.trim()}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    {loading ? <i className="fas fa-spinner fa-spin" /> : 'Validar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: 4 MANDATORY EVIDENCES */}
          {step === 1 && !isCompleted && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900">4 Evidencias Fotográficas Obligatorias</h4>
                  <p className="text-xs text-gray-500">
                    Todas las fotos son obligatorias para cumplir la condición azul.
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  allEvidencesUploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {Object.values(evidences).filter(Boolean).length} / 4 Fotos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {PHASES.map((ph) => {
                  const currentUrl = evidences[ph.key];
                  const isUploading = uploadingPhase === ph.key;

                  return (
                    <div
                      key={ph.key}
                      className={`border-2 rounded-2xl p-4 transition-all flex flex-col justify-between ${
                        currentUrl
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-dashed border-gray-300 bg-gray-50/50 hover:border-indigo-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-800">{ph.label}</span>
                          {currentUrl ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ Cargada
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{ph.desc}</p>
                      </div>

                      {/* Photo preview or upload button */}
                      <div className="mt-3">
                        {currentUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-black aspect-video flex items-center justify-center">
                            <img
                              src={getImageSrc(currentUrl)}
                              alt={ph.label}
                              className="w-full h-full object-cover"
                            />
                            <label className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors flex items-center gap-1">
                              <i className="fas fa-camera" /> Cambiar
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handleUploadEvidence(ph.key, e.target.files[0])}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="w-full py-6 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                            {isUploading ? (
                              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                                <i className="fas fa-spinner fa-spin text-lg" /> Subiendo...
                              </div>
                            ) : (
                              <>
                                <i className="fas fa-camera text-2xl text-indigo-500 mb-1" />
                                <span className="text-xs font-bold text-indigo-700">Tomar o Seleccionar Foto</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => handleUploadEvidence(ph.key, e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                >
                  ← Volver a QR
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!allEvidencesUploaded}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                >
                  Continuar a Descripción →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DESCRIPTION */}
          {step === 2 && !isCompleted && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-gray-900">Descripción y Observaciones Técnicas</h4>
                <p className="text-xs text-gray-500">
                  Detalla los procedimientos realizados, calibraciones o partes intervenidas.
                </p>
              </div>

              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el trabajo realizado (ej. Limpieza de sensores ópticos, ajuste de poleas y lubricación de engranajes principales)..."
                className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                >
                  ← Volver a Evidencias
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                >
                  Revisar y Finalizar →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUMMARY & FINALIZE (OR VIEW COMPLETED) */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">
                    {isCompleted ? 'Resumen de Mantenimiento Ejecutado' : 'Confirmar y Finalizar Sesión'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {isCompleted
                      ? `Completado el ${new Date(session.completed_at).toLocaleString()}`
                      : 'Verifica las 4 fotos y la descripción antes de registrar el cumplimiento.'}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  isCompleted ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isCompleted ? 'AZUL (Cumplido)' : 'Listo para cierre'}
                </span>
              </div>

              {/* Photos Gallery */}
              <div>
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Fotografías Registradas (4)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PHASES.map((ph) => (
                    <div key={ph.key} className="rounded-xl overflow-hidden border border-gray-200 aspect-square bg-black relative">
                      {evidences[ph.key] ? (
                        <img
                          src={getImageSrc(evidences[ph.key])}
                          alt={ph.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">Sin foto</div>
                      )}
                      <span className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1 py-0.5 rounded text-center truncate">
                        {ph.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description summary */}
              <div>
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Descripción del Trabajo
                </h5>
                <p className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium">
                  {description || 'Sin descripción ingresada.'}
                </p>
              </div>

              {/* Final Actions */}
              {!isCompleted ? (
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                  >
                    ← Modificar Descripción
                  </button>

                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-md transition-all text-sm"
                  >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-check-circle'}`} />
                    Finalizar y Marcar AZUL
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl text-sm"
                  >
                    Cerrar Detalle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal (Camera) */}
      <QrScannerModal
        show={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(decoded) => {
          setShowScanner(false);
          setQrCode(decoded);
          handleStartSession(decoded);
        }}
        title={`Escanear QR de ${slot.inspectable?.name || 'Máquina'}`}
      />
    </div>
  );
}

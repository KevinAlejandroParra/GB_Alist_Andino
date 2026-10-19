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
  const [step, setStep] = useState(0); // 0: QR, 1: Evidencias, 2: Descripción, 3: Repuestos, 4: Finalizar
  const [session, setSession] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [description, setDescription] = useState('');
  const [uploadingPhase, setUploadingPhase] = useState(null);
  const [loading, setLoading] = useState(false);

  // Repuestos (OT autogenerada lazy)
  const [woInfo, setWoInfo] = useState(null); // { work_order_id, parts: [] }
  const [inventory, setInventory] = useState([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [addingPart, setAddingPart] = useState(false);
  const [partsLoaded, setPartsLoaded] = useState(false);

  // Requisiciones manuales (repuestos solicitados sin stock)
  const [requisitions, setRequisitions] = useState([]);
  const [reqPartRef, setReqPartRef] = useState('');
  const [reqQty, setReqQty] = useState(1);
  const [reqNotes, setReqNotes] = useState('');
  const [addingReq, setAddingReq] = useState(false);
  const [requisitionsLoaded, setRequisitionsLoaded] = useState(false);

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
            setStep(4); // View completed summary
            // Cargar repuestos de la OT si existe
            maintenanceApi.getSessionParts(existing.id)
              .then(data => setWoInfo(data))
              .catch(() => {});
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

  // Lee la duración de un video local usando un <video> temporal
  const getVideoDuration = (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration || 0);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
    });

  // Upload single photo or short video evidence (max 15s for videos)
  const handleUploadEvidence = async (phase, file) => {
    if (!file || !sessionId) return;

    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      const duration = await getVideoDuration(file);
      if (duration > 15) {
        return Swal.fire({
          icon: 'warning',
          title: 'Video demasiado largo',
          text: `El video dura ${Math.round(duration)} segundos. El límite es de 15 segundos.`,
          confirmButtonColor: '#3b82f6'
        });
      }
    }

    setUploadingPhase(phase);
    try {
      const result = await maintenanceApi.uploadEvidence(sessionId, phase, file);
      setEvidences(prev => ({ ...prev, [phase]: result.file_url }));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error subiendo evidencia',
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
  const totalParts = (woInfo?.parts || []).reduce((sum, p) => sum + (p.quantity_used || 0), 0);

  const stepLabels = ['Validar QR', '4 Evidencias', 'Descripción', 'Repuestos', 'Finalizar'];

  // Carga inventario + repuestos existentes al entrar al paso 3
  useEffect(() => {
    if (step !== 3 || !sessionId) return;
    if (!partsLoaded) {
      setPartsLoaded(true);
      maintenanceApi.getSessionParts(sessionId)
        .then(setWoInfo)
        .catch(err => console.error('Error cargando repuestos:', err));
    }
    if (inventory.length === 0) {
      maintenanceApi.getInventoryItems()
        .then(data => setInventory(Array.isArray(data) ? data : data.items || []))
        .catch(err => console.error('Error cargando inventario:', err));
    }
    loadRequisitions();
  }, [step, sessionId]);

  const handleAddPart = async () => {
    if (!selectedInventoryId) return;
    setAddingPart(true);
    try {
      const result = await maintenanceApi.addSessionPart(sessionId, Number(selectedInventoryId), partQty);
      setWoInfo(prev => ({
        work_order_id: result.work_order_id,
        parts: [...(prev?.parts || []).filter(p => p.id !== result.part.id), result.part]
      }));
      setSelectedInventoryId('');
      setPartQty(1);
      Swal.fire({
        icon: 'success',
        title: 'Repuesto agregado',
        text: `Stock restante: ${result.remaining_stock}`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al agregar repuesto',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setAddingPart(false);
    }
  };

  const handleRemovePart = async (partId) => {
    try {
      await maintenanceApi.removeSessionPart(sessionId, partId);
      setWoInfo(prev => ({ ...prev, parts: (prev?.parts || []).filter(p => p.id !== partId) }));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al quitar repuesto',
        text: err.response?.data?.error || err.message
      });
    }
  };

  // ── Requisiciones manuales ──
  const loadRequisitions = async () => {
    if (!sessionId || requisitionsLoaded) return;
    try {
      const list = await maintenanceApi.getSessionRequisitions(sessionId);
      setRequisitions(list || []);
    } catch (err) {
      console.error('Error al cargar requisiciones:', err);
    } finally {
      setRequisitionsLoaded(true);
    }
  };

  const handleAddRequisition = async () => {
    if (!reqPartRef.trim()) return;
    try {
      setAddingReq(true);
      const created = await maintenanceApi.createSessionRequisition(sessionId, {
        partReference: reqPartRef.trim(),
        quantity: Number(reqQty) || 1,
        notes: reqNotes.trim() || null
      });
      setRequisitions(prev => [...prev, created]);
      setReqPartRef('');
      setReqQty(1);
      setReqNotes('');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al crear requisición',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setAddingReq(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                slot.slot_type === 'WEEKLY' ? 'bg-purple-100 text-purple-700' : slot.slot_type === 'BIWEEKLY' ? 'bg-cyan-100 text-cyan-700' : slot.slot_type === 'QUARTERLY' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {slot.slot_type === 'WEEKLY' ? 'Preventivo Semanal' : slot.slot_type === 'BIWEEKLY' ? 'Preventivo Quincenal' : slot.slot_type === 'QUARTERLY' ? 'Preventivo Cuatrimestral' : 'Preventivo Programado (PP)'}
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
                  <h4 className="text-base font-bold text-gray-900">4 Evidencias Obligatorias (Foto o Video)</h4>
                  <p className="text-xs text-gray-500">
                    Todas son obligatorias. Videos: máximo 15 segundos.
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
                            {currentUrl.match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i) ? (
                              <video
                                src={getImageSrc(currentUrl)}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={getImageSrc(currentUrl)}
                                alt={ph.label}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <label className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors flex items-center gap-1">
                              <i className="fas fa-sync-alt" /> Cambiar
                              <input
                                type="file"
                                accept="image/*,video/*"
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
                                <span className="text-xs font-bold text-indigo-700">Tomar Foto / Video o Seleccionar Archivo</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">Videos: máximo 15 segundos</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*,video/*"
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

          {/* STEP 3: PARTS (OT autogenerada lazy) */}
          {step === 3 && !isCompleted && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900">Repuestos Utilizados (Opcional)</h4>
                  <p className="text-xs text-gray-500">
                    Si usó repuestos, regístrelos aquí: se descuentan del inventario y generan una OT (MTO) automáticamente.
                  </p>
                </div>
                {woInfo?.work_order_id && (
                  <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    OT {woInfo.work_order_id}
                  </span>
                )}
              </div>

              {/* Agregar repuesto */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedInventoryId}
                    onChange={(e) => setSelectedInventoryId(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">— Seleccione un repuesto del inventario —</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                        {item.name} (stock: {item.quantity})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={partQty}
                    onChange={(e) => setPartQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full sm:w-24 px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Cant."
                  />
                  <button
                    type="button"
                    onClick={handleAddPart}
                    disabled={addingPart || !selectedInventoryId}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                  >
                    {addingPart ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus mr-1" />Agregar</>}
                  </button>
                </div>
              </div>

              {/* Lista de repuestos */}
              {(woInfo?.parts || []).length > 0 ? (
                <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                  {woInfo.parts.map(part => (
                    <div key={part.id} className="flex items-center justify-between px-4 py-3 bg-white">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{part.inventory?.name || `Repuesto #${part.inventory_id}`}</p>
                        <p className="text-xs text-gray-500">Cantidad usada: <span className="font-semibold">{part.quantity_used}</span></p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(part.id)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <i className="fas fa-trash-alt mr-1" />Quitar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
                  <i className="fas fa-box-open text-2xl mb-2" />
                  <p>No se usaron repuestos en este mantenimiento. Puede continuar sin registrar ninguno.</p>
                </div>
              )}

              {/* Requisiciones manuales (repuestos solicitados sin stock) */}
              <div className="pt-2">
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Requisiciones de Repuestos
                </h5>
                {requisitions.length > 0 && (
                  <div className="border border-amber-200 rounded-2xl divide-y divide-amber-100 overflow-hidden mb-3">
                    {requisitions.map(rq => (
                      <div key={rq.id} className="flex items-center justify-between px-4 py-3 bg-amber-50">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{rq.part_reference}</p>
                          <p className="text-xs text-gray-500">
                            Cantidad: <span className="font-semibold">{rq.quantity}</span>
                            {rq.notes ? ` — ${rq.notes}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-700">
                          Requerido
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Repuesto / Referencia</label>
                    <input
                      type="text"
                      value={reqPartRef}
                      onChange={(e) => setReqPartRef(e.target.value)}
                      placeholder="Ej: Filtro A-123"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      value={reqQty}
                      onChange={(e) => setReqQty(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Notas (opcional)</label>
                    <input
                      type="text"
                      value={reqNotes}
                      onChange={(e) => setReqNotes(e.target.value)}
                      placeholder="Detalle / observación"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRequisition}
                    disabled={addingReq || !reqPartRef.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    <i className={`fas ${addingReq ? 'fa-spinner fa-spin' : 'fa-plus'} mr-1`} />
                    Requerir
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                >
                  ← Volver a Descripción
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                >
                  Revisar y Finalizar →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & FINALIZE (OR VIEW COMPLETED) */}
          {step === 4 && (
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
                        evidences[ph.key].match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i) ? (
                          <video
                            src={getImageSrc(evidences[ph.key])}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getImageSrc(evidences[ph.key])}
                            alt={ph.label}
                            className="w-full h-full object-cover"
                          />
                        )
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

              {/* Parts summary */}
              <div>
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Repuestos Utilizados {woInfo?.work_order_id ? `(OT ${woInfo.work_order_id})` : ''}
                </h5>
                {(woInfo?.parts || []).length > 0 ? (
                  <ul className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 space-y-1">
                    {woInfo.parts.map(part => (
                      <li key={part.id} className="flex justify-between font-medium">
                        <span>{part.inventory?.name || `Repuesto #${part.inventory_id}`}</span>
                        <span className="font-bold">× {part.quantity_used}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 italic">
                    No se registraron repuestos.
                  </p>
                )}
              </div>

              {/* Final Actions */}
              {!isCompleted ? (
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                  >
                    ← Modificar Descripción/Repuestos
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

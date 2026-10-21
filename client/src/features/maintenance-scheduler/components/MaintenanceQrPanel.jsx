'use client';

import React, { useState, useEffect } from 'react';
import { maintenanceApi } from '../utils/maintenanceSchedulerApi';
import Swal from 'sweetalert2';

export default function MaintenanceQrPanel({ premiseId = 1 }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const fetchQrs = async () => {
    setLoading(true);
    try {
      const data = await maintenanceApi.getMachineQrs(premiseId);
      setMachines(data || []);
    } catch (err) {
      console.error('Error fetching QRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrs();
  }, [premiseId]);

  const handleGenerateAll = async () => {
    const result = await Swal.fire({
      title: '¿Generar todos los QR faltantes?',
      text: 'Se crearán códigos QR para todas las máquinas que aún no dispongan de uno.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });

    if (!result.isConfirmed) return;

    setGenerating(true);
    try {
      const res = await maintenanceApi.generateAllQrs(premiseId);
      await fetchQrs();
      Swal.fire({
        icon: 'success',
        title: 'QRs generados con éxito',
        text: `Se crearon ${res.generated} nuevos códigos QR para esta sede.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error generando QRs',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintAll = () => {
    const win = window.open('', '_blank');
    const qrs = machines.filter(m => m.dataUrl);
    
    win.document.write(`
      <html>
        <head>
          <title>QRs Mantenimiento - Todos</title>
          <style>
            @page { margin: 5mm; }
            body { font-family: sans-serif; margin: 0; padding: 0; }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 10px; 
              padding: 5mm;
            }
            .badge { 
              border: 2px solid #1e293b; 
              border-radius: 12px; 
              padding: 15px; 
              text-align: center; 
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
            }
            h2 { margin: 0 0 2px 0; font-size: 14px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
            p { margin: 0 0 8px 0; font-size: 11px; color: #64748b; font-weight: bold; }
            img { width: 150px; height: 150px; }
            .code { font-family: monospace; font-size: 12px; font-weight: bold; color: #0f172a; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 8px; }
            .footer { margin-top: 8px; font-size: 9px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${qrs.map(item => `
              <div class="badge">
                <h2>${item.name}</h2>
                <p>${item.family}</p>
                <img src="${item.dataUrl}" alt="QR" />
                <div class="code">${item.qr_code}</div>
                <div class="footer">Alist Andino • Mantenimiento</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            <i className="fas fa-qrcode mr-2 text-indigo-600" />
            Códigos QR de Mantenimiento por Máquina
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            QRs exclusivos para validación de preventivos semanal y programado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrintAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <i className="fas fa-file-pdf" /> Descargar Todos PDF
          </button>
          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <i className={`fas ${generating ? 'fa-spinner fa-spin' : 'fa-magic'}`} />
            Generar Faltantes en Masa
          </button>
        </div>
      </div>

      {/* Grid of machine QR badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <i className="fas fa-spinner fa-spin text-2xl mb-2 block" />
            Cargando códigos QR...
          </div>
        ) : machines.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            No se encontraron máquinas en esta sede.
          </div>
        ) : (
          machines.map(m => (
            <div
              key={m.ins_id}
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between items-center text-center hover:border-indigo-300 transition-all"
            >
              <div className="w-full mb-3">
                <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                  #{m.ins_id} • {m.family}
                </span>
                <h4 className="font-bold text-gray-900 text-sm mt-1.5 truncate" title={m.name}>
                  {m.name}
                </h4>
              </div>

              {m.dataUrl ? (
                <div className="bg-slate-50 p-2 rounded-xl border border-gray-100 my-2">
                  <img
                    src={m.dataUrl}
                    alt={m.qr_code}
                    className="w-32 h-32 object-contain mx-auto"
                  />
                  <p className="text-[10px] font-mono font-bold text-gray-600 mt-1">
                    {m.qr_code}
                  </p>
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-100 rounded-xl flex flex-col items-center justify-center my-2 text-gray-400 text-xs">
                  <i className="fas fa-qrcode text-3xl mb-1 opacity-50" />
                  <span>Sin código</span>
                </div>
              )}

              <div className="w-full mt-3 pt-2 border-t border-gray-100 flex items-center justify-center gap-2">
                {m.dataUrl && (
                  <button
                    type="button"
                    onClick={() => handlePrintBadge(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1.5"
                  >
                    <i className="fas fa-print" /> Imprimir Sticker
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

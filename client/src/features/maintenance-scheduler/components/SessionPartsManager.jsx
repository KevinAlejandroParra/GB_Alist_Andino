'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { maintenanceApi } from '../utils/maintenanceSchedulerApi';
import InventorySearchModal from '../../../components/checklist/InventorySearchModal';
import CreateRequisitionModal from '../../../components/checklist/requisitions/CreateRequisitionModal';

/**
 * Gestor de repuestos de una sesión de mantenimiento preventivo.
 *
 * Reutiliza el buscador real de inventario (InventorySearchModal) y los
 * endpoints de sesión, que crean la OT (MTO) de forma perezosa solo cuando
 * se agrega el primer repuesto (y descuentan stock automáticamente).
 *
 * Se integra dentro de la vista de evidencias del wizard, por lo que está
 * disponible aunque el técnico aún no haya subido fotos.
 */
export default function SessionPartsManager({ sessionId, onChange }) {
  const [parts, setParts] = useState([]);
  const [workOrderId, setWorkOrderId] = useState(null); // ID numérico (PK)
  const [workOrderCode, setWorkOrderCode] = useState(null); // Código STRING (MTO-...)
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [addingPart, setAddingPart] = useState(false);

  // Requisiciones (usando el modal estándar)
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [requisitionPartInfo, setRequisitionPartInfo] = useState(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [partsData, reqs] = await Promise.all([
        maintenanceApi.getSessionParts(sessionId),
        maintenanceApi.getSessionRequisitions(sessionId)
      ]);
      setParts(partsData?.parts || []);
      setWorkOrderId(partsData?.id || null);
      setWorkOrderCode(partsData?.work_order_id || null);
      setRequisitions(reqs || []);
    } catch (err) {
      console.error('Error cargando repuestos de la sesión:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Mantener informado al wizard (resumen final y PDF)
  useEffect(() => {
    if (onChange) onChange({ workOrderId, workOrderCode, parts, requisitions });
  }, [workOrderId, workOrderCode, parts, requisitions, onChange]);

  const totalUnits = parts.reduce((sum, p) => sum + (p.quantity_used || 0), 0);

  const handlePartSelected = async (selected) => {
    setShowSearch(false);
    const inventoryId = selected?.inventoryId || selected?.partData?.id;
    if (!inventoryId) return;

    const partName =
      selected?.partData?.part_name ||
      selected?.partData?.partName ||
      selected?.partData?.item_name ||
      `Repuesto #${inventoryId}`;

    const { value } = await Swal.fire({
      title: 'Cantidad a utilizar',
      text: partName,
      input: 'number',
      inputValue: 1,
      inputAttributes: { min: 1, step: 1 },
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      inputValidator: (v) => (!v || Number(v) < 1 ? 'Ingrese una cantidad válida' : null)
    });
    if (!value) return;

    setAddingPart(true);
    try {
      const result = await maintenanceApi.addSessionPart(sessionId, Number(inventoryId), Number(value));
      await load();
      Swal.fire({
        icon: 'success',
        title: 'Repuesto agregado',
        text: `Stock restante: ${result?.remaining_stock ?? '—'}`,
        timer: 1600,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al agregar repuesto',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    } finally {
      setAddingPart(false);
    }
  };

  const handleRemovePart = async (part) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Quitar repuesto?',
      text: 'Se devolverá la cantidad al inventario.',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });
    if (!confirm.isConfirmed) return;

    try {
      await maintenanceApi.removeSessionPart(sessionId, part.id);
      await load();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al quitar repuesto',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleAddRequisition = () => {
    setRequisitionPartInfo(null);
    setShowRequisitionModal(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-boxes text-indigo-500" />
            Repuestos Utilizados (Opcional)
          </h5>
          <p className="text-xs text-gray-500">
            Disponible en cualquier momento. Al usar repuestos se descuentan del inventario y se genera la OT.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {workOrderCode && (
            <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              OT {workOrderCode}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            disabled={addingPart}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
          >
            {addingPart ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-plus" />}
            Agregar Repuesto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-400 text-sm">
          <i className="fas fa-spinner fa-spin mr-1" /> Cargando repuestos…
        </div>
      ) : parts.length > 0 ? (
        <>
          <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {parts.map((part) => (
              <div key={part.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {part.inventory?.part_name || `Repuesto #${part.inventory_id}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Cantidad usada: <span className="font-semibold">{part.quantity_used}</span>
                    {part.inventory?.location ? ` · ${part.inventory.location}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePart(part)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <i className="fas fa-trash-alt mr-1" />Quitar
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-right">
            Total unidades: <span className="font-bold text-gray-700">{totalUnits}</span>
          </p>
        </>
      ) : (
        <div className="text-center py-5 text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
          <i className="fas fa-box-open text-2xl mb-1 block" />
          No se usaron repuestos en este mantenimiento. Puede continuar sin registrar ninguno.
        </div>
      )}

      {/* Requisiciones */}
      <div className="pt-1">
        <div className="flex items-center justify-between">
          <h6 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Requisiciones de Repuestos
          </h6>
          <button
            type="button"
            onClick={handleAddRequisition}
            className="text-xs font-bold text-amber-600 hover:text-amber-800"
          >
            <i className="fas fa-plus mr-1" />
            Solicitar repuesto sin stock
          </button>
        </div>

        {requisitions.length > 0 && (
          <div className="border border-amber-200 rounded-2xl divide-y divide-amber-100 overflow-hidden mt-2">
            {requisitions.map((rq) => (
              <div key={rq.id} className="flex items-center justify-between px-4 py-3 bg-amber-50">
                <div className="flex items-center gap-3">
                  {rq.image_url && (
                    <img 
                      src={rq.image_url} 
                      alt={rq.part_reference} 
                      className="w-10 h-10 object-cover rounded border border-amber-200" 
                    />
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-800">{rq.part_reference}</p>
                    <p className="text-xs text-gray-500">
                      Cantidad: <span className="font-semibold">{rq.quantity_requested}</span>
                      {rq.notes ? ` — ${rq.notes}` : ''}
                      {rq.urgency_level && ` · ${rq.urgency_level}`}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-700">
                  {rq.status || 'Solicitado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buscador real de inventario */}
      <InventorySearchModal
        show={showSearch}
        onClose={() => setShowSearch(false)}
        onPartSelected={handlePartSelected}
        onPartNotFound={() => {
          setShowSearch(false);
          setRequisitionPartInfo(null);
          setShowRequisitionModal(true);
        }}
        allowMultiple={false}
        selectedParts={[]}
        workOrderId={workOrderId}
      />

      {/* Modal de creación de requisición estándar */}
      <CreateRequisitionModal
        show={showRequisitionModal}
        onClose={() => setShowRequisitionModal(false)}
        onSuccess={() => {
          setShowRequisitionModal(false);
          load(); // Recargar para ver la nueva requisición
        }}
        workOrderId={workOrderId}
        partInfo={requisitionPartInfo}
      />
    </div>
  );
}

'use strict';
const { WorkOrder, Inventory, WorkOrderPart, MaintenanceSession, MaintenanceScheduleSlot, Inspectable } = require('../models');

/**
 * Etapa 3 — OT autogenerada para sesiones de mantenimiento (lazy creation).
 *
 * Opción A:
 * - NO se crea OT al iniciar la sesión.
 * - La OT se crea SOLO cuando el técnico agrega el primer repuesto en el wizard.
 * - Al completar la sesión, la OT (si existe) se cierra.
 */
class MaintenanceWorkOrderService {
    /**
     * Genera el ID de la OT de mantenimiento (prefijo MTO para distinguirlas de las de fallas).
     */
    generateMaintenanceWorkOrderId() {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        const rand = Math.floor(Math.random() * 900 + 100);
        return `MTO-${year}-${timestamp}${rand}`;
    }

    /**
     * Obtiene (o crea perezosamente) la OT asociada a una sesión de mantenimiento.
     * Se llama cuando el técnico agrega el primer repuesto desde el wizard.
     * @param {number} sessionId - ID de la MaintenanceSession
     * @param {number} technicianId - ID del usuario (quedará como resolved_by_id)
     * @returns {Promise<WorkOrder>}
     */
    async getOrCreateForSession(sessionId, technicianId) {
        // 1) ¿Ya existe la OT para esta sesión?
        const existing = await WorkOrder.findOne({ where: { maintenance_session_id: sessionId } });
        if (existing) return existing;

        // 2) Validar que la sesión existe
        const session = await MaintenanceSession.findByPk(sessionId, {
            include: [
                { model: MaintenanceScheduleSlot, as: 'slot', include: [{ model: Inspectable, as: 'inspectable' }] },
                { model: Inspectable, as: 'inspectable' }
            ]
        });
        if (!session) throw new Error(`Sesión de mantenimiento ${sessionId} no encontrada`);

        const machineName = session.inspectable?.name || session.slot?.inspectable?.name || `Máquina #${session.ins_id}`;
        const typeLabel = session.type === 'BIWEEKLY' ? 'Preventivo Quincenal'
            : session.type === 'QUARTERLY' ? 'Preventivo Cuatrimestral'
                : session.type === 'WEEKLY' ? 'Preventivo Semanal'
                    : 'Preventivo Programado';

        // 3) Crear la OT (lazy)
        const workOrder = await WorkOrder.create({
            work_order_id: this.generateMaintenanceWorkOrderId(),
            status: 'EN_PROCESO',
            requiere_replacement: false,
            activity_performed: `${typeLabel} — ${machineName} (autogenerada por sesión de mantenimiento)`,
            failure_order_id: null,
            maintenance_session_id: sessionId,
            resolved_by_id: technicianId || null,
            start_time: new Date()
        });

        console.log(`✅ OT de mantenimiento creada: ${workOrder.work_order_id} (sesión #${sessionId})`);
        return workOrder;
    }

    /**
     * Agrega un repuesto a la OT de la sesión (creándola si no existe) y descuenta stock.
     * @param {number} sessionId
     * @param {number} inventoryId
     * @param {number} quantity
     * @param {number} technicianId
     */
    async addPartToSession(sessionId, inventoryId, quantity, technicianId) {
        const qty = Number(quantity) || 1;
        if (qty < 1) throw new Error('La cantidad debe ser al menos 1');

        const workOrder = await this.getOrCreateForSession(sessionId, technicianId);

        const inventoryItem = await Inventory.findByPk(inventoryId);
        if (!inventoryItem) throw new Error(`Repuesto con ID ${inventoryId} no encontrado en inventario`);

        const existingPart = await WorkOrderPart.findOne({
            where: { work_order_id: workOrder.id, inventory_id: inventoryId }
        });

        if (existingPart) {
            const newQuantity = existingPart.quantity_used + qty;
            if (inventoryItem.quantity < qty) {
                throw new Error(`Stock insuficiente. Disponible: ${inventoryItem.quantity}`);
            }
            existingPart.quantity_used = newQuantity;
            await existingPart.save();
            await inventoryItem.update({ quantity: inventoryItem.quantity - qty });
        } else {
            if (inventoryItem.quantity < qty) {
                throw new Error(`Stock insuficiente. Disponible: ${inventoryItem.quantity}, Solicitado: ${qty}`);
            }
            await WorkOrderPart.create({
                work_order_id: workOrder.id,
                inventory_id: inventoryId,
                quantity_used: qty
            });
            await inventoryItem.update({ quantity: inventoryItem.quantity - qty });
        }

        await workOrder.update({ requiere_replacement: true });

        // Requisición automática si el stock quedó en 0 o menos
        if (inventoryItem.quantity <= 0) {
            await this.createRequisitionIfNeeded(workOrder, inventoryItem, technicianId);
        }

        return {
            work_order_id: workOrder.work_order_id,
            part: existingPart || await WorkOrderPart.findOne({
                where: { work_order_id: workOrder.id, inventory_id: inventoryId }
            }),
            remaining_stock: inventoryItem.quantity
        };
    }

    /**
     * Quita un repuesto de la OT de la sesión y devuelve el stock.
     */
    async removePartFromSession(sessionId, workOrderPartId, technicianId) {
        const workOrder = await WorkOrder.findOne({ where: { maintenance_session_id: sessionId } });
        if (!workOrder) throw new Error('La sesión no tiene una OT asociada todavía');

        const part = await WorkOrderPart.findOne({
            where: { id: workOrderPartId, work_order_id: workOrder.id }
        });
        if (!part) throw new Error('Repuesto no encontrado en la OT de esta sesión');

        const inventoryItem = await Inventory.findByPk(part.inventory_id);
        if (inventoryItem) {
            await inventoryItem.update({ quantity: inventoryItem.quantity + part.quantity_used });
        }

        await part.destroy();

        const remaining = await WorkOrderPart.count({ where: { work_order_id: workOrder.id } });
        if (remaining === 0) {
            await workOrder.update({ requiere_replacement: false });
        }

        return { removed: true, remaining_parts: remaining };
    }

    /**
     * Lista los repuestos de la OT de la sesión (para el wizard).
     */
    async listPartsForSession(sessionId) {
        const workOrder = await WorkOrder.findOne({ where: { maintenance_session_id: sessionId } });
        if (!workOrder) return { id: null, work_order_id: null, parts: [] };

        const parts = await WorkOrderPart.findAll({
            where: { work_order_id: workOrder.id },
            include: [{ model: Inventory, as: 'inventory' }]
        });

        return { 
            id: workOrder.id, 
            work_order_id: workOrder.work_order_id, 
            parts 
        };
    }

    /**
     * Crea una requisición vinculada a la sesión cuando no hay stock.
     */
    async createRequisitionIfNeeded(workOrder, inventoryItem, technicianId) {
        try {
            const { Requisition } = require('../models');
            const existing = await Requisition.findOne({
                where: {
                    work_order_id: workOrder.id,
                    part_reference: inventoryItem.part_name,
                    status: ['SOLICITADO', 'PENDIENTE']
                }
            });
            if (existing) return existing;

            return await Requisition.create({
                work_order_id: workOrder.id,
                maintenance_session_id: workOrder.maintenance_session_id,
                part_reference: inventoryItem.part_name,
                quantity_requested: 1,
                status: 'SOLICITADO',
                requested_by_id: technicianId,
                notes: `Reposición automática: stock agotado de "${inventoryItem.part_name}" durante mantenimiento preventivo`
            });
        } catch (err) {
            console.error('⚠️ No se pudo crear la requisición automática:', err.message);
            return null;
        }
    }

    /**
     * Crea una requisición manual (pedida por el técnico desde el wizard),
     * ligada a la sesión de mantenimiento. Solo requiere sesión; la OT es opcional.
     */
    async createManualRequisition(sessionId, { partReference, quantity, notes }, technicianId) {
        const partRef = (partReference || '').trim();
        if (!partRef) throw new Error('El nombre del repuesto es requerido');
        const qty = Number(quantity) || 1;
        if (qty < 1) throw new Error('La cantidad debe ser al menos 1');

        const session = await MaintenanceSession.findByPk(sessionId);
        if (!session) throw new Error(`Sesión de mantenimiento ${sessionId} no encontrada`);

        const { Requisition } = require('../models');

        // Evitar duplicados: mismo repuesto pendiente en la misma sesión
        const existing = await Requisition.findOne({
            where: {
                maintenance_session_id: sessionId,
                part_reference: partRef,
                status: ['SOLICITADO', 'PENDIENTE']
            }
        });
        if (existing) throw new Error(`Ya existe una requisición pendiente de "${partRef}" en esta sesión`);

        // La OT solo se crea si la sesión ya la tiene (no se fuerza aquí)
        const workOrder = await WorkOrder.findOne({ where: { maintenance_session_id: sessionId } });

        return await Requisition.create({
            work_order_id: workOrder ? workOrder.id : null,
            maintenance_session_id: sessionId,
            part_reference: partRef,
            quantity_requested: qty,
            status: 'SOLICITADO',
            requested_by_id: technicianId,
            notes: notes || `Repuesto solicitado manualmente durante mantenimiento preventivo`
        });
    }

    /**
     * Lista las requisiciones ligadas a una sesión (para el wizard).
     */
    async listRequisitionsForSession(sessionId) {
        const { Requisition } = require('../models');
        return await Requisition.findAll({
            where: { maintenance_session_id: sessionId },
            order: [['createdAt', 'DESC']]
        });
    }

    /**
     * Cierra la OT de la sesión al completar el mantenimiento.
     * @returns {Promise<WorkOrder|null>} la OT cerrada, o null si la sesión no tenía OT (no usó repuestos)
     */
    async closeForSession(sessionId, activityPerformed) {
        const workOrder = await WorkOrder.findOne({ where: { maintenance_session_id: sessionId } });
        if (!workOrder) return null; // La sesión no usó repuestos → no hay OT que cerrar

        if (workOrder.status === 'EN_PROCESO' || workOrder.status === 'PAUSADO') {
            await workOrder.update({
                status: 'RESUELTA',
                end_time: new Date(),
                activity_performed: activityPerformed || workOrder.activity_performed
            });
            console.log(`✅ OT ${workOrder.work_order_id} cerrada al completar la sesión`);
        }
        return workOrder;
    }
}

module.exports = new MaintenanceWorkOrderService();

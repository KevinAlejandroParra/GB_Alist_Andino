/**
 * MaintenanceFailureClosureService
 * Fase 2 — Correctivos el mismo día (Regla 6B del plan cronograma_mantenimiento).
 *
 * Reglas:
 * - El técnico registra cierres de falla (AR/OT resueltas) vinculados al día laboral.
 * - El día sube a VERDE solo si: TODOS los slots preventivos del día están AZUL
 *   Y existe al menos un cierre de falla el mismo día en una máquina DISTINTA de
 *   cualquier ins_id con slot preventivo planificado ese día.
 * - Cerrar fallas de una máquina que ya tenía preventivo ese día NO sube a verde
 *   (es lo esperado en esa visita).
 */

const {
    MaintenanceDayFailureClosure,
    MaintenanceSchedulePlan,
    MaintenanceScheduleSlot,
    FailureOrder,
    RepairExecution,
    Inspectable,
    User
} = require("../models");
const { Op } = require("sequelize");

// Estados de AR que cuentan como "falla cerrada" (consistente con FailureBookService / ScheduleService)
const RESOLVED_STATUSES = ['RESUELTA', 'APROBADA', 'COMPLETADA'];

class MaintenanceFailureClosureService {

    /**
     * Listar fallas activas (no resueltas) de una fecha, filtradas opcionalmente por máquina.
     * Used por el drawer del día para seleccionar qué falla se cerró ese día.
     */
    async getActiveFailuresForDay(dateStr, insId = null) {
        const where = {};
        if (insId) where.affected_id = insId;

        const failures = await FailureOrder.findAll({
            where,
            include: [
                { model: RepairExecution, as: 'repairExecution', required: false },
                {
                    model: Inspectable,
                    as: 'affectedInspectable',
                    required: false,
                    attributes: ['id', 'name']
                },
                { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 200
        });

        const dayStart = new Date(`${dateStr}T00:00:00`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999`);

        return failures
            .filter(f => {
                const isResolved = f.repairExecution && RESOLVED_STATUSES.includes(f.repairExecution.status);
                if (isResolved) return false; // ya resuelta → no es "activa"
                // Activas en el día: reportadas ese día O con reparación aún abierta iniciada ese día
                const reportedThatDay = f.createdAt && new Date(f.createdAt) >= dayStart && new Date(f.createdAt) <= dayEnd;
                const repairOpenThatDay = f.repairExecution && f.repairExecution.createdAt &&
                    new Date(f.repairExecution.createdAt) >= dayStart && new Date(f.repairExecution.createdAt) <= dayEnd;
                return reportedThatDay || repairOpenThatDay;
            })
            .map(f => ({
                id: f.id,
                failure_order_id: f.failure_order_id,
                description: f.description,
                severity: f.severity,
                type_maintenance: f.type_maintenance,
                affected_ins_id: f.affected_id,
                affected_name: f.affectedInspectable?.name || `Máquina #${f.affected_id}`,
                status: f.repairExecution?.status || 'SIN_AR',
                reported_by: f.reporter?.user_name || null,
                reported_at: f.createdAt,
                repair_execution: f.repairExecution ? {
                    id: f.repairExecution.id,
                    repair_execution_id: f.repairExecution.repair_execution_id,
                    status: f.repairExecution.status,
                    start_time: f.repairExecution.start_time,
                    end_time: f.repairExecution.end_time
                } : null
            }));
    }

    /**
     * Registrar un cierre de falla vinculado al día del técnico.
     * Valida:
     *  - La falla existe.
     *  - La falla está efectivamente resuelta (AR en estado resuelto / aprobada / completada).
     *  - No duplicar el mismo cierre (misma falla + mismo día + mismo técnico).
     */
    async linkFailureClosure(dateStr, technicianId, failureOrderId, userId) {
        if (!dateStr || !failureOrderId) {
            throw new Error("date y failureOrderId son obligatorios");
        }

        const failure = await FailureOrder.findByPk(failureOrderId, {
            include: [{ model: RepairExecution, as: 'repairExecution', required: false }]
        });
        if (!failure) throw new Error("Orden de falla no encontrada");

        const isResolved = failure.repairExecution && RESOLVED_STATUSES.includes(failure.repairExecution.status);
        if (!isResolved) {
            throw new Error("La falla aún no está resuelta (AR no está en estado RESUELTA/APROBADA/COMPLETADA). No se puede vincular como cierre.");
        }

        // Evitar duplicados (misma falla + mismo día)
        const existing = await MaintenanceDayFailureClosure.findOne({
            where: {
                closure_date: dateStr,
                failure_order_id: failureOrderId
            }
        });
        if (existing) {
            throw new Error("Este cierre de falla ya fue registrado para esa fecha.");
        }

        return await MaintenanceDayFailureClosure.create({
            closure_date: dateStr,
            technician_id: technicianId || userId,
            failure_order_id: failureOrderId,
            affected_ins_id: failure.affected_id
        });
    }

    /**
     * Eliminar (desvincular) un cierre del día.
     */
    async unlinkFailureClosure(closureId) {
        const closure = await MaintenanceDayFailureClosure.findByPk(closureId);
        if (!closure) throw new Error("Registro de cierre no encontrado");
        await closure.destroy();
        return { ok: true };
    }

    /**
     * Cierres registrados para una fecha.
     */
    async getClosuresForDate(dateStr) {
        return await MaintenanceDayFailureClosure.findAll({
            where: { closure_date: dateStr },
            include: [
                {
                    model: FailureOrder,
                    as: 'failureOrder',
                    include: [{ model: RepairExecution, as: 'repairExecution', required: false }]
                },
                {
                    model: Inspectable,
                    as: 'inspectable',
                    required: false,
                    attributes: ['id', 'name']
                },
                { model: User, as: 'technician', attributes: ['user_id', 'user_name'] }
            ],
            order: [['createdAt', 'ASC']]
        });
    }

    /**
     * Calcula el estado VERDE por día para un plan completo (Regla 6B).
     * Devuelve un mapa { [dateStr]: true } solo donde aplica la bonificación.
     *
     * Verde = día AZUL (todos los slots completados)
     *         + al menos un cierre de falla ese día en máquina DISTINTA de las
     *           planificadas (WEEKLY/BIWEEKLY/QUARTERLY/SCHEDULED) ese día.
     */
    async getGreenBonusDays(planId, slotsByDate) {
        const greenDays = {};

        // 1. Determinar días AZUL (todos los slots completados) con sesiones registradas
        const blueDays = [];
        for (const [dateStr, daySlots] of Object.entries(slotsByDate)) {
            if (daySlots.length > 0 && daySlots.every(s => s.slot_display_status === 'AZUL')) {
                blueDays.push(dateStr);
            }
        }
        if (blueDays.length === 0) return greenDays;

        // 2. Cierres registrados en esos días
        const closures = await MaintenanceDayFailureClosure.findAll({
            where: { closure_date: { [Op.in]: blueDays } },
            attributes: ['id', 'closure_date', 'affected_ins_id', 'technician_id']
        });
        if (closures.length === 0) return greenDays;

        // 3. Máquinas con slot preventivo por día
        const plannedInsByDate = {};
        for (const [dateStr, daySlots] of Object.entries(slotsByDate)) {
            plannedInsByDate[dateStr] = new Set(daySlots.map(s => s.ins_id));
        }

        // 4. Aplicar regla: al menos un cierre en máquina DISTINTA de las planificadas ese día
        for (const closure of closures) {
            const dateStr = closure.closure_date; // DATEONLY → 'YYYY-MM-DD'
            const planned = plannedInsByDate[dateStr];
            if (!planned || planned.size === 0) continue; // día sin slots → sin bonificación
            if (closure.affected_ins_id && planned.has(closure.affected_ins_id)) continue; // misma máquina → no sube

            greenDays[dateStr] = true;
            break; // basta un cierre válido para ese día
        }

        return greenDays;
    }
}

module.exports = new MaintenanceFailureClosureService();

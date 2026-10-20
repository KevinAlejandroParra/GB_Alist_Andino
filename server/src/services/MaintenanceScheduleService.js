const { 
    MaintenanceSchedulePlan, 
    MaintenanceScheduleSlot, 
    MaintenanceSession,
    MaintenanceSessionEvidence,
    MaintenanceMachineConfig, 
    MaintenanceSetting, 
    Inspectable,
    Device,
    Family,
    User,
    FailureOrder,
    RepairExecution
} = require("../models");
const MaintenanceConfigService = require("./MaintenanceConfigService");
const MaintenanceFailureClosureService = require("./MaintenanceFailureClosureService");
const { Op, Sequelize } = require("sequelize");

class MaintenanceScheduleService {
    /**
     * Helper to get active failure counts grouped by affected_id (inspectable)
     */
    async getActiveFailureCounts(insIds) {
        if (!insIds || insIds.length === 0) return {};

        const failures = await FailureOrder.findAll({
            where: {
                affected_id: { [Op.in]: insIds }
            },
            include: [
                {
                    model: RepairExecution,
                    as: 'repairExecution',
                    required: false
                }
            ]
        });

        const counts = {};
        for (const f of failures) {
            // Unresolved if no repairExecution or execution is not approved/resolved
            const isResolved = f.repairExecution && ['APROBADA', 'COMPLETADA', 'RESUELTA'].includes(f.repairExecution.status);
            if (!isResolved) {
                counts[f.affected_id] = (counts[f.affected_id] || 0) + 1;
            }
        }
        return counts;
    }

    /**
     * Generate or regenerate monthly maintenance plan
     */
    async generatePlan(premiseId, yearMonth) {
        const pId = Number(premiseId) || 1;
        const settings = await MaintenanceConfigService.getSettings(pId);

        // Validate yearMonth format YYYY-MM
        const [yearStr, monthStr] = (yearMonth || '').split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (!year || !month || month < 1 || month > 12) {
            throw new Error(`Formato de mes inválido: '${yearMonth}'. Debe ser YYYY-MM`);
        }

        // Check if plan already exists
        let plan = await MaintenanceSchedulePlan.findOne({
            where: {
                premise_id: pId,
                year_month: yearMonth
            }
        });

        let preservedOverrides = [];
        if (plan) {
            if (plan.status === 'PUBLISHED') {
                throw new Error("El plan para este mes ya está publicado. No se puede regenerar directamente.");
            }

            // Fetch existing overridden slots to preserve them (Regla 8)
            preservedOverrides = await MaintenanceScheduleSlot.findAll({
                where: {
                    plan_id: plan.id,
                    is_manual_override: true
                }
            });

            // Delete non-overridden slots
            await MaintenanceScheduleSlot.destroy({
                where: {
                    plan_id: plan.id,
                    is_manual_override: false
                }
            });

            await plan.update({ generated_at: new Date() });
        } else {
            plan = await MaintenanceSchedulePlan.create({
                premise_id: pId,
                year_month: yearMonth,
                status: 'DRAFT',
                generated_at: new Date()
            });
        }

        // Fetch machine configs for this premise
        const allConfigs = await MaintenanceConfigService.getAllMachineConfigs(pId);
        const activeConfigs = allConfigs.filter(c => c.is_active);

        // Days in month calculation
        const daysInMonth = new Date(year, month, 0).getDate();
        const workingDays = (settings.working_days || '1,2,3,4,5')
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n));

        const maxPerDay = Number(settings.max_scheduled_per_day) || 5;
        const strategy = settings.strategy || 'HYBRID';
        const hybridWeights = settings.hybrid_weights || { failure_count: 0.6, days_since_last: 0.4 };

        const newSlots = [];

        // Track occupied machine per date to avoid same machine twice on same day
        const occupiedDatesByMachine = new Set();
        preservedOverrides.forEach(slot => {
            occupiedDatesByMachine.add(`${slot.ins_id}_${slot.scheduled_date}`);
        });

        // 1. GENERATE WEEKLY SLOTS
        const weeklyConfigs = activeConfigs.filter(c => c.weekly_enabled);
        weeklyConfigs.forEach(cfg => {
            const targetWeekday = cfg.weekly_weekday !== undefined && cfg.weekly_weekday !== null ? cfg.weekly_weekday : 1;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(year, month - 1, day);
                const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
                const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

                if (dayOfWeek === targetWeekday && workingDays.includes(dayOfWeek)) {
                    const key = `${cfg.ins_id}_${dateStr}`;
                    if (!occupiedDatesByMachine.has(key)) {
                        newSlots.push({
                            plan_id: plan.id,
                            scheduled_date: dateStr,
                            ins_id: cfg.ins_id,
                            slot_type: 'WEEKLY',
                            assigned_user_id: cfg.assigned_technician_id || null,
                            sort_priority: 0,
                            is_manual_override: false
                        });
                        occupiedDatesByMachine.add(key);
                    }
                }
            }
        });

        // 1b. GENERATE BIWEEKLY SLOTS (1ª+3ª / 2ª+4ª semana del mes)
        const biweeklyConfigs = activeConfigs.filter(c => c.biweekly_enabled);
        biweeklyConfigs.forEach(cfg => {
            const targetWeekday = cfg.biweekly_weekday !== undefined && cfg.biweekly_weekday !== null ? cfg.biweekly_weekday : 1;
            const pattern = cfg.biweekly_pattern === 'SECOND_FOURTH' ? 'SECOND_FOURTH' : 'FIRST_THIRD';
            const targetWeekNumbers = pattern === 'FIRST_THIRD' ? [1, 3] : [2, 4];

            let weekNumber = 0;
            let lastSeenDay = null;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(year, month - 1, day);
                const dayOfWeek = dateObj.getDay();
                const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

                // Avanza la numeración de semanas al pasar de una ocurrencia del weekday al día siguiente
                if (dayOfWeek === targetWeekday) {
                    if (lastSeenDay !== null) weekNumber++;
                    lastSeenDay = day;
                }

                if (
                    dayOfWeek === targetWeekday &&
                    weekNumber >= 0 &&
                    targetWeekNumbers.includes(weekNumber + 1) &&
                    workingDays.includes(dayOfWeek)
                ) {
                    const key = `${cfg.ins_id}_${dateStr}`;
                    if (!occupiedDatesByMachine.has(key)) {
                        newSlots.push({
                            plan_id: plan.id,
                            scheduled_date: dateStr,
                            ins_id: cfg.ins_id,
                            slot_type: 'BIWEEKLY',
                            assigned_user_id: cfg.assigned_technician_id || null,
                            sort_priority: 0,
                            is_manual_override: false
                        });
                        occupiedDatesByMachine.add(key);
                    }
                }
            }
        });

        // 1c. GENERATE QUARTERLY SLOTS (cada 4 meses: mes de inicio + cada 4 meses)
        const quarterlyConfigs = activeConfigs.filter(c => c.quarterly_enabled);
        quarterlyConfigs.forEach(cfg => {
            const startMonth = cfg.quarterly_start_month;
            const dayOfMonth = cfg.quarterly_day_of_month;
            if (!startMonth || !dayOfMonth) return; // sin config completa, no genera

            // (month - startMonth) mod 4 === 0 → mes de ejecución (ej.: inicio enero → enero, mayo, septiembre)
            const monthOffset = ((month - startMonth) % 4 + 4) % 4;
            if (monthOffset !== 0) return;

            const lastDay = new Date(year, month, 0).getDate();
            const targetDay = Math.min(dayOfMonth, lastDay); // ajusta a fin de mes si el día no existe
            const dateStr = `${yearMonth}-${String(targetDay).padStart(2, '0')}`;

            const key = `${cfg.ins_id}_${dateStr}`;
            if (!occupiedDatesByMachine.has(key)) {
                newSlots.push({
                    plan_id: plan.id,
                    scheduled_date: dateStr,
                    ins_id: cfg.ins_id,
                    slot_type: 'QUARTERLY',
                    assigned_user_id: cfg.assigned_technician_id || null,
                    sort_priority: 0,
                    is_manual_override: false
                });
                occupiedDatesByMachine.add(key);
            }
        });

        // 2. GENERATE SCHEDULED SLOTS (PP) — pool = máquinas sin preventivo fijo (semanal/quincenal/cuatrimestral)
        const nonRecurringConfigs = activeConfigs.filter(c => !c.weekly_enabled && !c.biweekly_enabled && !c.quarterly_enabled);
        const regularPool = nonRecurringConfigs.filter(c => !c.scheduled_exempt);
        const exemptPool = nonRecurringConfigs.filter(c => c.scheduled_exempt);

        // Collect failure counts for regularPool
        const insIds = regularPool.map(c => c.ins_id);
        const failureCounts = await this.getActiveFailureCounts(insIds);

        const now = new Date();
        const rankedPool = [...regularPool].sort((a, b) => {
            const failuresA = failureCounts[a.ins_id] || 0;
            const failuresB = failureCounts[b.ins_id] || 0;

            const dateA = a.last_scheduled_at ? new Date(a.last_scheduled_at) : new Date(0);
            const dateB = b.last_scheduled_at ? new Date(b.last_scheduled_at) : new Date(0);

            const daysSinceA = Math.max(0, Math.floor((now - dateA) / (1000 * 60 * 60 * 24)));
            const daysSinceB = Math.max(0, Math.floor((now - dateB) / (1000 * 60 * 60 * 24)));

            if (strategy === 'FAILURE_COUNT') {
                return failuresB - failuresA;
            } else if (strategy === 'LAST_SCHEDULED') {
                return dateA - dateB; // oldest date first
            } else {
                // HYBRID (Default)
                const wFailure = Number(hybridWeights.failure_count) || 0.6;
                const wDays = Number(hybridWeights.days_since_last) || 0.4;

                const scoreA = (failuresA * 10 * wFailure) + (daysSinceA * wDays);
                const scoreB = (failuresB * 10 * wFailure) + (daysSinceB * wDays);
                return scoreB - scoreA;
            }
        });

        // Add exempt machines at the very end of the pool (Regla 1)
        const finalPool = [...rankedPool, ...exemptPool];

        // Count existing overrides per date
        const overridesCountByDate = {};
        preservedOverrides.forEach(slot => {
            if (slot.slot_type === 'SCHEDULED') {
                overridesCountByDate[slot.scheduled_date] = (overridesCountByDate[slot.scheduled_date] || 0) + 1;
            }
        });

        let poolIndex = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month - 1, day);
            const dayOfWeek = dateObj.getDay();
            const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

            if (!workingDays.includes(dayOfWeek)) continue;

            let dailyCount = overridesCountByDate[dateStr] || 0;
            while (dailyCount < maxPerDay && poolIndex < finalPool.length) {
                const machine = finalPool[poolIndex];
                const key = `${machine.ins_id}_${dateStr}`;

                if (!occupiedDatesByMachine.has(key)) {
                    newSlots.push({
                        plan_id: plan.id,
                        scheduled_date: dateStr,
                        ins_id: machine.ins_id,
                        slot_type: 'SCHEDULED',
                        assigned_user_id: machine.assigned_technician_id || null,
                        sort_priority: poolIndex + 1,
                        is_manual_override: false
                    });
                    occupiedDatesByMachine.add(key);
                    dailyCount++;
                }
                poolIndex++;
            }

            if (poolIndex >= finalPool.length) {
                break;
            }
        }

        if (newSlots.length > 0) {
            await MaintenanceScheduleSlot.bulkCreate(newSlots);
        }

        return await this.getPlanForMonth(pId, yearMonth);
    }

    /**
     * Publish plan
     */
    async publishPlan(planId, userId) {
        const plan = await MaintenanceSchedulePlan.findByPk(planId);
        if (!plan) throw new Error("Plan no encontrado");

        await plan.update({
            status: 'PUBLISHED',
            published_by: userId
        });

        return plan;
    }

    /**
     * Update slot (drag & drop, reassign or override)
     */
    async updateSlot(slotId, data) {
        const slot = await MaintenanceScheduleSlot.findByPk(slotId);
        if (!slot) throw new Error("Slot no encontrado");

        const updateData = {
            ...(data.scheduled_date && { scheduled_date: data.scheduled_date }),
            ...(data.assigned_user_id !== undefined && { assigned_user_id: data.assigned_user_id }),
            ...(data.sort_priority !== undefined && { sort_priority: Number(data.sort_priority) }),
            is_manual_override: true
        };

        await slot.update(updateData);
        return slot;
    }

    /**
     * Get plan for a specific month with calculated statuses
     */
    async getPlanForMonth(premiseId, yearMonth) {
        const pId = Number(premiseId) || 1;

        let plan = await MaintenanceSchedulePlan.findOne({
            where: {
                premise_id: pId,
                year_month: yearMonth
            },
            include: [
                {
                    model: User,
                    as: 'publisher',
                    attributes: ['user_id', 'user_name', 'user_email']
                }
            ]
        });

        // Fallback: check without premise_id if earlier plan exists
        if (!plan) {
            plan = await MaintenanceSchedulePlan.findOne({
                where: { year_month: yearMonth },
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['user_id', 'user_name', 'user_email']
                    }
                ]
            });
        }

        if (!plan) {
            return {
                plan: null,
                yearMonth,
                slots: [],
                dayDisplayStatuses: {},
                stats: { total: 0, completed: 0, draft: 0, pending: 0 }
            };
        }

        // Fetch all slots with Inspectable and latest Session
        const rawSlots = await MaintenanceScheduleSlot.findAll({
            where: { plan_id: plan.id },
            include: [
                {
                    model: Inspectable,
                    as: 'inspectable',
                    include: [
                        {
                            model: Device,
                            as: 'deviceData',
                            required: false,
                            include: [{ model: Family, as: 'family', required: false }]
                        }
                    ]
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['user_id', 'user_name', 'user_email']
                },
                {
                    model: MaintenanceSession,
                    as: 'sessions',
                    include: [
                        {
                            model: MaintenanceSessionEvidence,
                            as: 'evidences'
                        },
                        {
                            model: User,
                            as: 'technician',
                            attributes: ['user_id', 'user_name', 'user_email']
                        }
                    ]
                }
            ],
            order: [
                ['scheduled_date', 'ASC'],
                // Orden: WEEKLY, luego BIWEEKLY, luego SCHEDULED (orden lexicográfico del ENUM)
                [Sequelize.literal("FIELD(slot_type, 'WEEKLY', 'BIWEEKLY', 'QUARTERLY', 'SCHEDULED')"), 'ASC'],
                ['sort_priority', 'ASC']
            ]
        });

        const configs = await MaintenanceConfigService.getAllMachineConfigs(pId);
        const technicianByMachine = new Map(configs.map(config => [Number(config.ins_id), config.assigned_technician]));

        let completedCount = 0;
        let draftCount = 0;
        let pendingCount = 0;

        const slots = rawSlots.map(slotItem => {
            const slot = slotItem.toJSON();
            // Get the most relevant session (completed, or latest draft)
            const sessions = slot.sessions || [];
            const completedSession = sessions.find(s => s.status === 'COMPLETED');
            const latestSession = completedSession || sessions[sessions.length - 1] || null;

            let slotDisplayStatus = 'ROJO'; // Default pending
            if (completedSession) {
                slotDisplayStatus = 'AZUL';
                completedCount++;
            } else if (latestSession && latestSession.status === 'DRAFT') {
                slotDisplayStatus = 'AMARILLO';
                draftCount++;
            } else {
                pendingCount++;
            }

            return {
                ...slot,
                exclusive_technician: technicianByMachine.get(Number(slot.ins_id)) || null,
                latest_session: latestSession,
                slot_display_status: slotDisplayStatus,
                family_name: slot.inspectable?.deviceData?.family?.name || 'General'
            };
        });

        // Calculate aggregated dayDisplayStatuses (Regla 6)
        // Group slots by date
        const slotsByDate = {};
        slots.forEach(slot => {
            const dateStr = slot.scheduled_date;
            if (!slotsByDate[dateStr]) slotsByDate[dateStr] = [];
            slotsByDate[dateStr].push(slot);
        });

        const dayDisplayStatuses = {};
        for (const [dateStr, daySlots] of Object.entries(slotsByDate)) {
            const total = daySlots.length;
            const completed = daySlots.filter(s => s.slot_display_status === 'AZUL').length;
            const inProgress = daySlots.filter(s => s.slot_display_status === 'AMARILLO').length;

            if (total > 0 && completed === total) {
                dayDisplayStatuses[dateStr] = 'AZUL';
            } else if (inProgress > 0 || completed > 0) {
                dayDisplayStatuses[dateStr] = 'AMARILLO';
            } else {
                dayDisplayStatuses[dateStr] = 'ROJO';
            }
        }

        // Regla 6B (Fase 2): bonificación VERDE — día AZUL + cierre de falla ese día
        // en una máquina DISTINTA de las planificadas ese día.
        let greenBonusDays = {};
        try {
            greenBonusDays = await MaintenanceFailureClosureService.getGreenBonusDays(plan.id, slotsByDate);
        } catch (e) {
            console.error("Error calculando días VERDE (bonificación):", e);
        }
        for (const dateStr of Object.keys(greenBonusDays)) {
            if (dayDisplayStatuses[dateStr] === 'AZUL') {
                dayDisplayStatuses[dateStr] = 'VERDE';
            }
        }

        return {
            plan,
            yearMonth,
            slots,
            dayDisplayStatuses,
            stats: {
                total: slots.length,
                completed: completedCount,
                draft: draftCount,
                pending: pendingCount
            }
        };
    }
}

module.exports = new MaintenanceScheduleService();

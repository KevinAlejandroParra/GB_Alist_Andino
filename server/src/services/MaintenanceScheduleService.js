const { 
    MaintenanceSchedulePlan, 
    MaintenanceScheduleSlot, 
    MaintenanceMachineConfig, 
    MaintenanceSetting, 
    Inspectable 
} = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

class MaintenanceScheduleService {
    async generatePlan(premiseId, yearMonth) {
        const settings = await MaintenanceSetting.findOne({ where: { premise_id: premiseId } });
        if (!settings) throw new Error("Maintenance settings not found for this premise");

        const configs = await MaintenanceMachineConfig.findAll({
            include: [{
                model: Inspectable,
                as: 'inspectable',
                where: { premise_id: premiseId }
            }],
            where: { is_active: true }
        });

        const plan = await MaintenanceSchedulePlan.create({
            year_month: yearMonth,
            status: 'DRAFT',
            generated_at: new Date()
        });

        const slots = [];
        const daysInMonth = moment(yearMonth, "YYYY-MM").daysInMonth();
        const workingDays = settings.working_days.split(',').map(Number);

        // 1. Weekly Slots
        configs.filter(c => c.weekly_enabled).forEach(config => {
            for (let day = 1; day <= daysInMonth; day++) {
                const date = moment(`${yearMonth}-${day}`, "YYYY-MM-D");
                if (date.weekday() === config.weekly_weekday && workingDays.includes(date.weekday())) {
                    slots.push({
                        plan_id: plan.id,
                        scheduled_date: date.format("YYYY-MM-DD"),
                        ins_id: config.ins_id,
                        slot_type: 'WEEKLY',
                        sort_priority: 0
                    });
                }
            }
        });

        // 2. Programmed Slots (SCHEDULED)
        const scheduledPool = configs.filter(c => !c.weekly_enabled && !c.scheduled_exempt);
        
        // Simple ranking: by last_scheduled_at (oldest first)
        const rankedPool = [...scheduledPool].sort((a, b) => {
            const dateA = a.last_scheduled_at ? new Date(a.last_scheduled_at) : new Date(0);
            const dateB = b.last_scheduled_at ? new Date(b.last_scheduled_at) : new Date(0);
            return dateA - dateB;
        });

        let poolIndex = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = moment(`${yearMonth}-${day}`, "YYYY-MM-D");
            if (!workingDays.includes(date.weekday())) continue;

            let dailyCount = 0;
            while (dailyCount < settings.max_scheduled_per_day && poolIndex < rankedPool.length) {
                slots.push({
                    plan_id: plan.id,
                    scheduled_date: date.format("YYYY-MM-DD"),
                    ins_id: rankedPool[poolIndex].ins_id,
                    slot_type: 'SCHEDULED',
                    sort_priority: 0
                });
                poolIndex++;
                dailyCount++;
            }
        }

        if (slots.length > 0) {
            await MaintenanceScheduleSlot.bulkCreate(slots);
        }

        return plan;
    }

    async publishPlan(planId, userId) {
        const plan = await MaintenanceSchedulePlan.findByPk(planId);
        if (!plan) throw new Error("Plan not found");
        
        await plan.update({
            status: 'PUBLISHED',
            published_by: userId
        });
        
        return plan;
    }

    async updateSlot(slotId, data) {
        const slot = await MaintenanceScheduleSlot.findByPk(slotId);
        if (!slot) throw new Error("Slot not found");
        
        await slot.update({
            ...data,
            is_manual_override: true
        });
        
        return slot;
    }

    async getPlanForMonth(premiseId, yearMonth) {
        return await MaintenanceSchedulePlan.findOne({
            where: { year_month: yearMonth },
            include: {
                model: MaintenanceScheduleSlot,
                as: 'slots',
                include: {
                    model: Inspectable,
                    as: 'inspectable'
                }
            }
        });
    }
}

module.exports = new MaintenanceScheduleService();

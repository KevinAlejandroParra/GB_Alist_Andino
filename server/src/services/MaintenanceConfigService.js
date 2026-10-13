const { 
    MaintenanceMachineConfig, 
    MaintenanceMachineQrCode,
    MaintenanceSetting, 
    Inspectable,
    Device,
    Family
} = require("../models");
const { Op } = require("sequelize");

const DEFAULT_SETTINGS = {
    strategy: 'HYBRID',
    max_scheduled_per_day: 5,
    working_days: '1,2,3,4,5',
    hybrid_weights: { failure_count: 0.6, days_since_last: 0.4 }
};

class MaintenanceConfigService {
    async getMachineConfig(insId) {
        return await MaintenanceMachineConfig.findOne({ 
            where: { ins_id: insId },
            include: [{ model: Inspectable, as: 'inspectable' }]
        });
    }

    async getAllMachineConfigs(premiseId) {
        const whereClause = {};
        if (premiseId) {
            whereClause.premise_id = Number(premiseId);
        }

        const inspectables = await Inspectable.findAll({
            where: whereClause,
            include: [
                {
                    model: Device,
                    as: 'deviceData',
                    required: false,
                    include: [{ model: Family, as: 'family', required: false }]
                }
            ],
            order: [['name', 'ASC']]
        });

        if (inspectables.length === 0) {
            return [];
        }

        const insIds = inspectables.map(i => i.ins_id);

        const [configs, qrs] = await Promise.all([
            MaintenanceMachineConfig.findAll({
                where: { ins_id: { [Op.in]: insIds } }
            }),
            MaintenanceMachineQrCode.findAll({
                where: { ins_id: { [Op.in]: insIds }, is_active: true }
            })
        ]);

        const configMap = new Map(configs.map(c => [c.ins_id, c]));
        const qrMap = new Map(qrs.map(q => [q.ins_id, q]));

        return inspectables.map(ins => {
            const cfg = configMap.get(ins.ins_id);
            const qr = qrMap.get(ins.ins_id);

            return {
                ins_id: ins.ins_id,
                name: ins.name,
                description: ins.description,
                photo_url: ins.photo_url,
                premise_id: ins.premise_id,
                family_name: ins.deviceData?.family?.name || 'General',
                weekly_enabled: cfg ? Boolean(cfg.weekly_enabled) : false,
                weekly_weekday: cfg?.weekly_weekday ?? 1, // default 1 = Lunes
                scheduled_exempt: cfg ? Boolean(cfg.scheduled_exempt) : false,
                last_scheduled_at: cfg?.last_scheduled_at || null,
                is_active: cfg ? Boolean(cfg.is_active) : true,
                qr_code: qr?.qr_code || null,
                has_qr: Boolean(qr)
            };
        });
    }

    async updateMachineConfig(insId, data) {
        const payload = {
            ins_id: Number(insId),
            ...(data.weekly_enabled !== undefined && { weekly_enabled: Boolean(data.weekly_enabled) }),
            ...(data.weekly_weekday !== undefined && { weekly_weekday: data.weekly_weekday !== null ? Number(data.weekly_weekday) : null }),
            ...(data.scheduled_exempt !== undefined && { scheduled_exempt: Boolean(data.scheduled_exempt) }),
            ...(data.last_scheduled_at !== undefined && { last_scheduled_at: data.last_scheduled_at ? new Date(data.last_scheduled_at) : null }),
            ...(data.is_active !== undefined && { is_active: Boolean(data.is_active) })
        };

        const existing = await MaintenanceMachineConfig.findOne({ where: { ins_id: insId } });
        if (existing) {
            await existing.update(payload);
            return existing;
        } else {
            return await MaintenanceMachineConfig.create(payload);
        }
    }

    async bulkUpdateConfigs(configs = []) {
        const results = [];
        for (const config of configs) {
            if (config.ins_id) {
                const updated = await this.updateMachineConfig(config.ins_id, config);
                results.push(updated);
            }
        }
        return { success: true, count: results.length };
    }

    async getSettings(premiseId) {
        const pId = Number(premiseId) || 1;
        let settings = await MaintenanceSetting.findOne({ where: { premise_id: pId } });
        if (!settings) {
            // Return defaults without crashing
            return {
                premise_id: pId,
                ...DEFAULT_SETTINGS
            };
        }
        return settings;
    }

    async updateSettings(premiseId, data) {
        const pId = Number(premiseId) || 1;
        const payload = {
            premise_id: pId,
            ...(data.strategy && { strategy: data.strategy }),
            ...(data.max_scheduled_per_day !== undefined && { max_scheduled_per_day: Number(data.max_scheduled_per_day) }),
            ...(data.working_days !== undefined && { working_days: String(data.working_days) }),
            ...(data.hybrid_weights && { hybrid_weights: data.hybrid_weights })
        };

        let settings = await MaintenanceSetting.findOne({ where: { premise_id: pId } });
        if (settings) {
            await settings.update(payload);
        } else {
            settings = await MaintenanceSetting.create(payload);
        }
        return settings;
    }
}

module.exports = new MaintenanceConfigService();

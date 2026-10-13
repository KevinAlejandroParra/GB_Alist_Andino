const { 
    MaintenanceMachineConfig, 
    MaintenanceSetting, 
    Inspectable 
} = require("../models");

class MaintenanceConfigService {
    async getMachineConfig(insId) {
        return await MaintenanceMachineConfig.findOne({ where: { ins_id: insId } });
    }

    async getAllMachineConfigs(premiseId) {
        const inspectables = await Inspectable.findAll({
            where: { premise_id: premiseId }
        });

        const configs = await MaintenanceMachineConfig.findAll({
            where: {
                ins_id: { [Op.in]: inspectables.map(i => i.ins_id) }
            },
            include: [{
                model: Inspectable,
                as: 'inspectable'
            }]
        });

        // Merge and return all inspectables, ensuring they have a config object
        return inspectables.map(ins => {
            const config = configs.find(c => c.ins_id === ins.ins_id);
            return config || {
                ins_id: ins.ins_id,
                inspectable: ins,
                weekly_enabled: false,
                scheduled_exempt: false,
                is_active: true
            };
        });
    }

    async updateMachineConfig(insId, data) {
        const [updated] = await MaintenanceMachineConfig.upsert({
            ins_id: insId,
            ...data
        });
        return updated;
    }

    async bulkUpdateConfigs(configs) {
        const transactions = [];
        for (const config of configs) {
            transactions.push(MaintenanceMachineConfig.upsert({
                ins_id: config.ins_id,
                ...config
            }));
        }
        await Promise.all(transactions);
        return { success: true };
    }

    async getSettings(premiseId) {
        return await MaintenanceSetting.findOne({ where: { premise_id: premiseId } });
    }

    async updateSettings(premiseId, data) {
        const [settings] = await MaintenanceSetting.upsert({
            premise_id: premiseId,
            ...data
        });
        return settings;
    }
}

module.exports = new MaintenanceConfigService();

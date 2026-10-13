const { MaintenanceMachineQrCode, Inspectable } = require("../models");
const QRCode = require('qrcode');

class MaintenanceQrService {
    async generateQrForMachine(insId, userId) {
        const config = await MaintenanceMachineQrCode.findOne({ where: { ins_id: insId } });
        
        // In a real scenario, we might generate a unique hash
        const qrString = `MAINT-${insId}-${Math.random().toString(36).substring(2, 9)}`;
        
        await MaintenanceMachineQrCode.upsert({
            ins_id: insId,
            qr_code: qrString,
            created_by: userId,
            is_active: true
        });

        const dataUrl = await QRCode.toDataURL(qrString);
        return { qr_code: qrString, dataUrl };
    }

    async validateQr(qrCode) {
        return await MaintenanceMachineQrCode.findOne({ 
            where: { qr_code: qrCode, is_active: true } 
        });
    }

    async listMachineQrs(premiseId) {
        return await MaintenanceMachineQrCode.findAll({
            include: [{
                model: Inspectable,
                as: 'inspectable',
                where: { premise_id: premiseId }
            }]
        });
    }
}

module.exports = new MaintenanceQrService();

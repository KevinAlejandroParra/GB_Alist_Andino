const { MaintenanceMachineQrCode, Inspectable, Device, Family } = require("../models");
const QRCode = require('qrcode');
const crypto = require('crypto');

class MaintenanceQrService {
    /**
     * Generate or regenerate QR for a specific machine
     */
    async generateQrForMachine(insId, userId) {
        const inspectable = await Inspectable.findByPk(insId);
        if (!inspectable) throw new Error("Máquina no encontrada");

        let qrRecord = await MaintenanceMachineQrCode.findOne({ where: { ins_id: insId } });

        let qrString;
        if (qrRecord && qrRecord.qr_code) {
            qrString = qrRecord.qr_code;
            if (!qrRecord.is_active) {
                await qrRecord.update({ is_active: true });
            }
        } else {
            const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
            qrString = `MAINT-${insId}-${randomSuffix}`;

            qrRecord = await MaintenanceMachineQrCode.create({
                ins_id: insId,
                qr_code: qrString,
                created_by: userId,
                is_active: true
            });
        }

        const dataUrl = await QRCode.toDataURL(qrString, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            }
        });

        return {
            id: qrRecord.id,
            ins_id: insId,
            qr_code: qrString,
            dataUrl,
            machine_name: inspectable.name
        };
    }

    /**
     * Generate missing QR codes in bulk for an entire premise
     */
    async bulkGenerateMissingQrs(premiseId, userId) {
        const whereClause = { type_code: 'device' };
        if (premiseId) whereClause.premise_id = premiseId;

        const machines = await Inspectable.findAll({ where: whereClause });
        let generatedCount = 0;

        for (const machine of machines) {
            const existing = await MaintenanceMachineQrCode.findOne({
                where: { ins_id: machine.ins_id, is_active: true }
            });
            if (!existing) {
                await this.generateQrForMachine(machine.ins_id, userId);
                generatedCount++;
            }
        }

        return { success: true, totalMachines: machines.length, generated: generatedCount };
    }

    /**
     * Validate a QR code and return machine details
     */
    async validateQr(qrCode) {
        if (!qrCode) throw new Error("Código QR no proporcionado");

        const qr = await MaintenanceMachineQrCode.findOne({ 
            where: { qr_code: qrCode, is_active: true },
            include: [{
                model: Inspectable,
                as: 'inspectable'
            }]
        });

        if (!qr) {
            return { valid: false, message: "Código QR no encontrado o inactivo" };
        }

        return {
            valid: true,
            ins_id: qr.ins_id,
            machine: qr.inspectable,
            qr_code: qr.qr_code
        };
    }

    /**
     * List all machines with their QR status for badge printing
     */
    async listMachineQrs(premiseId) {
        const whereClause = { type_code: 'device' };
        if (premiseId) whereClause.premise_id = premiseId;

        const machines = await Inspectable.findAll({
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

        const insIds = machines.map(m => m.ins_id);
        const qrs = await MaintenanceMachineQrCode.findAll({
            where: { ins_id: insIds, is_active: true }
        });

        const qrMap = new Map(qrs.map(q => [q.ins_id, q]));

        const results = [];
        for (const machine of machines) {
            const qr = qrMap.get(machine.ins_id);
            let dataUrl = null;
            if (qr) {
                try {
                    dataUrl = await QRCode.toDataURL(qr.qr_code, {
                        errorCorrectionLevel: 'H',
                        margin: 2,
                        width: 250
                    });
                } catch (e) {
                    console.error("Error generating dataUrl for QR:", e);
                }
            }

            results.push({
                ins_id: machine.ins_id,
                name: machine.name,
                family: machine.deviceData?.family?.name || 'General',
                has_qr: Boolean(qr),
                qr_code: qr?.qr_code || null,
                dataUrl
            });
        }

        return results;
    }
}

module.exports = new MaintenanceQrService();

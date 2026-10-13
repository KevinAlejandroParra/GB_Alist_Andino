const { 
    MaintenanceSession, 
    MaintenanceSessionEvidence, 
    MaintenanceSessionPart, 
    MaintenanceScheduleSlot, 
    MaintenanceMachineQrCode, 
    MaintenanceQrScan 
} = require("../models");

class MaintenanceSessionService {
    async startSession(slotId, qrCode, technicianId) {
        const slot = await MaintenanceScheduleSlot.findByPk(slotId);
        if (!slot) throw new Error("Slot not found");

        const qr = await MaintenanceMachineQrCode.findOne({ 
            where: { qr_code: qrCode, is_active: true } 
        });
        if (!qr) throw new Error("Invalid or inactive QR code");
        if (qr.ins_id !== slot.ins_id) throw new Error("QR code does not match the machine assigned to this slot");

        // Record scan
        await MaintenanceQrScan.create({
            qr_code: qrCode,
            ins_id: qr.ins_id,
            technician_id: technicianId
        });

        // Start session
        const session = await MaintenanceSession.create({
            slot_id: slot.id,
            ins_id: slot.ins_id,
            type: slot.slot_type,
            status: 'DRAFT',
            technician_id: technicianId,
            started_at: new Date()
        });

        return session;
    }

    async uploadEvidence(sessionId, phase, fileUrl) {
        const session = await MaintenanceSession.findByPk(sessionId);
        if (!session) throw new Error("Session not found");

        // Check if phase evidence already exists
        const existing = await MaintenanceSessionEvidence.findOne({
            where: { session_id: sessionId, phase: phase }
        });
        if (existing) {
            await existing.update({ file_url: fileUrl });
            return existing;
        }

        return await MaintenanceSessionEvidence.create({
            session_id: sessionId,
            phase: phase,
            file_url: fileUrl
        });
    }

    async completeSession(sessionId, description) {
        const session = await MaintenanceSession.findByPk(sessionId);
        if (!session) throw new Error("Session not found");

        const evidencesCount = await MaintenanceSessionEvidence.count({ 
            where: { session_id: sessionId } 
        });
        if (evidencesCount < 4) throw new Error("All 4 mandatory evidence photos are required to complete the session");

        const completedAt = new Date();
        const duration = Math.floor((completedAt - new Date(session.started_at)) / (1000 * 60));

        await session.update({
            status: 'COMPLETED',
            description: description,
            completed_at: completedAt,
            duration_minutes: duration
        });

        return session;
    }

    async addPart(sessionId, inventoryId, quantity) {
        return await MaintenanceSessionPart.create({
            session_id: sessionId,
            inventory_id: inventoryId,
            quantity: quantity
        });
    }
}

module.exports = new MaintenanceSessionService();

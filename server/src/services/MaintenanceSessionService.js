const { 
    MaintenanceSession, 
    MaintenanceSessionEvidence, 
    MaintenanceScheduleSlot,
    MaintenanceMachineConfig,
    MaintenanceMachineQrCode,
    MaintenanceQrScan,
    MaintenanceSessionParticipant,
    Inspectable,
    User
} = require("../models");

const VALID_PHASES = ['INICIO', 'PROCESO_1', 'PROCESO_2', 'FIN'];

class MaintenanceSessionService {
    /**
     * Start or resume a maintenance session with mandatory QR validation
     */
    async startSession(slotId, qrCode, technicianId) {
        const slot = await MaintenanceScheduleSlot.findByPk(slotId, {
            include: [{ model: Inspectable, as: 'inspectable' }]
        });
        if (!slot) throw new Error("Slot no encontrado en el cronograma");

        const machineConfig = await MaintenanceMachineConfig.findOne({ where: { ins_id: slot.ins_id } });
        if (!qrCode) throw new Error("El código QR es obligatorio para iniciar la sesión");

        const qr = await MaintenanceMachineQrCode.findOne({
            where: { qr_code: qrCode, is_active: true }
        });
        if (!qr) throw new Error("Código QR no reconocido o inactivo en el sistema");

        if (qr.ins_id !== slot.ins_id) {
            throw new Error(`El código QR escaneado no corresponde a la máquina planificada (${slot.inspectable?.name || 'ID ' + slot.ins_id})`);
        }

        const requester = await User.findByPk(technicianId, { attributes: ['user_id', 'user_name', 'role_id'] });
        if (!requester) throw new Error('Técnico no encontrado');
        const isAdmin = [1, 2].includes(Number(requester.role_id));
        const isShared = Boolean(machineConfig?.shared_enabled);
        const exclusiveTechnicianId = machineConfig?.assigned_technician_id || slot.assigned_user_id;
        if (!isShared && exclusiveTechnicianId && Number(exclusiveTechnicianId) !== Number(technicianId) && !isAdmin) {
            throw new Error('Este mantenimiento es exclusivo para el técnico asignado.');
        }

        let session = await MaintenanceSession.findOne({
            where: { slot_id: slot.id },
            order: [['createdAt', 'DESC']]
        });
        if (session?.status === 'COMPLETED') {
            throw new Error('Este mantenimiento ya fue completado.');
        }
        if (session && !isShared && Number(session.technician_id) !== Number(technicianId) && !isAdmin) {
            throw new Error('Este mantenimiento ya fue iniciado por otro técnico y no es compartido.');
        }

        // Record scan audit log
        await MaintenanceQrScan.create({
            qr_code: qrCode,
            ins_id: qr.ins_id,
            technician_id: technicianId,
            scanned_at: new Date()
        });

        if (!session) {
            session = await MaintenanceSession.create({
                slot_id: slot.id,
                ins_id: slot.ins_id,
                type: slot.slot_type,
                status: 'DRAFT',
                technician_id: technicianId,
                started_at: new Date()
            });

        }

        await MaintenanceSessionParticipant.findOrCreate({
            where: { session_id: session.id, technician_id: technicianId },
            defaults: { joined_at: new Date() }
        });

        return await this.getSessionById(session.id);
    }

    /**
     * Get session by slotId
     */
    async getSessionBySlot(slotId) {
        return await MaintenanceSession.findOne({
            where: { slot_id: slotId },
            include: [
                { model: MaintenanceSessionEvidence, as: 'evidences' },
                { model: MaintenanceSessionParticipant, as: 'participants', include: [
                    { model: User, as: 'technician', attributes: ['user_id', 'user_name', 'user_email'] }
                ] },
                { model: Inspectable, as: 'inspectable' },
                { model: User, as: 'technician', attributes: ['user_id', 'user_name', 'user_email'] }
            ],
            order: [['createdAt', 'DESC']]
        });
    }

    /**
     * Get session by sessionId
     */
    async getSessionById(sessionId) {
        return await MaintenanceSession.findByPk(sessionId, {
            include: [
                { model: MaintenanceSessionEvidence, as: 'evidences' },
                { model: MaintenanceSessionParticipant, as: 'participants', include: [
                    { model: User, as: 'technician', attributes: ['user_id', 'user_name', 'user_email'] }
                ] },
                { model: Inspectable, as: 'inspectable' },
                { model: User, as: 'technician', attributes: ['user_id', 'user_name', 'user_email'] }
            ]
        });
    }

    /**
     * Upload or update evidence photo for a specific phase
     */
    async assertCanEditSession(sessionId, userId, roleId) {
        const session = await MaintenanceSession.findByPk(sessionId);
        if (!session) throw new Error('Sesión de mantenimiento no encontrada');
        if (session.status === 'COMPLETED') throw new Error('El mantenimiento ya fue completado.');
        if ([1, 2].includes(Number(roleId))) return session;

        const config = await MaintenanceMachineConfig.findOne({ where: { ins_id: session.ins_id } });
        if (config?.shared_enabled) {
            const participant = await MaintenanceSessionParticipant.findOne({
                where: { session_id: session.id, technician_id: userId }
            });
            if (!participant) throw new Error('Escanea el QR para registrarte como participante antes de intervenir.');
        } else if (Number(session.technician_id) !== Number(userId)) {
            throw new Error('Este mantenimiento ya fue iniciado por otro técnico.');
        }
        return session;
    }

    async assertCanViewSession(sessionId, userId, roleId) {
        const session = await MaintenanceSession.findByPk(sessionId);
        if (!session) return null;
        if ([1, 2].includes(Number(roleId)) || session.status === 'COMPLETED') return session;
        const config = await MaintenanceMachineConfig.findOne({ where: { ins_id: session.ins_id } });
        if (config?.shared_enabled || Number(session.technician_id) === Number(userId)) return session;
        throw new Error('Este mantenimiento fue iniciado por otro técnico.');
    }

    async uploadEvidence(sessionId, phase, fileUrl, uploadedById) {
        if (!VALID_PHASES.includes(phase)) {
            throw new Error(`Fase de evidencia inválida: ${phase}. Debe ser una de: ${VALID_PHASES.join(', ')}`);
        }

        const session = await MaintenanceSession.findByPk(sessionId);
        if (!session) throw new Error("Sesión de mantenimiento no encontrada");

        const existing = await MaintenanceSessionEvidence.findOne({
            where: { session_id: sessionId, phase, uploaded_by_id: uploadedById || null }
        });

        if (existing) {
            await existing.update({ file_url: fileUrl });
            return existing;
        }

        return await MaintenanceSessionEvidence.create({
            session_id: sessionId,
            phase,
            file_url: fileUrl,
            uploaded_by_id: uploadedById || null
        });
    }

    /**
     * Complete maintenance session after validating all 4 mandatory photos
     */
    async completeSession(sessionId, description) {
        const session = await MaintenanceSession.findByPk(sessionId, {
            include: [{ model: MaintenanceSessionEvidence, as: 'evidences' }]
        });
        if (!session) throw new Error("Sesión no encontrada");

        // Verify all 4 required evidence phases are uploaded
        const uploadedPhases = new Set((session.evidences || []).map(e => e.phase));
        const missingPhases = VALID_PHASES.filter(p => !uploadedPhases.has(p));

        if (missingPhases.length > 0) {
            throw new Error(`Faltan evidencias obligatorias: ${missingPhases.join(', ')}. Deben cargarse las 4 fotos.`);
        }

        const completedAt = new Date();
        const startedAt = session.started_at ? new Date(session.started_at) : completedAt;
        const duration = Math.max(1, Math.floor((completedAt - startedAt) / (1000 * 60)));

        await session.update({
            status: 'COMPLETED',
            description: description || '',
            completed_at: completedAt,
            duration_minutes: duration
        });

        // Update last_scheduled_at on machine config if this was a SCHEDULED, BIWEEKLY or QUARTERLY session (Regla 7)
        if (session.type === 'SCHEDULED' || session.type === 'BIWEEKLY' || session.type === 'QUARTERLY') {
            await MaintenanceMachineConfig.upsert({
                ins_id: session.ins_id,
                last_scheduled_at: completedAt
            });
        }

        // Etapa 3: cerrar la OT autogenerada (si el técnico usó repuestos en esta sesión)
        try {
            const MaintenanceWorkOrderService = require('./MaintenanceWorkOrderService');
            await MaintenanceWorkOrderService.closeForSession(sessionId, description);
        } catch (woErr) {
            console.error('⚠️ No se pudo cerrar la OT de la sesión:', woErr.message);
        }

        return await this.getSessionById(sessionId);
    }
}

module.exports = new MaintenanceSessionService();

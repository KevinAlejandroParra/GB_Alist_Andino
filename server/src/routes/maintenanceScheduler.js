const express = require('express');
const router = express.Router();
const MaintenanceConfigService = require('../services/MaintenanceConfigService');
const MaintenanceScheduleService = require('../services/MaintenanceScheduleService');
const MaintenanceSessionService = require('../services/MaintenanceSessionService');
const MaintenanceQrService = require('../services/MaintenanceQrService');
const MaintenanceFailureClosureService = require('../services/MaintenanceFailureClosureService');
const MaintenanceWorkOrderService = require('../services/MaintenanceWorkOrderService');
const MaintenanceSessionPdfService = require('../services/MaintenanceSessionPdfService');
const MaintenanceDayReportPdfService = require('../services/MaintenanceDayReportPdfService');
const { WorkOrder } = require('../models');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { uploadMaintenanceEvidence, toRelativePath } = require('../config/multerConfig');

// Middleware to check if module is enabled
const checkModuleEnabled = (req, res, next) => {
    // If not set or 'true', allow access; only block if explicitly 'false'
    if (process.env.MAINTENANCE_SCHEDULER_ENABLED === 'false') {
        return res.status(403).json({ error: "El módulo de cronograma de mantenimiento está deshabilitado." });
    }
    next();
};

// All routes require authentication and module check
router.use(verifyToken);
router.use(checkModuleEnabled);

// ─────────────────────────────────────────────────────────────
// CONFIGURATION (Admin: roles 1 & 2)
// ─────────────────────────────────────────────────────────────

router.get('/config/machines', async (req, res) => {
    try {
        const { premiseId } = req.query;
        const configs = await MaintenanceConfigService.getAllMachineConfigs(premiseId);
        res.json(configs);
    } catch (e) {
        console.error("Error fetching machine configs:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/config/machine/:insId', async (req, res) => {
    try {
        const config = await MaintenanceConfigService.getMachineConfig(req.params.insId);
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/config/machine', checkRole([1, 2]), async (req, res) => {
    try {
        const { ins_id } = req.body;
        if (!ins_id) return res.status(400).json({ error: "ins_id es requerido" });
        const config = await MaintenanceConfigService.updateMachineConfig(ins_id, req.body);
        res.json(config);
    } catch (e) {
        console.error("Error updating machine config:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/config/bulk-machines', checkRole([1, 2]), async (req, res) => {
    try {
        const { configs } = req.body;
        const result = await MaintenanceConfigService.bulkUpdateConfigs(configs);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/config/settings', async (req, res) => {
    try {
        const { premiseId } = req.query;
        const settings = await MaintenanceConfigService.getSettings(premiseId);
        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/config/settings', checkRole([1, 2]), async (req, res) => {
    try {
        const { premiseId } = req.body;
        const settings = await MaintenanceConfigService.updateSettings(premiseId, req.body);
        res.json(settings);
    } catch (e) {
        console.error("Error updating settings:", e);
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// SCHEDULING & PLANS
// ─────────────────────────────────────────────────────────────

router.get('/plans/month', async (req, res) => {
    try {
        const { premiseId, month } = req.query;
        if (!month) return res.status(400).json({ error: "El parámetro 'month' (YYYY-MM) es requerido" });
        const planData = await MaintenanceScheduleService.getPlanForMonth(premiseId, month);
        res.json(planData);
    } catch (e) {
        console.error("Error fetching plan for month:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/plans/generate', checkRole([1, 2]), async (req, res) => {
    try {
        const { premiseId, month } = req.query;
        const targetMonth = month || req.body.month;
        const targetPremise = premiseId || req.body.premiseId;
        if (!targetMonth) return res.status(400).json({ error: "El parámetro 'month' (YYYY-MM) es requerido" });

        const result = await MaintenanceScheduleService.generatePlan(targetPremise, targetMonth);
        res.json(result);
    } catch (e) {
        console.error("Error generating plan:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/plans/:id/publish', checkRole([1, 2]), async (req, res) => {
    try {
        const userId = req.user.user_id;
        const plan = await MaintenanceScheduleService.publishPlan(req.params.id, userId);
        res.json(plan);
    } catch (e) {
        console.error("Error publishing plan:", e);
        res.status(500).json({ error: e.message });
    }
});

router.patch('/slots/:id', checkRole([1, 2]), async (req, res) => {
    try {
        const slot = await MaintenanceScheduleService.updateSlot(req.params.id, req.body);
        res.json(slot);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// SESSIONS (Operative: Technicians 3, 7 and Admins 1, 2)
// ─────────────────────────────────────────────────────────────

router.get('/sessions/slot/:slotId', async (req, res) => {
    try {
        const session = await MaintenanceSessionService.getSessionBySlot(req.params.slotId);
        res.json(session || null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/sessions/:id', async (req, res) => {
    try {
        const session = await MaintenanceSessionService.getSessionById(req.params.id);
        if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
        res.json(session);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/sessions/start', async (req, res) => {
    try {
        const { slotId, qrCode } = req.body;
        const technicianId = req.user.user_id;
        if (!slotId || !qrCode) {
            return res.status(400).json({ error: "slotId y qrCode son obligatorios para iniciar la sesión" });
        }
        const session = await MaintenanceSessionService.startSession(slotId, qrCode, technicianId);
        res.json(session);
    } catch (e) {
        console.error("Error starting session:", e);
        res.status(400).json({ error: e.message });
    }
});

// Upload evidence with Multer (multipart/form-data)
router.post('/sessions/:id/evidence-upload', uploadMaintenanceEvidence.single('file'), async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { phase } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "No se proporcionó ningún archivo de imagen" });
        }
        if (!phase) {
            return res.status(400).json({ error: "La fase de la evidencia es obligatoria (INICIO, PROCESO_1, PROCESO_2, FIN)" });
        }

        const relativePath = toRelativePath(req.file.path);
        const evidence = await MaintenanceSessionService.uploadEvidence(sessionId, phase, relativePath);
        res.json(evidence);
    } catch (e) {
        console.error("Error uploading evidence:", e);
        res.status(400).json({ error: e.message });
    }
});

// JSON fallback for evidence upload
router.post('/sessions/evidence', async (req, res) => {
    try {
        const { sessionId, phase, fileUrl } = req.body;
        if (!sessionId || !phase || !fileUrl) {
            return res.status(400).json({ error: "sessionId, phase y fileUrl son requeridos" });
        }
        const evidence = await MaintenanceSessionService.uploadEvidence(sessionId, phase, fileUrl);
        res.json(evidence);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/sessions/:id/complete', async (req, res) => {
    try {
        const { description } = req.body;
        const session = await MaintenanceSessionService.completeSession(req.params.id, description);
        res.json(session);
    } catch (e) {
        console.error("Error completing session:", e);
        res.status(400).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// REPUESTOS DE SESIÓN (Etapa 3 — OT autogenerada lazy)
// ─────────────────────────────────────────────────────────────

// Listar repuestos de la OT de la sesión (vacío si aún no hay OT)
router.get('/sessions/:id/parts', async (req, res) => {
    try {
        const result = await MaintenanceWorkOrderService.listPartsForSession(req.params.id);
        res.json(result);
    } catch (e) {
        console.error('Error listing session parts:', e);
        res.status(500).json({ error: e.message });
    }
});

// Agregar repuesto → crea la OT MTO perezosamente + descuenta stock
router.post('/sessions/:id/parts', async (req, res) => {
    try {
        const { inventoryId, quantity } = req.body;
        const technicianId = req.user?.user_id || null;
        const result = await MaintenanceWorkOrderService.addPartToSession(req.params.id, inventoryId, quantity, technicianId);
        res.json(result);
    } catch (e) {
        console.error('Error adding session part:', e);
        res.status(400).json({ error: e.message });
    }
});

// Quitar repuesto (devuelve stock; si queda vacía la OT no se elimina hasta cierre)
router.delete('/sessions/:id/parts/:partId', async (req, res) => {
    try {
        const technicianId = req.user?.user_id || null;
        const result = await MaintenanceWorkOrderService.removePartFromSession(req.params.id, req.params.partId, technicianId);
        res.json(result);
    } catch (e) {
        console.error('Error removing session part:', e);
        res.status(400).json({ error: e.message });
    }
});

// Info de la OT de la sesión (para el wizard)
router.get('/sessions/:id/work-order', async (req, res) => {
    try {
        const wo = await WorkOrder.findOne({ where: { maintenance_session_id: req.params.id } });
        res.json(wo ? { id: wo.id, work_order_id: wo.work_order_id, status: wo.status } : null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// REQUISICIONES DE SESIÓN (manual, desde el wizard)
// ─────────────────────────────────────────────────────────────

router.get('/sessions/:id/requisitions', async (req, res) => {
    try {
        const list = await MaintenanceWorkOrderService.listRequisitionsForSession(req.params.id);
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/sessions/:id/requisitions', async (req, res) => {
    try {
        const { partReference, quantity, notes } = req.body;
        const technicianId = req.user?.user_id || null;
        const req2 = await MaintenanceWorkOrderService.createManualRequisition(
            req.params.id, { partReference, quantity, notes }, technicianId
        );
        res.status(201).json(req2);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PDF de la sesión (resumen con repuestos y requisiciones)
router.get('/sessions/:id/pdf', async (req, res) => {
    try {
        const pdfBuffer = await MaintenanceSessionPdfService.generatePdf(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="mantenimiento_sesion_${req.params.id}.pdf"`);
        res.send(pdfBuffer);
    } catch (e) {
        console.error('Error generating session PDF:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// QR CODES
// ─────────────────────────────────────────────────────────────

router.get('/qr/machines', async (req, res) => {
    try {
        const { premiseId } = req.query;
        const list = await MaintenanceQrService.listMachineQrs(premiseId);
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/qr/generate', checkRole([1, 2]), async (req, res) => {
    try {
        const { insId } = req.body;
        if (!insId) return res.status(400).json({ error: "insId es requerido" });
        const userId = req.user.user_id;
        const qr = await MaintenanceQrService.generateQrForMachine(insId, userId);
        res.json(qr);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/qr/generate-all', checkRole([1, 2]), async (req, res) => {
    try {
        const { premiseId } = req.body;
        const userId = req.user.user_id;
        const result = await MaintenanceQrService.bulkGenerateMissingQrs(premiseId, userId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/qr/validate', async (req, res) => {
    try {
        const { qrCode } = req.query;
        if (!qrCode) return res.status(400).json({ error: "qrCode es requerido" });
        const result = await MaintenanceQrService.validateQr(qrCode);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// DAY FAILURE CLOSURES (Fase 2 — bonificación VERDE)
// ─────────────────────────────────────────────────────────────

router.get('/days/:date/failures', async (req, res) => {
    try {
        const { date } = req.params;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
        }
        const failures = await MaintenanceFailureClosureService.getActiveFailuresForDay(date, req.query.insId);
        res.json(failures);
    } catch (e) {
        console.error("Error fetching active failures for day:", e);
        res.status(500).json({ error: e.message });
    }
});

/*
 * Informe PDF CONSOLIDADO del día:
 * - Preventivos completados (máquina, tipo, técnico, tiempos, descripción, repuestos/requisiciones)
 * - Fallas cerradas ese día (máquina, falla, estado AR, técnico, tiempos, repuestos)
 */
router.get('/days/:date/report-pdf', async (req, res) => {
    try {
        const { date } = req.params;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
        }
        const pdfBuffer = await MaintenanceDayReportPdfService.generateDayPdf(date);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="informe_diario_${date}.pdf"`);
        res.send(pdfBuffer);
    } catch (e) {
        console.error('Error generating day report PDF:', e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/days/:date/closures', async (req, res) => {
    try {
        const { date } = req.params;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
        }
        const closures = await MaintenanceFailureClosureService.getClosuresForDate(date);
        res.json(closures);
    } catch (e) {
        console.error("Error fetching closures for day:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/days/:date/link-failure-closure', async (req, res) => {
    try {
        const { date } = req.params;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
        }
        const { failureOrderId, technicianId } = req.body || {};
        if (!failureOrderId) return res.status(400).json({ error: "failureOrderId es requerido" });

        const closure = await MaintenanceFailureClosureService.linkFailureClosure(
            date,
            technicianId || req.user.user_id,
            failureOrderId,
            req.user.user_id
        );
        res.json(closure);
    } catch (e) {
        console.error("Error linking failure closure:", e);
        res.status(400).json({ error: e.message });
    }
});

router.delete('/days/:date/closures/:closureId', checkRole([1, 2, 3, 7]), async (req, res) => {
    try {
        const result = await MaintenanceFailureClosureService.unlinkFailureClosure(req.params.closureId);
        res.json(result);
    } catch (e) {
        console.error("Error unlinking failure closure:", e);
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;

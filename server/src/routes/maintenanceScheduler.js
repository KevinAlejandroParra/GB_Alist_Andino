const express = require('express');
const router = express.Router();
const MaintenanceConfigService = require('../services/MaintenanceConfigService');
const MaintenanceScheduleService = require('../services/MaintenanceScheduleService');
const MaintenanceSessionService = require('../services/MaintenanceSessionService');
const MaintenanceQrService = require('../services/MaintenanceQrService');
const { verifyToken, checkRole } = require('../middleware/authMiddleware'); // Assuming these exist based on project patterns

// Middleware to check if module is enabled
const checkModuleEnabled = (req, res, next) => {
    if (process.env.MAINTENANCE_SCHEDULER_ENABLED !== 'true') {
        return res.status(403).json({ error: "Maintenance module is disabled" });
    }
    next();
};

// All routes require authentication and module to be enabled
router.use(verifyToken);
router.use(checkModuleEnabled);

// Config
router.get('/config/machine/:insId', async (req, res) => {
    try {
        const config = await MaintenanceConfigService.getMachineConfig(req.params.insId);
        res.json(config);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/config/machines', async (req, res) => {
    try {
        const { premiseId } = req.query;
        const configs = await MaintenanceConfigService.getAllMachineConfigs(premiseId);
        res.json(configs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/config/machine', checkRole([1, 2]), async (req, res) => {
    try {
        const config = await MaintenanceConfigService.updateMachineConfig(req.body.ins_id, req.body);
        res.json(config);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/config/settings', checkRole([1, 2]), async (req, res) => {
    try {
        const { premiseId } = req.body;
        const settings = await MaintenanceConfigService.updateSettings(premiseId, req.body);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Scheduling
router.post('/plans/generate', checkRole([1, 2]), async (req, res) => {
    try {
        const { premiseId, month } = req.query;
        const plan = await MaintenanceScheduleService.generatePlan(premiseId, month);
        res.json(plan);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/plans/:id/publish', checkRole([1, 2]), async (req, res) => {
    try {
        const userId = req.user.user_id; // From verifyToken
        const plan = await MaintenanceScheduleService.publishPlan(req.params.id, userId);
        res.json(plan);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/slots/:id', checkRole([1, 2]), async (req, res) => {
    try {
        const slot = await MaintenanceScheduleService.updateSlot(req.params.id, req.body);
        res.json(slot);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/plans/month', async (req, res) => {
    try {
        const { premiseId, month } = req.query;
        const plan = await MaintenanceScheduleService.getPlanForMonth(premiseId, month);
        res.json(plan);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sessions
router.post('/sessions/start', async (req, res) => {
    try {
        const { slotId, qrCode } = req.body;
        const technicianId = req.user.user_id;
        const session = await MaintenanceSessionService.startSession(slotId, qrCode, technicianId);
        res.json(session);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sessions/evidence', async (req, res) => {
    try {
        const { sessionId, phase, fileUrl } = req.body;
        const evidence = await MaintenanceSessionService.uploadEvidence(sessionId, phase, fileUrl);
        res.json(evidence);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sessions/:id/complete', async (req, res) => {
    try {
        const { description } = req.body;
        const session = await MaintenanceSessionService.completeSession(req.params.id, description);
        res.json(session);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sessions/parts', async (req, res) => {
    try {
        const { sessionId, inventoryId, quantity } = req.body;
        const part = await MaintenanceSessionService.addPart(sessionId, inventoryId, quantity);
        res.json(part);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// QR
router.post('/qr/generate', checkRole([1, 2]), async (req, res) => {
    try {
        const { insId } = req.body;
        const userId = req.user.user_id;
        const qr = await MaintenanceQrService.generateQrForMachine(insId, userId);
        res.json(qr);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/qr/validate', async (req, res) => {
    try {
        const { qrCode } = req.query;
        const qr = await MaintenanceQrService.validateQr(qrCode);
        res.json(qr);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

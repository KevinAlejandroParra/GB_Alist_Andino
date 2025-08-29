const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    ensureDailyInstance,
    getDailyChecklist,
    submitResponses,
    upsertObservation,
    listObservations,
    signChecklist
} = require('../controllers/attractionChecklistController');

// Rutas para el checklist de atracciones
router.post('/attractions/:id/checklist/ensure', verifyToken, ensureDailyInstance);
router.get('/attractions/:id/checklist/daily', verifyToken, getDailyChecklist);
router.post('/checklists/:id/responses', verifyToken, submitResponses);
router.post('/checklists/:id/observations', verifyToken, upsertObservation);
router.get('/checklists/:id/observations', verifyToken, listObservations);
router.post('/checklists/:id/sign', verifyToken, signChecklist);

module.exports = router;

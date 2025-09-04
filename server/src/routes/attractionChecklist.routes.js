const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    ensureDailyInstance,
    getDailyChecklist,
    submitResponses,
    updateFailure,
    listObservations,
    signChecklist,
    listChecklistsByAttraction
} = require('../controllers/attractionChecklistController');

// Rutas para el checklist de atracciones
router.post('/:id/checklist/ensure', verifyToken, ensureDailyInstance);
router.get('/:id/checklist/daily', verifyToken, getDailyChecklist);
router.post('/checklists/:id/responses', verifyToken, submitResponses);
router.put('/failures/:id', verifyToken, updateFailure); // Cambiado a PUT /failures/:id y usa updateFailure
router.get('/checklists/:id/observations', verifyToken, listObservations);
router.post('/checklists/:id/sign', verifyToken, signChecklist);
router.get('/:id/checklists/history', verifyToken, listChecklistsByAttraction);

module.exports = router;

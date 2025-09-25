const express = require('express');
const router = express.Router();
const checklistTypeController = require('../controllers/checklistTypeController');
const { verifyToken } = require('../middleware/authMiddleware');

// Ruta para obtener todos los tipos de checklist, opcionalmente filtrados por role_id
router.get('/checklist-types', verifyToken, checklistTypeController.getAllChecklistTypes);

module.exports = router;

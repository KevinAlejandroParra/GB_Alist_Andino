const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/authMiddleware')
const { generateFamilyChecklist } = require('../controllers/familyChecklistController')

// Ruta para generar/obtener checklist de familia
router.get('/family/:checklistTypeId/generate', verifyToken, generateFamilyChecklist)

module.exports = router
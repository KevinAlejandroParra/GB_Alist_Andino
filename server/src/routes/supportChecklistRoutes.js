const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const supportChecklistController = require('../controllers/supportChecklistController');

/**
 * Rutas para funcionalidad de Soporte de Checklists
 * Solo accesible para usuarios con rol de Soporte (role_id: 2)
 */

// Middleware para verificar que el usuario sea Soporte
const verifySupportRole = checkRole([2]);

// Obtener tipos de checklist disponibles con filtros
router.get(
  '/types',
  verifyToken,
  verifySupportRole,
  supportChecklistController.getAvailableChecklistTypes
);

// Obtener checklists existentes con filtros avanzados
router.get(
  '/checklists',
  verifyToken,
  verifySupportRole,
  supportChecklistController.getChecklistsWithFilters
);

// Obtener un checklist específico por ID (para modo soporte)
router.get(
  '/checklists/:checklist_id',
  verifyToken,
  verifySupportRole,
  supportChecklistController.getChecklistByIdForSupport
);

// Obtener usuarios disponibles para impersonar
router.get(
  '/users',
  verifyToken,
  verifySupportRole,
  supportChecklistController.getAvailableUsers
);

// Acceder a un checklist específico como otro usuario
router.post(
  '/checklists/:checklist_id/access',
  verifyToken,
  verifySupportRole,
  supportChecklistController.accessChecklistAsUser
);

// Crear o acceder a un checklist como otro usuario
router.post(
  '/checklists/type/:checklistTypeId/create',
  verifyToken,
  verifySupportRole,
  supportChecklistController.createChecklistAsUser
);

// Enviar respuestas como usuario impersonado
router.post(
  '/checklists/:id/responses',
  verifyToken,
  verifySupportRole,
  supportChecklistController.submitResponsesAsUser
);

// Firmar checklist como usuario impersonado
router.post(
  '/checklists/:id/sign',
  verifyToken,
  verifySupportRole,
  supportChecklistController.signChecklistAsUser
);

// Escanear QR como usuario impersonado
router.post(
  '/checklists/qr/scan',
  verifyToken,
  verifySupportRole,
  supportChecklistController.scanQrCodeAsUser
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const supportChecklistController = require('../controllers/supportChecklistController');

/**
 * Rutas para funcionalidad de Soporte de Checklists
 * La mayoría solo accesible para Soporte (role_id: 2).
 * Las rutas marcadas con adminOrSupport también permiten Administrador (role_id: 1)
 * para el flujo de acceso retroactivo aprobado.
 */

const verifySupportRole  = checkRole([2]);
const adminOrSupport     = checkRole([1, 2]); // Admin usa estas en el flujo retroactivo

// Obtener tipos de checklist disponibles con filtros
// Admin también lo necesita para poblar el formulario de solicitud retroactiva
router.get(
  '/types',
  verifyToken,
  adminOrSupport,
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
  adminOrSupport,
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
// Admin lo usa cuando action_type = 'access_existing'
router.post(
  '/checklists/:checklist_id/access',
  verifyToken,
  adminOrSupport,
  supportChecklistController.accessChecklistAsUser
);

// Crear checklist como otro usuario
// Admin lo usa cuando action_type = 'create_new'
router.post(
  '/checklists/type/:checklistTypeId/create',
  verifyToken,
  adminOrSupport,
  supportChecklistController.createChecklistAsUser
);

// Enviar respuestas como usuario impersonado
router.post(
  '/checklists/:id/responses',
  verifyToken,
  adminOrSupport,
  supportChecklistController.submitResponsesAsUser
);

// Firmar checklist como usuario impersonado
router.post(
  '/checklists/:id/sign',
  verifyToken,
  adminOrSupport,
  supportChecklistController.signChecklistAsUser
);

// Escanear QR como usuario impersonado
router.post(
  '/checklists/qr/scan',
  verifyToken,
  adminOrSupport,
  supportChecklistController.scanQrCodeAsUser
);

module.exports = router;

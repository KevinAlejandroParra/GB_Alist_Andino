const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/retroactiveAccessController');

// Solo administradores (role_id: 1)
const adminOnly = checkRole([1]);
// Administradores y soporte (role_id: 1 o 2)
const adminOrSupport = checkRole([1, 2]);

/**
 * POST /api/retroactive-access/requests
 * Crear solicitud de acceso retroactivo (solo Administradores)
 */
router.post('/requests', verifyToken, adminOnly, ctrl.createRequest);

/**
 * GET /api/retroactive-access/requests
 * Listar solicitudes — admin ve las suyas, soporte ve todas
 */
router.get('/requests', verifyToken, adminOrSupport, ctrl.getRequests);

/**
 * GET /api/retroactive-access/review
 * Aprobar o rechazar una solicitud desde el correo (sin autenticación)
 * Query params: token=<UUID>&action=approve|reject
 */
router.get('/review', ctrl.reviewRequest);

/**
 * POST /api/retroactive-access/validate-token
 * Validar JWT retroactivo y retornar el contexto de acceso
 */
router.post('/validate-token', verifyToken, adminOnly, ctrl.validateToken);

/**
 * GET /api/retroactive-access/existing-checklists
 * Obtener checklists existentes del admin para fecha+tipo (para la UI del formulario)
 */
router.get('/existing-checklists', verifyToken, adminOnly, ctrl.getExistingChecklists);

/**
 * POST /api/retroactive-access/mark-used
 * Marcar el token como usado tras la primera acción retroactiva
 */
router.post('/mark-used', verifyToken, adminOnly, ctrl.markTokenUsed);

/**
 * POST /api/retroactive-access/requests/:request_id/resend
 * Reenviar correo de aprobación al admin (cuando el email original falló)
 */
router.post('/requests/:request_id/resend', verifyToken, adminOrSupport, ctrl.resendApprovalEmail);

module.exports = router;

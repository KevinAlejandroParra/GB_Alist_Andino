const express = require('express');
const router = express.Router();
const retroactiveSignatureController = require('../controllers/retroactiveSignatureController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Middleware: Solo usuarios con rol Soporte (role_id: 2) pueden acceder
const supportOnly = checkRole([2]);

/**
 * @route   GET /api/retroactive-signatures/unsigned-checklists
 * @desc    Obtener checklists sin firma de administrador
 * @access  Private (Solo Soporte)
 */
router.get(
  '/unsigned-checklists',
  verifyToken,
  supportOnly,
  retroactiveSignatureController.getUnsignedChecklists
);

/**
 * @route   POST /api/retroactive-signatures/:checklist_id/sign
 * @desc    Agregar firma retroactiva a un checklist
 * @access  Private (Solo Soporte)
 */
router.post(
  '/:checklist_id/sign',
  verifyToken,
  supportOnly,
  retroactiveSignatureController.addRetroactiveSignature
);

/**
 * @route   GET /api/retroactive-signatures/history
 * @desc    Obtener historial de firmas retroactivas
 * @access  Private (Solo Soporte)
 */
router.get(
  '/history',
  verifyToken,
  supportOnly,
  retroactiveSignatureController.getRetroactiveSignaturesHistory
);

/**
 * @route   GET /api/retroactive-signatures/available-admins
 * @desc    Obtener lista de administradores disponibles
 * @access  Private (Solo Soporte)
 */
router.get(
  '/available-admins',
  verifyToken,
  supportOnly,
  retroactiveSignatureController.getAvailableAdmins
);

module.exports = router;

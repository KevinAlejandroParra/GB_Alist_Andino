'use strict';

const express = require('express');
const FailureController = require('../controllers/FailureController');
const FailureSignatureService = require('../services/FailureSignatureService');
const upload = require('../config/multerConfig');

const router = express.Router();

// Middleware de autenticación
const { verifyToken } = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

/**
 * RUTAS DE ÓRDENES DE FALLA (OF)
 * Prefijo: /api/failures
 */

// POST /api/failures - Crear nueva OF desde checklist
router.post('/', (req, res) => FailureController.createFailureOrder(req, res));

// POST /api/failures/independent - Crear nueva OF independiente con soporte para archivos
router.post('/independent', upload.single('evidence'), (req, res) => FailureController.createStandaloneFailure(req, res));

// POST /api/failures/independent-with-part - Crear nueva OF independiente con repuesto
router.post('/independent-with-part', upload.single('evidence'), (req, res) => FailureController.createStandaloneFailureWithPart(req, res));

/**
 * RUTAS DE FIRMAS DE REPORTES
 * Prefijo: /api/failures/:failureId/report-signature
 */

// POST /api/failures/:failureId/report-signature - Crear firma de reporte
router.post('/:failureId/report-signature', (req, res) => FailureController.createReportSignature(req, res));

// GET /api/failures/:failureId/report-signature - Obtener firma de reporte
router.get('/:failureId/report-signature', (req, res) => FailureController.getReportSignature(req, res));

// GET /api/failures/:failureId/has-report-signature - Verificar si tiene firma de reporte
router.get('/:failureId/has-report-signature', (req, res) => FailureController.hasReportSignature(req, res));

/**
 * RUTAS DE FIRMAS DE ADMINISTRADOR
 * Prefijo: /api/failures/:failureId/admin-signature
 */

// POST /api/failures/:failureId/admin-signature - Crear firma de administrador (SOLO ROL 1)
router.post('/:failureId/admin-signature', (req, res) => FailureController.createAdminSignature(req, res));

// GET /api/failures/:failureId/admin-signature - Obtener firma de administrador
router.get('/:failureId/admin-signature', (req, res) => FailureController.getAdminSignature(req, res));

// GET /api/failures/:failureId/has-admin-signature - Verificar si tiene firma de administrador
router.get('/:failureId/has-admin-signature', (req, res) => FailureController.hasAdminSignature(req, res));

/**
 * RUTAS DE CONSULTA ESPECÍFICAS (ANTES que :id)
 */

// GET /api/failures/by-items - Obtener fallas por lista de checklist_item_ids
router.get('/by-items', (req, res) => FailureController.getFailuresByItems(req, res));

// GET /api/failures/recent-failures - Obtener fallas recientes
router.get('/recent-failures', (req, res) => FailureController.getRecentFailures(req, res));

// GET /api/failures/statistics - Obtener estadísticas de OF
router.get('/statistics', (req, res) => FailureController.getFailureOrderStatistics(req, res));

/**
 * RUTAS GENERALES
 */

// GET /api/failures - Obtener lista de OF con filtros
router.get('/', (req, res) => FailureController.getFailureOrders(req, res));

/**
 * RUTAS CON PARÁMETROS (DESPUÉS de las específicas)
 */

// GET /api/failures/:id - Obtener detalles de OF específica
router.get('/:id', (req, res) => FailureController.getFailureOrderById(req, res));

// GET /api/failures/:id/signatures-check - Verificar firmas requeridas
router.get('/:id/signatures-check', (req, res) => FailureController.checkRequiredSignatures(req, res));

// POST /api/failures/:id/sign-and-advance - Firmar y avanzar estado
router.post('/:id/sign-and-advance', (req, res) => FailureController.signAndAdvanceFailure(req, res));

// PUT /api/failures/:id - Actualizar OF
router.put('/:id', (req, res) => FailureController.updateFailureOrder(req, res));

/**
 * RUTAS ESPECÍFICAS PARA CHECKLISTS
 * Prefijo: /api/checklists/failures
 */

// GET /api/checklists/failures/by-type/:checklistTypeId - Obtener fallas activas por tipo de checklist
router.get('/by-type/:checklistTypeId', (req, res) => FailureController.getFailuresByChecklistType(req, res));

// GET /api/checklists/failures/resolved/by-type/:checklistTypeId - Obtener fallas resueltas por tipo de checklist
router.get('/resolved/by-type/:checklistTypeId', (req, res) => FailureController.getResolvedFailuresByChecklistType(req, res));

module.exports = router;
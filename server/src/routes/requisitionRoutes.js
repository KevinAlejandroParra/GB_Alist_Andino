'use strict';

const express = require('express');
const RequisitionController = require('../controllers/RequisitionController');

const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// === CREACIÓN DE REQUISICIONES ===
/**
 * POST /api/requisitions
 * El sistema crea una nueva solicitud de repuesto de manera independiente
 */
router.post('/', (req, res) => RequisitionController.createRequisition(req, res));

// === CONSULTAS DE REQUISICIONES ===
/**
 * GET /api/requisitions
 * El sistema obtiene una lista filtrada de requisiciones según criterios especificados
 */
router.get('/', (req, res) => RequisitionController.getRequisitions(req, res));

/**
 * GET /api/requisitions/:id
 * El sistema obtiene los detalles específicos de una requisición por su ID
 */
router.get('/:id', (req, res) => RequisitionController.getRequisitionById(req, res));

/**
 * GET /api/requisitions/work-order/:workOrderId
 * El sistema obtiene el historial de requisiciones asociadas a una orden de trabajo
 */
router.get('/work-order/:workOrderId', (req, res) => RequisitionController.getRequisitionHistory(req, res));

/**
 * GET /api/requisitions/statistics
 * El sistema obtiene estadísticas generales de requisiciones en un período
 */
router.get('/statistics', (req, res) => RequisitionController.getStatistics(req, res));

// === OPERACIONES DE REQUISICIONES ===
/**
 * PUT /api/requisitions/:id/approve
 * El sistema aprueba una solicitud de requisición pendiente
 */
router.put('/:id/approve', (req, res) => RequisitionController.approveRequisition(req, res));

/**
 * POST /api/requisitions/:id/approve-and-add-to-inventory
 * El sistema aprueba la requisición y agrega automáticamente el repuesto al inventario
 */
router.post('/:id/approve-and-add-to-inventory', (req, res) => RequisitionController.approveAndAddToInventory(req, res));

/**
 * PUT /api/requisitions/:id/receive
 * El sistema marca la requisición como recibida y actualiza el inventario
 */
router.put('/:id/receive', (req, res) => RequisitionController.markAsReceived(req, res));

/**
 * PUT /api/requisitions/:id/cancel
 * El sistema cancela una requisición pendiente con una razón específica
 */
router.put('/:id/cancel', (req, res) => RequisitionController.cancelRequisition(req, res));

module.exports = router;
'use strict';

const express = require('express');
const RequisitionController = require('../controllers/RequisitionController');

const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

// RUTAS PARA EL FLUJO COMPLETO DE FALLAS Y REQUISICIONES

/**
 * @route POST /api/failures/create-with-requisition
 * @desc El sistema crea una falla con orden de trabajo y requisición automática
 * @access Private
 */
router.post('/failures/create-with-requisition', (req, res) => {
  RequisitionController.createFailureWithRequisition(req, res);
});

/**
 * @route GET /api/failures/:id/available-parts
 * @desc El sistema busca repuestos disponibles específicamente para resolver una falla
 * @access Private
 */
router.get('/failures/:id/available-parts', (req, res) => {
  RequisitionController.getAvailablePartsForFailure(req, res);
});

/**
 * @route POST /api/failures/:id/resolve-with-part
 * @desc El sistema resuelve una falla usando un repuesto del inventario
 * @access Private
 */
router.post('/failures/:id/resolve-with-part', (req, res) => {
  RequisitionController.resolveFailureWithPart(req, res);
});

/**
 * @route GET /api/requisitions/pending
 * @desc El sistema obtiene requisiciones pendientes con información completa
 * @access Private
 */
router.get('/requisitions/pending', (req, res) => {
  RequisitionController.getPendingRequisitions(req, res);
});

/**
 * @route GET /api/requisitions/statistics
 * @desc El sistema obtiene estadísticas específicas de requisiciones por estado
 * @access Private
 */
router.get('/requisitions/statistics', (req, res) => {
  RequisitionController.getRequisitionStatistics(req, res);
});

module.exports = router;
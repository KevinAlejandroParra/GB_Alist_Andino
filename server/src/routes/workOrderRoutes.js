'use strict';

const express = require('express');
const workOrderController = require('../controllers/workOrderController');

const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

/**
 * RUTAS DE ÓRDENES DE TRABAJO (OT)
 * Prefijo: /api/work-orders
 */

// POST /api/work-orders - Crear nueva OT
router.post('/', (req, res) => workOrderController.createWorkOrder(req, res));

// GET /api/work-orders - Obtener lista de OT con filtros
router.get('/', (req, res) => workOrderController.getWorkOrders(req, res));

// GET /api/work-orders/latest - Obtener la última OT creada por el usuario
router.get('/latest', (req, res) => workOrderController.getLatestWorkOrderByUser(req, res));

// GET /api/work-orders/statistics - Obtener estadísticas de OT
router.get('/statistics', (req, res) => workOrderController.getStatistics(req, res));

// GET /api/work-orders/area/:area - Obtener OTs por área (TECNICA/OPERATIVA)
router.get('/area/:area', (req, res) => workOrderController.getByArea(req, res));

// GET /api/work-orders/:id - Obtener detalles de OT específica
router.get('/:id', (req, res) => workOrderController.getWorkOrderById(req, res));

// PUT /api/work-orders/:id/start - Iniciar trabajo en OT
router.put('/:id/start', (req, res) => workOrderController.startWork(req, res));

// PUT /api/work-orders/:id/finish - Finalizar trabajo en OT
router.put('/:id/finish', (req, res) => workOrderController.finishWork(req, res));

// PUT /api/work-orders/:id/tests - Registrar pruebas en OT
router.put('/:id/tests', (req, res) => workOrderController.performTests(req, res));

// PUT /api/work-orders/:id/resolve - Resolver OT (cierre final)
router.put('/:id/resolve', (req, res) => workOrderController.resolveWorkOrder(req, res));

// PUT /api/work-orders/:id/cancel - Cancelar OT
router.put('/:id/cancel', (req, res) => workOrderController.cancelWorkOrder(req, res));

// POST /api/work-orders/:id/parts - Agregar un repuesto a una OT
router.post('/:id/parts', (req, res) => workOrderController.addWorkOrderPart(req, res));

// POST /api/work-orders/:id/parts/multiple - Agregar múltiples repuestos a una OT
router.post('/:id/parts/multiple', (req, res) => workOrderController.addMultipleParts(req, res));

// GET /api/work-orders/:id/parts - Obtener repuestos de una OT
router.get('/:id/parts', (req, res) => workOrderController.getWorkOrderParts(req, res));

// DELETE /api/work-orders/:id/parts/:partId - Eliminar un repuesto de una OT
router.delete('/:id/parts/:partId', (req, res) => workOrderController.removeWorkOrderPart(req, res));

// PUT /api/work-orders/:id/update - Actualizar campos específicos de OT
router.put('/:id/update', (req, res) => workOrderController.updateWorkOrderFields(req, res));

module.exports = router;
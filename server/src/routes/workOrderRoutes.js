const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrderController');
const { verifyToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener órdenes de trabajo pendientes
router.get('/pending', workOrderController.getPendingWorkOrders);

// Obtener una orden de trabajo específica
router.get('/:id', workOrderController.getWorkOrderById);

// Crear una orden de trabajo manualmente
router.post('/', workOrderController.createWorkOrder);

// Cerrar una orden de trabajo
router.put('/:id/close', workOrderController.closeWorkOrder);

// Obtener estadísticas de órdenes de trabajo
router.get('/stats/overview', workOrderController.getWorkOrderStats);

module.exports = router;
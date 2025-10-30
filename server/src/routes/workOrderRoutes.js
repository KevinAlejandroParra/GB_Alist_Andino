const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrderController');
const { verifyToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * ENDPOINTS PARA REEMPLAZAR LOS DUPLICADOS DE checklist.routes.js
 */

// Obtener OT pendientes por checklist específico
router.get('/pending/checklist/:checklist_id', workOrderController.getPendingWorkOrdersByChecklist);

// Obtener OT cerradas por checklist específico  
router.get('/closed/checklist/:checklist_id', workOrderController.getClosedWorkOrdersByChecklist);

// Actualizar OT específica
router.put('/:id', workOrderController.updateWorkOrder);

// Obtener OT por checklist type (ya existe pero optimizado)
router.get('/by-type/:checklist_type_id', workOrderController.getWorkOrdersByChecklistType);

// Obtener órdenes de trabajo pendientes (GENERAL)
router.get('/pending', workOrderController.getPendingWorkOrders);

// Obtener una orden de trabajo específica
router.get('/:id', workOrderController.getWorkOrderById);

// Crear una orden de trabajo manualmente
router.post('/', workOrderController.createWorkOrder);

// Cerrar una orden de trabajo (actualizado)
router.put('/:id/close', workOrderController.closeWorkOrder);

// NUEVOS ENDPOINTS PARA MANEJO DE FALLAS RECURRENTES

// Opción 1: Mantener falla recurrente (incrementar contador)
router.put('/:id/maintain', workOrderController.maintainRecurringFailure);

// Opción 2: Crear nueva falla para el mismo ítem
router.post('/new-failure', workOrderController.createNewFailureForSameItem);

// Opción 3: Resolver falla recurrente
router.put('/:id/resolve', workOrderController.resolveRecurringFailure);

// Obtener estadísticas de órdenes de trabajo
router.get('/stats/overview', workOrderController.getWorkOrderStats);

// Obtener órdenes de trabajo resueltas por checklist type
router.get('/resolved/by-type/:checklist_type_id', workOrderController.getResolvedWorkOrdersByChecklistType);

module.exports = router;
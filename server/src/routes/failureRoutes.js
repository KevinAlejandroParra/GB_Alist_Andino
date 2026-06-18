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

// GET /api/failures/suggest - Autocomplete agrupado para libro de fallas
router.get('/suggest', (req, res) => FailureController.getFailureSuggestions(req, res));

// GET /api/failures/stats - Estadísticas para gráficas del libro (filtros reactivos)
router.get('/stats', (req, res) => FailureController.getFailureBookStats(req, res));

// GET /api/failures/export/excel - Reporte gerencial Excel del libro de fallas
router.get('/export/excel', (req, res) => FailureController.exportFailuresToExcel(req, res));

// GET /api/failures/statistics - Obtener estadísticas de OF
router.get('/statistics', (req, res) => FailureController.getFailureOrderStatistics(req, res));

// GET /api/failures/inspectables-list - Listado de inspectables para selector
router.get('/inspectables-list', (req, res) => FailureController.getInspectablesList(req, res));

/**
 * RUTAS GENERALES
 */

// GET /api/failures - Obtener lista de OF con filtros
router.get('/', (req, res) => FailureController.getFailureOrders(req, res));

/**
 * RUTAS CON PARÁMETROS (DESPUÉS de las específicas)
 */

// GET /api/failures/:id/complete - Obtener detalles completos de OF con todas las relaciones
router.get('/:id/complete', (req, res) => FailureController.getFailureComplete(req, res));

// GET /api/failures/:id/linked-failures - Obtener fallas enlazadas a una WorkOrder
router.get('/:id/linked-failures', (req, res) => FailureController.getLinkedFailures(req, res));

// POST /api/failures/:id/link-work-order - Enlazar falla a OT existente (resolver duplicados)
router.post('/:id/link-work-order', (req, res) => FailureController.linkToWorkOrder(req, res));

// DELETE /api/failures/:id/unlink-work-order - Desenlazar falla de OT enlazada
router.delete('/:id/unlink-work-order', (req, res) => FailureController.unlinkFromWorkOrder(req, res));

// PUT /api/failures/:id/increment-recurrence - Incrementar contador de recurrencia
router.put('/:id/increment-recurrence', (req, res) => FailureController.incrementRecurrence(req, res));

// PATCH /api/failures/:id/assign-inspectable - Asignar o corregir inspectable de una falla
router.patch('/:id/assign-inspectable', (req, res) => FailureController.assignInspectable(req, res));

// PUT /api/failures/:id/imagen - Actualizar imagen de evidencia
router.put('/:id/imagen', upload.single('evidence'), (req, res) => FailureController.updateEvidenceImage(req, res));

// DELETE /api/failures/:id/imagen - Eliminar imagen de evidencia
router.delete('/:id/imagen', (req, res) => FailureController.deleteEvidenceImage(req, res));

// GET /api/failures/:id - Obtener detalles de OF específica
router.get('/:id', (req, res) => FailureController.getFailureOrderById(req, res));

// PUT /api/failures/:id - Actualizar OF
router.put('/:id', (req, res) => FailureController.updateFailureOrder(req, res));

// PUT /api/failures/:id/cancel - Cancelar falla (conserva historial)
router.put('/:id/cancel', (req, res) => FailureController.cancelFailureOrder(req, res));

// PUT /api/failures/:id/reactivate - Reactivar falla cancelada
router.put('/:id/reactivate', (req, res) => FailureController.reactivateFailureOrder(req, res));

// DELETE /api/failures/:id - Deshabilitado (usar cancel)
router.delete('/:id', (req, res) => FailureController.deleteFailureOrder(req, res));

/**
 * RUTAS ESPECÍFICAS PARA CHECKLISTS
 * Prefijo: /api/checklists/failures
 */

// GET /api/checklists/failures/by-type/:checklistTypeId - Obtener fallas activas por tipo de checklist
router.get('/by-type/:checklistTypeId', (req, res) => FailureController.getFailuresByChecklistType(req, res));

// GET /api/checklists/failures/resolved/by-type/:checklistTypeId - Obtener fallas resueltas por tipo de checklist
router.get('/resolved/by-type/:checklistTypeId', (req, res) => FailureController.getResolvedFailuresByChecklistType(req, res));

module.exports = router;
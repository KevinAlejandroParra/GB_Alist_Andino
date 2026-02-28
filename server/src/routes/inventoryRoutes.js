'use strict';

const express = require('express');
const InventoryController = require('../controllers/InventoryController');

const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Rutas de inventario - Coinciden con InventoryController existente
router.get('/', (req, res) => InventoryController.getInventory(req, res));
router.get('/search', (req, res) => InventoryController.searchInventory(req, res));
router.get('/part/:id', (req, res) => InventoryController.getPartById(req, res));
router.get('/statistics', (req, res) => InventoryController.getStatistics(req, res));
router.get('/low-stock-alerts', (req, res) => InventoryController.getLowStockAlerts(req, res));

// Operaciones de inventario
router.post('/use', (req, res) => InventoryController.usePart(req, res));
router.post('/add', (req, res) => InventoryController.addStock(req, res));
router.post('/transfer', (req, res) => InventoryController.transferStock(req, res));

// Actualizar metadata de un item
router.put('/:id', (req, res) => InventoryController.updateInventory(req, res));

// Rutas para gestión de repuestos en órdenes de trabajo
router.put('/:id/decrement', (req, res) => InventoryController.decrementQuantity(req, res));
router.put('/:id/increment', (req, res) => InventoryController.incrementQuantity(req, res));

// Nuevas rutas para gestión automática de inventario (integradas con InventoryController)
router.get('/check-availability', (req, res) => InventoryController.checkAvailability(req, res));
router.post('/use-part', (req, res) => InventoryController.usePartForFailure(req, res));
router.get('/usage-history', (req, res) => InventoryController.getUsageHistory(req, res));

module.exports = router;
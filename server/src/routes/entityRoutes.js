const express = require('express');
const router = express.Router();
const entityController = require('../controllers/entityController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Rutas para Entity
router.get('/', verifyToken, entityController.getAllEntities); // Obtener todas las entidades
router.get('/:id', verifyToken, entityController.getEntityById); // Obtener una entidad por ID
router.post('/', verifyToken, checkRole([1]), entityController.createEntity); // Crear una nueva entidad
router.put('/:id', verifyToken, checkRole([1]), entityController.updateEntity); // Actualizar una entidad existente
router.delete('/:id', verifyToken, checkRole([1]), entityController.deleteEntity); // Eliminar una entidad

module.exports = router;

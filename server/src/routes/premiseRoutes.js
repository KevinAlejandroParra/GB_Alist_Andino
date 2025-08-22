const express = require('express');
const router = express.Router();
const premiseController = require('../controllers/premiseController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Rutas para Premise
router.get('/',  premiseController.getAllPremises); // Obtener todas las sedes
router.get('/:id', verifyToken, premiseController.getPremiseById); // Obtener una sede por ID
router.post('/', verifyToken, checkRole([1]), premiseController.createPremise); // Crear una nueva sede
router.put('/:id', verifyToken, checkRole([1]), premiseController.updatePremise); // Actualizar una sede existente
router.delete('/:id', verifyToken, checkRole([1]), premiseController.deletePremise); // Eliminar una sede

module.exports = router;

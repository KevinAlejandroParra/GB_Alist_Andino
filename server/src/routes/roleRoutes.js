const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Rutas para Role
router.get('/', verifyToken, roleController.getAllRoles); // Obtener todos los roles
router.get('/:id', verifyToken, roleController.getRoleById); // Obtener un rol por ID
router.post('/', verifyToken, checkRole([1]), roleController.createRole); // Crear un nuevo rol
router.put('/:id', verifyToken, checkRole([1]), roleController.updateRole); // Actualizar un rol existente
router.delete('/:id', verifyToken, checkRole([1]), roleController.deleteRole); // Eliminar un rol

module.exports = router;

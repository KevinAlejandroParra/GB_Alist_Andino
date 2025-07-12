const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();


router.get('/', UserController.getUsers); // Obtener todos los usuarios
router.post('/', UserController.createUser); // Crear un usuario
router.put('/:user_id', UserController.updateUser); // Actualizar un usuario
router.delete('/:user_id', UserController.deleteUser); // Eliminar un usuario definitivamente
router.patch('/:user_id/state', UserController.changeUserState); // Cambiar el estado de un usuario temporalmente

module.exports = router;

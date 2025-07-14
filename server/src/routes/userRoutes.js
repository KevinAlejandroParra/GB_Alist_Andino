const express = require('express');
const UserController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();


router.get('/', UserController.getUsers); // Obtener todos los usuarios
router.post('/', UserController.createUser); // Crear un usuario
router.put('/:user_id', UserController.updateUser); // Actualizar un usuario
router.delete('/:user_id', UserController.deleteUser); // Eliminar un usuario definitivamente
router.patch('/:user_id/state', UserController.changeUserState); // Cambiar el estado de un usuario temporalmente
router.post('/login', UserController.loginUser); // Ruta para iniciar sesión
router.post('/logout', verifyToken, UserController.logoutUser); // Ruta para cerrar sesión
router.get('/protected', verifyToken, UserController.getProtectedData); // Ruta protegida

module.exports = router;

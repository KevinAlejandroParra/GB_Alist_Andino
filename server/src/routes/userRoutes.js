const express = require('express');
const UserController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/authMiddleware');
const upload = require('../config/userMulterConfig');

const router = express.Router();

router.get('/', verifyToken, checkRole([1]), (req, res, next) => {
    next();
}, UserController.getUsers); // Obtener todos los usuarios
router.post('/', UserController.createUser); // Crear un usuario
router.put('/:user_id', upload.single("imagen"), verifyToken, UserController.updateUser); // Actualizar un usuario
router.delete('/:user_id', UserController.deleteUser); // Eliminar un usuario definitivamente
router.patch('/:user_id/state', UserController.changeUserState); // Cambiar el estado de un usuario temporalmente
router.post('/login', UserController.loginUser); // Ruta para iniciar sesión
router.post('/logout', verifyToken, UserController.logoutUser); // Ruta para cerrar sesión
router.get('/protected', verifyToken, UserController.getProtectedData); // Ruta protegida
router.put('/:user_id/admin', verifyToken, checkRole([1]), UserController.updateUserAdmin); // Actualizar rol, sede o entidad de un usuario por administrador

// Rutas de recuperación de contraseña
router.post('/forgot-password', UserController.forgotPassword); // solicitar restablecimiento de contraseña
router.get('/verify-reset-token/:token', UserController.verifyResetTokenEndpoint); // verificar el token de restablecimiento
router.post('/reset-password', UserController.resetPassword); //restablecer la contraseña

module.exports = router;
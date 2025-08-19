const express = require('express');
const UserController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/authMiddleware');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = path.join(__dirname, "..", "..", "public", "images", "users"); 
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `user-${req.params.user_id}-${Date.now()}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const isValid = allowed.test(file.mimetype);
  isValid ? cb(null, true) : cb(new Error("Tipo de archivo no permitido"), false);
};

const upload = multer({ storage, fileFilter });

router.get('/', verifyToken, checkRole([1]), (req, res, next) => {
    next();
}, UserController.getUsers); // Obtener todos los usuarios
router.post('/', UserController.createUser); // Crear un usuario
router.put('/:user_id', upload.single("imagen"),UserController.updateUser); // Actualizar un usuario
router.delete('/:user_id', UserController.deleteUser); // Eliminar un usuario definitivamente
router.patch('/:user_id/state', UserController.changeUserState); // Cambiar el estado de un usuario temporalmente
router.post('/login', UserController.loginUser); // Ruta para iniciar sesión
router.post('/logout', verifyToken, UserController.logoutUser); // Ruta para cerrar sesión
router.get('/protected', verifyToken, UserController.getProtectedData); // Ruta protegida

module.exports = router;
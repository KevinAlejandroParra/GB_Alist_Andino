const multer = require('multer');
const path = require('path');

// Configuración específica de Multer para subida de imágenes de usuarios
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/images/users'));
  },
  filename: (req, file, cb) => {
    // Naming scheme específico para usuarios
    const ext = path.extname(file.originalname);
    const userId = req.params.user_id || 'unknown';
    const fileName = `user-${userId}-${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

// Filtro de tipos de archivo permitidos para usuarios
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const isValid = allowed.test(file.mimetype);
  isValid ? cb(null, true) : cb(new Error("Tipo de archivo no permitido. Solo se permiten: jpeg, jpg, png, gif"), false);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

module.exports = upload;
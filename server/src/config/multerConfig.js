const { uploadCloudinary } = require('./cloudinary');

// Exportamos el middleware de subida configurado con Cloudinary
// para reemplazar el uso anterior de multer local.
module.exports = uploadCloudinary;

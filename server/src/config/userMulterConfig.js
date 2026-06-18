const { uploadCloudinary } = require('./cloudinary');

// Exportamos el middleware configurado con Cloudinary
// (El storage dinámico de cloudinary.js enviará las imágenes de /users a su respectiva carpeta)
module.exports = uploadCloudinary;
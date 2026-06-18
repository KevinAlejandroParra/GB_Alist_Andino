const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuración de credenciales de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración genérica para subir imágenes a Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const year = new Date().getFullYear();
    let folderName = 'general';
    
    // Determinar la carpeta según la ruta de la petición
    if (req.originalUrl) {
      if (req.originalUrl.includes('/users')) folderName = 'users';
      else if (req.originalUrl.includes('/failures')) folderName = 'failures';
      else if (req.originalUrl.includes('/requisitions')) folderName = 'requisitions';
      else if (req.originalUrl.includes('/repairs')) folderName = 'repairs';
    }

    let folder = `alist/${folderName}/${year}`;
    
    // Convertimos a webp con calidad 70 para optimizar
    return {
      folder: folder,
      format: 'webp',
      quality: '70',
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    };
  },
});

const uploadCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  cloudinary,
  uploadCloudinary
};

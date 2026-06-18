import imageCompression from 'browser-image-compression';

/**
 * Comprime una imagen antes de subirla.
 * Se convierte a WebP con 70% de calidad para optimizar conexiones lentas.
 * @param {File} file - El archivo de imagen original.
 * @returns {Promise<File>} El archivo comprimido.
 */
export async function compressImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    return file; // Si no es imagen, se retorna tal cual (o null)
  }

  const options = {
    maxSizeMB: 1, // Tamaño máximo en MB
    maxWidthOrHeight: 1920, // Máximo de resolución (FullHD)
    useWebWorker: true,
    fileType: 'image/webp', // Convertir a WebP
    initialQuality: 0.7, // Calidad del 70%
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Preservar el nombre del archivo original pero cambiar la extensión a .webp
    const originalName = file.name.replace(/\.[^/.]+$/, ""); 
    return new File([compressedFile], `${originalName}.webp`, {
      type: 'image/webp',
    });
  } catch (error) {
    console.error('Error al comprimir la imagen:', error);
    return file; // En caso de error, enviar original para no bloquear
  }
}

'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Raíz de uploads: server/uploads/
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// Crea el directorio si no existe
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ----------------------------------------------------------------
// Storage para evidencias de FALLAS (operario al reportar)
// Destino físico: server/uploads/fallas/evidencias/
// Ruta en DB:     uploads/fallas/evidencias/<nombre_original>
// ----------------------------------------------------------------
const failureEvidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_ROOT, 'fallas', 'evidencias');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Usar el nombre original que viene del dispositivo
    cb(null, file.originalname);
  }
});

// ----------------------------------------------------------------
// Storage para evidencias de REPARACIONES (técnico en la AR)
// Destino físico: server/uploads/fallas/reparaciones/
// Ruta en DB:     uploads/fallas/reparaciones/<nombre_original>
// ----------------------------------------------------------------
const repairEvidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_ROOT, 'fallas', 'reparaciones');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

const uploadFailureEvidence = multer({
  storage: failureEvidenceStorage,
  limits: { fileSize: FILE_SIZE_LIMIT }
});

const uploadRepairEvidence = multer({
  storage: repairEvidenceStorage,
  limits: { fileSize: FILE_SIZE_LIMIT }
});

// ----------------------------------------------------------------
// Helper: convierte la ruta absoluta del archivo subido a la
// ruta relativa que se guarda en la base de datos.
// Entrada:  C:\...\server\uploads\fallas\evidencias\foto.jpg
// Salida:   uploads/fallas/evidencias/foto.jpg
// ----------------------------------------------------------------
function toRelativePath(absoluteFilePath) {
  // Normalizar separadores a /
  const normalized = absoluteFilePath.replace(/\\/g, '/');
  // El marker es la carpeta 'uploads/' dentro del path
  const marker = '/uploads/';
  const idx = normalized.indexOf(marker);
  if (idx !== -1) {
    return normalized.slice(idx + 1); // uploads/fallas/... (sin barra inicial)
  }
  // fallback: devolver el basename
  return path.basename(absoluteFilePath);
}

/**
 * Resuelve una ruta almacenada en DB a ruta absoluta en disco local.
 * Retrocompatible con /media/... y uploads/...
 */
function resolveLocalEvidencePath(storedPath) {
  if (!storedPath || storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    return null;
  }

  const normalized = storedPath.replace(/\\/g, '/');

  if (normalized.startsWith('uploads/') || normalized.startsWith('/uploads/')) {
    const rel = normalized.replace(/^\/?uploads\//, '');
    return path.join(UPLOADS_ROOT, rel);
  }

  if (normalized.startsWith('/media/') || normalized.startsWith('media/')) {
    const rel = normalized.replace(/^\/?media\//, '');
    return path.join(__dirname, '../../public/media', rel);
  }

  return null;
}

async function deleteLocalEvidenceFile(storedPath) {
  const absolutePath = resolveLocalEvidencePath(storedPath);
  if (!absolutePath) return false;

  try {
    await fs.promises.unlink(absolutePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('❌ Error eliminando archivo local:', absolutePath, err.message);
    }
    return false;
  }
}

module.exports = {
  uploadFailureEvidence,
  uploadRepairEvidence,
  toRelativePath,
  resolveLocalEvidencePath,
  deleteLocalEvidenceFile,
  UPLOADS_ROOT
};

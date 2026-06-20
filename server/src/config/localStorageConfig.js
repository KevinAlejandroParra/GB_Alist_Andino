'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeStorage(subDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_ROOT, ...subDir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });
}

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

const failureEvidenceStorage = makeStorage(['fallas', 'evidencias']);
const repairEvidenceStorage = makeStorage(['fallas', 'reparaciones']);
const deviceStorage = makeStorage(['dispositivos']);
const attractionStorage = makeStorage(['atracciones']);
const requisitionStorage = makeStorage(['requisiciones']);
const userStorage = makeStorage(['usuarios']);

const uploadFailureEvidence = multer({ storage: failureEvidenceStorage, limits: { fileSize: FILE_SIZE_LIMIT } });
const uploadRepairEvidence = multer({ storage: repairEvidenceStorage, limits: { fileSize: FILE_SIZE_LIMIT } });
const uploadDevice = multer({ storage: deviceStorage, limits: { fileSize: FILE_SIZE_LIMIT } });
const uploadAttraction = multer({ storage: attractionStorage, limits: { fileSize: FILE_SIZE_LIMIT } });
const uploadRequisition = multer({ storage: requisitionStorage, limits: { fileSize: FILE_SIZE_LIMIT } });
const uploadUser = multer({ storage: userStorage, limits: { fileSize: FILE_SIZE_LIMIT } });

function toRelativePath(absoluteFilePath) {
  const normalized = absoluteFilePath.replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.indexOf(marker);
  if (idx !== -1) {
    return normalized.slice(idx + 1);
  }
  return path.basename(absoluteFilePath);
}

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

async function deleteLocalFile(storedPath) {
  const absolutePath = resolveLocalEvidencePath(storedPath);
  if (!absolutePath) return false;
  try {
    await fs.promises.unlink(absolutePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error eliminando archivo local:', absolutePath, err.message);
    }
    return false;
  }
}

module.exports = {
  uploadFailureEvidence,
  uploadRepairEvidence,
  uploadDevice,
  uploadAttraction,
  uploadRequisition,
  uploadUser,
  toRelativePath,
  resolveLocalEvidencePath,
  deleteLocalFile,
  UPLOADS_ROOT
};

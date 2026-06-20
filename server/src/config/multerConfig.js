'use strict';

// multerConfig.js
// Default: Cloudinary (dispositivos, atracciones, requisiciones — rutas existentes).
// Evidencias de fallas/reparaciones: storage local vía exportaciones nombradas.
const { uploadCloudinary } = require('./cloudinary');
const {
  uploadFailureEvidence,
  uploadRepairEvidence,
  toRelativePath,
  resolveLocalEvidencePath,
  deleteLocalEvidenceFile
} = require('./localStorageConfig');

module.exports = uploadCloudinary;

module.exports.uploadFailureEvidence = uploadFailureEvidence;
module.exports.uploadRepairEvidence = uploadRepairEvidence;
module.exports.toRelativePath = toRelativePath;
module.exports.resolveLocalEvidencePath = resolveLocalEvidencePath;
module.exports.deleteLocalEvidenceFile = deleteLocalEvidenceFile;

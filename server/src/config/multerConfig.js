'use strict';

const {
  uploadFailureEvidence,
  uploadRepairEvidence,
  uploadDevice,
  uploadAttraction,
  uploadRequisition,
  uploadRequisitionEvidence,
  uploadMaintenanceEvidence,
  toRelativePath,
  resolveLocalEvidencePath,
  deleteLocalFile
} = require('./localStorageConfig');

module.exports = uploadDevice;

module.exports.uploadFailureEvidence = uploadFailureEvidence;
module.exports.uploadRepairEvidence = uploadRepairEvidence;
module.exports.uploadDevice = uploadDevice;
module.exports.uploadAttraction = uploadAttraction;
module.exports.uploadRequisition = uploadRequisition;
module.exports.uploadRequisitionEvidence = uploadRequisitionEvidence;
module.exports.uploadMaintenanceEvidence = uploadMaintenanceEvidence;
module.exports.toRelativePath = toRelativePath;
module.exports.resolveLocalEvidencePath = resolveLocalEvidencePath;
module.exports.deleteLocalFile = deleteLocalFile;

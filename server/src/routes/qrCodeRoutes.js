const express = require('express');
const router = express.Router();
const qrCodeController = require('../controllers/qrCodeController');
const { verifyToken } = require('../middleware/authMiddleware');

// Generar un nuevo código QR (solo admins)
router.post('/qr-codes/generate', verifyToken, qrCodeController.generateQrCode);

// Validar un código QR escaneado (sin tipo específico)
router.get('/qr-codes/validate/:qr_code', verifyToken, qrCodeController.validateQrCode);

// Validar un código QR escaneado (con tipo específico)
router.get('/qr-codes/validate/:qr_code/:checklist_type_id', verifyToken, qrCodeController.validateQrCode);

// Registrar un escaneo de código QR
router.post('/qr-codes/scan', verifyToken, qrCodeController.scanQrCode);

// Obtener todos los códigos QR (solo admins)
router.get('/qr-codes', verifyToken, qrCodeController.getAllQrCodes);

// Obtener un único código QR por ID (para descargas)
router.get('/qr-codes/:qr_id', verifyToken, qrCodeController.getQrCodeById);

// Obtener códigos QR por tipo de checklist
router.get('/qr-codes/checklist-type/:checklist_type_id', verifyToken, qrCodeController.getQrCodesByChecklistType);

// Obtener historial de escaneos para un checklist específico
router.get('/qr-codes/checklist/:checklist_id/scans', verifyToken, qrCodeController.getChecklistQrScans);

// Eliminar múltiples códigos QR (solo admins)
router.post('/qr-codes/delete-multiple', verifyToken, qrCodeController.deleteMultipleQrCodes);

// Generar códigos QR para particiones específicas de items padre (solo admins)
router.post('/qr-codes/generate-partitioned', verifyToken, qrCodeController.generatePartitionedQrCodes);

// Obtener información de autorización QR para un checklist específico
router.get('/qr-codes/checklist/:checklist_id/authorization', verifyToken, qrCodeController.getQrAuthorizationInfo);

// Validar código QR específico para un checklist
router.get('/qr-codes/checklist/:checklist_id/validate/:qr_code', verifyToken, qrCodeController.validateQrCodeForChecklist);

// Generar PDF para impresión de códigos QR (solo admins)
router.post('/qr-codes/generate-pdf', verifyToken, qrCodeController.generatePrintPdf);

module.exports = router;
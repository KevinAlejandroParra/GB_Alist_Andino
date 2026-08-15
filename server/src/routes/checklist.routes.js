const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const { uploadFailureEvidence, toRelativePath } = require("../config/multerConfig")
const {
  ensureChecklistInstance,
  getLatestChecklist,
  createChecklist,
  submitResponses,
  updateWorkOrder,
  listObservations,
  signChecklist,
  getChecklistHistory,
  downloadChecklistPDF,
  getChecklistByType,
  getLatestChecklistByType,
  getChecklistHistoryByType,
  getChecklistById,
  getPendingFailures,
  getClosedFailures,
  getWorkOrdersByChecklistType,
  getResolvedFailuresByChecklistType,
  getChecklistTypeDetails,
  getParentItemsByChecklistType,
  getPendingRequisitionsByChecklist,
  getOperationChecklistsWithFailures,
  deleteChecklist,
  savePremiosConfig,
  getPremiosConfig,
  getPremiosAnalytics,
  exportPremiosAnalytics
} = require("../controllers/checklistController")

// Rutas genéricas para checklists
router.post("/:inspectableId/ensure", verifyToken, ensureChecklistInstance)
router.get("/:inspectableId/latest", verifyToken, getLatestChecklist)
router.get("/:inspectableId/history", verifyToken, getChecklistHistory)
router.get("/type/:checklistTypeId", verifyToken, getChecklistByType)
router.get("/type/:checklistTypeId/latest", verifyToken, getLatestChecklistByType)
router.get("/type/:checklistTypeId/create", verifyToken, createChecklist)
router.get("/type/:checklistTypeId/history", verifyToken, getChecklistHistoryByType)
router.get("/type/:checklistTypeId/details", verifyToken, getChecklistTypeDetails)
router.get("/type/:checklistTypeId/parent-items", verifyToken, getParentItemsByChecklistType)

// Rutas para respuestas, fallas, etc.
router.get("/:id", verifyToken, getChecklistById) // Nueva ruta para obtener checklist por ID
router.post("/:id/responses", verifyToken, submitResponses)
router.get("/failures/pending/:checklist_id", verifyToken, getPendingFailures)
router.get("/failures/closed/:checklist_id", verifyToken, getClosedFailures)
router.get("/failures/by-type/:checklist_type_id", verifyToken, getWorkOrdersByChecklistType)
router.get("/failures/resolved/by-type/:checklist_type_id", verifyToken, getResolvedFailuresByChecklistType)
router.put("/failures/:id", verifyToken, updateWorkOrder)
router.get("/:id/observations", verifyToken, listObservations)
router.post("/:id/sign", verifyToken, signChecklist)
router.get("/:id/download", verifyToken, downloadChecklistPDF)
router.get("/:id/download-pdf", verifyToken, downloadChecklistPDF)
router.get("/:id/pending-requisitions", verifyToken, getPendingRequisitionsByChecklist)
router.get("/:id/operation-failures", verifyToken, getOperationChecklistsWithFailures)
router.delete("/:id", verifyToken, deleteChecklist)


// Rutas de análisis de premios
router.get("/type/:checklistTypeId/analytics/premios", verifyToken, getPremiosAnalytics)
router.get("/type/:checklistTypeId/analytics/premios/export", verifyToken, exportPremiosAnalytics)
router.get("/type/:checklistTypeId/premios-config", verifyToken, getPremiosConfig)
router.post("/type/:checklistTypeId/premios-config", verifyToken, savePremiosConfig)

router.post("/upload-evidence", verifyToken, uploadFailureEvidence.single("evidence"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo" })
    }

    // Ruta relativa en DB: uploads/fallas/evidencias/<nombre_original>
    const filePath = toRelativePath(req.file.path)

    res.json({
      message: "Archivo subido exitosamente",
      filePath,
      originalName: req.file.originalname,
    })
  } catch (error) {
    console.error("Error uploading evidence:", error)
    res.status(500).json({ error: "Error interno del servidor al subir archivo" })
  }
})

module.exports = router

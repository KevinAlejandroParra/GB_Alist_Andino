const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const upload = require("../config/multerConfig")

// Importar rutas de checklist de familia
const familyChecklistRoutes = require('./familyChecklist.routes')

// Usar las rutas de checklist de familia
router.use('/', familyChecklistRoutes)
const {
  ensureChecklistInstance,
  getLatestChecklist,
  createChecklist,
  submitResponses,
  updateFailure,
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
  getFailuresByChecklistType,
  getChecklistTypeDetails // Importar el nuevo controlador
} = require("../controllers/checklistController")

// Importar funciones de diagnóstico (temporal para debugging)
const { diagnoseChecklists, fixProblematicChecklists } = require("../utils/diagnose-checklists")

// Rutas genéricas para checklists
router.post("/:inspectableId/ensure", verifyToken, ensureChecklistInstance)
router.get("/:inspectableId/latest", verifyToken, getLatestChecklist)
router.get("/:inspectableId/history", verifyToken, getChecklistHistory)
router.get("/type/:checklistTypeId", verifyToken, getChecklistByType) // Nueva ruta para obtener checklist por tipo
router.get("/type/:checklistTypeId/latest", verifyToken, getLatestChecklistByType)
router.get("/type/:checklistTypeId/create", verifyToken, createChecklist) // Nueva ruta para crear instancias
router.get("/type/:checklistTypeId/history", verifyToken, getChecklistHistoryByType) // Nueva ruta para el historial por tipo
router.get("/type/:checklistTypeId/details", verifyToken, getChecklistTypeDetails) // Nueva ruta para obtener detalles del tipo de checklist

// Rutas para respuestas, fallas, etc.
router.get("/:id", verifyToken, getChecklistById) // Nueva ruta para obtener checklist por ID
router.post("/:id/responses", verifyToken, submitResponses)
router.get("/failures/pending/:checklist_id", verifyToken, getPendingFailures)
router.get("/failures/closed/:checklist_id", verifyToken, getClosedFailures)
router.get("/failures/by-type/:checklist_type_id", verifyToken, getFailuresByChecklistType) // Nueva ruta para fallas por tipo
router.put("/failures/:id", verifyToken, updateFailure)
router.get("/:id/observations", verifyToken, listObservations)
router.post("/:id/sign", verifyToken, signChecklist)
router.get("/:id/download-pdf", verifyToken, downloadChecklistPDF)


// Rutas de diagnóstico (temporal para debugging)
router.get("/diagnose", async (req, res) => {
  try {
    await diagnoseChecklists()
    res.json({ message: "Diagnóstico completado. Revisa la consola del servidor." })
  } catch (error) {
    console.error("Error en diagnóstico:", error)
    res.status(500).json({ error: "Error en diagnóstico", details: error.message })
  }
})

router.post("/fix-checklists", async (req, res) => {
  try {
    await fixProblematicChecklists()
    res.json({ message: "Corrección de checklists completada. Revisa la consola del servidor." })
  } catch (error) {
    console.error("Error corrigiendo checklists:", error)
    res.status(500).json({ error: "Error corrigiendo checklists", details: error.message })
  }
})

router.post("/upload-evidence", verifyToken, upload.single("evidence"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo" })
    }

    // Construir la ruta relativa del archivo
    const filePath = `/media/${req.file.filename}`

    res.json({
      message: "Archivo subido exitosamente",
      filePath: filePath,
      originalName: req.file.originalname,
    })
  } catch (error) {
    console.error("Error uploading evidence:", error)
    res.status(500).json({ error: "Error interno del servidor al subir archivo" })
  }
})

module.exports = router

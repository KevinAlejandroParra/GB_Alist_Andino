const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const upload = require("../config/multerConfig")
const {
  ensureChecklistInstance,
  getLatestChecklist,
  submitResponses,
  updateFailure,
  listObservations,
  signChecklist,
  getChecklistHistory,
  downloadChecklistPDF,
} = require("../controllers/checklistController")

// Rutas genéricas para checklists
router.post("/:inspectableId/ensure", verifyToken, ensureChecklistInstance)
router.get("/:inspectableId/latest", verifyToken, getLatestChecklist)
router.get("/:inspectableId/history", verifyToken, getChecklistHistory)

// Rutas para respuestas, fallas, etc. 
router.post("/:id/responses", verifyToken, submitResponses)
router.put("/failures/:id", verifyToken, updateFailure)
router.get("/:id/observations", verifyToken, listObservations)
router.post("/:id/sign", verifyToken, signChecklist)
router.get("/:id/download-pdf", verifyToken, downloadChecklistPDF)


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

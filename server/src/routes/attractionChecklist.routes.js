const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const upload = require("../config/multerConfig") 
const {
  ensureDailyInstance,
  getDailyChecklist,
  submitResponses,
  updateFailure,
  listObservations,
  signChecklist,
  listChecklistsByAttraction,
} = require("../controllers/attractionChecklistController")

// Rutas existentes para el checklist de atracciones
router.post("/:id/checklist/ensure", verifyToken, ensureDailyInstance)
router.get("/:id/checklist/daily", verifyToken, getDailyChecklist)
router.post("/checklists/:id/responses", verifyToken, submitResponses)
router.put("/failures/:id", verifyToken, updateFailure)
router.get("/checklists/:id/observations", verifyToken, listObservations)
router.post("/checklists/:id/sign", verifyToken, signChecklist)
router.get("/:id/checklists/history", verifyToken, listChecklistsByAttraction)

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

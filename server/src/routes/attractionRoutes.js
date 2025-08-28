const express = require("express");
const router = express.Router();
const attractionController = require("../controllers/attractionController");
const upload = require("../config/multerConfig"); 

// Rutas para Attraction
router.get("/", attractionController.getAllAttractions);
router.get("/:id", attractionController.getAttractionById);
router.post("/", upload.single('photo'), attractionController.createAttraction);
router.put("/:id", upload.single('photo'), attractionController.updateAttraction); 
router.delete("/:id", attractionController.deleteAttraction);

module.exports = router;

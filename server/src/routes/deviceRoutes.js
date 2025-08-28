const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const upload = require("../config/multerConfig"); 

// Rutas para Device
router.get("/", deviceController.getAllDevices);
router.get("/:id", deviceController.getDeviceById);
router.post("/", upload.single('photo'), deviceController.createDevice); 
router.put("/:id", upload.single('photo'), deviceController.updateDevice); 
router.delete("/:id", deviceController.deleteDevice);

module.exports = router;

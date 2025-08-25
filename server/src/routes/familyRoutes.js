const express = require("express");
const router = express.Router();
const familyController = require("../controllers/familyController");

// Rutas para Family
router.get("/", familyController.getAllFamilies);
router.get("/:id", familyController.getFamilyById);
router.post("/", familyController.createFamily);
router.put("/:id", familyController.updateFamily);
router.put("/:id/soft", familyController.deleteFamily);

module.exports = router;

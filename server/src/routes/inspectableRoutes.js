
const express = require("express");
const router = express.Router();
const inspectableController = require("../controllers/inspectableController");

router.get("/", inspectableController.getAllInspectables);
router.get(
    "/premises-with-inspectables",
    inspectableController.getPremisesWithInspectables
);

module.exports = router;

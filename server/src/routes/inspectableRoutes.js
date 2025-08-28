
const express = require("express");
const router = express.Router();
const inspectableController = require("../controllers/inspectableController");

router.get(
    "/premises-with-inspectables",
    inspectableController.getPremisesWithInspectables
);

module.exports = router;

const express = require("express");
const router = express.Router();
const confirmController = require("../controllers/confirmController");

// Confirm API route
router.post("/", confirmController.processConfirmRequest);

module.exports = router;
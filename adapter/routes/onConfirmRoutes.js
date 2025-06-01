const express = require("express");
const router = express.Router();
const onConfirmController = require("../controllers/onConfirmController");

// On_Confirm API route
router.post("/", onConfirmController.handleOnConfirmRequest);

module.exports = router;
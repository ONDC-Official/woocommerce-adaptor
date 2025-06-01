const express = require("express");
const router = express.Router();
const onInitController = require("../controllers/onInitController");

// On_Init API route
router.post("/", onInitController.handleOnInitRequest);

module.exports = router;
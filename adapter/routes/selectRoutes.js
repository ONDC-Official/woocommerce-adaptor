const express = require("express");
const router = express.Router();
const selectController = require("../controllers/selectController");

router.post("/", selectController.handleSelectRequest);

module.exports = router;
const express = require("express");
const statusController = require("../controllers/statusController");
const router = express.Router();

router.post("/", statusController.handleStatusRequest);

module.exports = router;
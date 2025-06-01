const express = require("express");
const router = express.Router();
const { handleUpdateRequest } = require("../controllers/updateController");

router.post("/", handleUpdateRequest);

module.exports = router;
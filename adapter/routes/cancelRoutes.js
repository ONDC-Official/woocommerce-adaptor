const express = require('express');
const router = express.Router();
const cancelController = require('../controllers/cancelController');

// ONDC /cancel endpoint
router.post('/', cancelController.processCancelRequest);

module.exports = router;
const express = require('express');
const router = express.Router();
const onCancelController = require('../controllers/onCancelController');

// ONDC /on_cancel endpoint
router.post('/', onCancelController.processOnCancelRequest);

module.exports = router;
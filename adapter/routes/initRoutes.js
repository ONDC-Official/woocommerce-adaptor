const express = require('express');
const { processInitRequest } = require('../controllers/initController');

const router = express.Router();

router.post('/', processInitRequest);

module.exports = router;

const express = require('express');
const logger = require('./logger');

const handleWebhookError = (err, req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    logger.error('Webhook error', {
      path: req.path,
      error: err.message,
      stack: err.stack
    });
    
    return res.status(500).json({
      message: {
        ack: { status: "NACK" }
      }
    });
  }
  next(err);
};

module.exports = handleWebhookError;
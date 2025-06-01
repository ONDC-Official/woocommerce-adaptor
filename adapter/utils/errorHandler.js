const logger = require('./logger');

class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('API Error', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    rawBody: req.rawBody
  });

  // Send error response
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    }
  });
};

const handleError = (res, error, customMessage) => {
  logger.error(`${customMessage}: ${error.message}`, { stack: error.stack });
  res.status(500).json({ error: customMessage });
};

module.exports = {
  ApiError,
  errorHandler,
  handleError
};
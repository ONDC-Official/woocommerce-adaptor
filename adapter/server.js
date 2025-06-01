require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const wooCommerceAPI = require('./utils/wooCommerceAPI');
const config = require('./utils/config');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');
const { verifyAuthentication } = require('./auth/authMiddleware');
const webhookController = require('./controllers/webhookController');

// Import routes
const selectRoutes = require("./routes/selectRoutes");
const searchRoutes = require("./routes/searchRoutes");
const statusRoutes = require("./routes/statusRoutes");
const updateRoutes = require("./routes/updateRoutes");
const initRoutes = require('./routes/initRoutes');
const onInitRoutes = require('./routes/onInitRoutes');
const confirmRoutes = require('./routes/confirmRoutes');
const onConfirmRoutes = require('./routes/onConfirmRoutes');
const productRoutes = require('./routes/productRoutes');
const cancelRoutes = require('./routes/cancelRoutes');
const onCancelRoutes = require('./routes/onCancelRoutes');

// Initialize Express app
const app = express();

// Apply security middleware
app.use(helmet());
app.use(cors());

// Update the body parser configuration
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      req.rawBody = buf.toString();
      if (!req.rawBody) {
        throw new Error('Empty request body');
      }
      // Verify JSON parsing
      JSON.parse(req.rawBody);
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: config.server.bodyLimit 
}));
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  } 
}));

// Add request logging middleware
app.use((req, res, next) => {
  if (req.method === 'POST') {
    logger.info('Received request', {
      path: req.path,
      method: req.method,
      body: req.body,
      headers: req.headers
    });
  }
  next();
});

// Apply authentication middleware if enabled
if (config.server.enableAuthentication) {
  app.use(verifyAuthentication);
  logger.info('ONDC Authentication middleware enabled');
} else {
  logger.warn('ONDC Authentication middleware is DISABLED - not recommended for production');
}

// Test WooCommerce connection on startup
(async function testWooCommerceConnection() {
  try {
    const isConnected = await wooCommerceAPI.testConnection();
    if (isConnected) {
      logger.info('WooCommerce API connection verified successfully');
    } else {
      logger.error('WooCommerce API connection failed. Application may not function correctly.');
    }
  } catch (error) {
    logger.error('Error testing WooCommerce connection', {
      error: error.message,
      stack: error.stack
    });
  }
})();
// API routes
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/select", selectRoutes);
app.use("/api/v1/status", statusRoutes);
app.use("/api/v1/update", updateRoutes);
app.use('/api/v1/init', initRoutes);
app.use('/api/v1/on_init', onInitRoutes);
app.use('/api/v1/confirm', confirmRoutes);
app.use('/api/v1/on_confirm', onConfirmRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cancel', cancelRoutes);
app.use('/api/v1/on_cancel', onCancelRoutes);

// Add webhook routes
app.post('/webhook/on_init', webhookController.handleOnInit);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Update error handling middleware
app.use((err, req, res, next) => {
  logger.error('Request processing error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    body: req.rawBody || req.body
  });

  // Send NACK for API errors
  res.status(500).json({
    message: {
      ack: { status: "NACK" }
    },
    error: {
      type: "Internal Server Error",
      code: "500",
      message: err.message
    }
  });
});

// Start the server
const PORT = config.server.port || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`ONDC Connector initialized with endpoints:`);
  logger.info(`- /search`);
  logger.info(`- /select`);
  logger.info(`- /status`);
  logger.info(`- /update`);
  logger.info(`- /api/v1/init`);
  logger.info(`- /api/v1/on_init`);
  logger.info(`- /api/v1/confirm`);
  logger.info(`- /api/v1/on_confirm`);
  logger.info(`- /api/v1/products`);
  logger.info(`- /api/v1/cancel`);
  logger.info(`- /api/v1/on_cancel`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
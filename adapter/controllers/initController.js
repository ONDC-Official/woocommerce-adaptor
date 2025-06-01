const logger = require('../utils/logger');
const initService = require('../services/initService');
const { ApiError } = require('../utils/errorHandler');

const processInitRequest = async (req, res, next) => {
  const transactionId = req.body?.context?.transaction_id || 'unknown';
  
  try {
    logger.info('Received ONDC init request', { 
      transactionId,
      messageId: req.body?.context?.message_id,
      domain: req.body?.context?.domain
    });

    // Validate request
    if (!req.body?.context || !req.body?.message?.order) {
      throw new ApiError('Invalid request format', 400);
    }

    // Send immediate ACK
    res.status(202).json({
      message: {
        ack: { status: "ACK" }
      }
    });

    // Process asynchronously with Promise
    Promise.resolve().then(async () => {
      try {
        logger.info('Starting async init processing', { transactionId });
        
        // Process with retry limit
        const maxRetries = 3;
        let retryCount = 0;
        let lastError;

        while (retryCount < maxRetries) {
          try {
            const ondcResponse = await initService.processInit(req.body);
            const onInitService = require('../services/onInitService');
            await onInitService.sendOnInitCallback(ondcResponse);
            
            logger.info('Init request processed successfully', {
              transactionId,
              orderId: ondcResponse.message.order.id,
              attempt: retryCount + 1
            });
            return;
          } catch (error) {
            lastError = error;
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }

        throw lastError;
      } catch (asyncError) {
        logger.error('Final async processing error', {
          transactionId,
          error: asyncError.message,
          stack: asyncError.stack
        });
      }
    }).catch(error => {
      logger.error('Unhandled promise rejection', {
        transactionId,
        error: error.message
      });
    });

  } catch (error) {
    logger.error('Init request error', {
      transactionId,
      error: error.message
    });
    next(error);
  }
};

module.exports = { processInitRequest };
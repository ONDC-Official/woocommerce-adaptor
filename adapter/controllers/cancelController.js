const cancelService = require('../services/cancelService');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errorHandler');
const { cancelRequestSchema } = require('../models/cancel');

/**
 * Process ONDC cancel request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const processCancelRequest = async (req, res, next) => {
  const transactionId = req.body?.context?.transaction_id || 'unknown';
  const messageId = req.body?.context?.message_id || 'unknown';
  
  try {
    logger.info('Received ONDC cancel request', { 
      transactionId,
      messageId,
      domain: req.body?.context?.domain,
      city: req.body?.context?.city,
      orderId: req.body?.message?.order_id
    });

    // Log full payload for debugging
    logger.debug('Cancel request payload', {
      transactionId,
      payload: JSON.stringify(req.body)
    });
    
    // Validate request body using Joi schema
    const { error } = cancelRequestSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      logger.warn('Validation error in cancel request', { 
        transactionId,
        error: errorMessages
      });
      throw new ApiError(`Validation error: ${errorMessages}`, 400);
    }
    
    logger.info('Cancel request validation passed, processing request', { 
      transactionId,
      orderId: req.body.message.order_id
    });
    
    // Send ACK response immediately
    res.status(202).json({
      message: {
        ack: {
          status: "ACK"
        }
      }
    });
    
    // Process the cancel request asynchronously
    processCancelAsync(req.body)
      .catch(error => {
        logger.error('Unhandled error in async cancel processing', {
          transactionId,
          error: error.message,
          stack: error.stack
        });
      });
    
  } catch (error) {
    logger.error('Error processing ONDC cancel request', { 
      transactionId, 
      error: error.message,
      stack: error.stack
    });
    
    // If it's not an ApiError, convert it to one with a 500 status code
    if (!error.status) {
      error = new ApiError(`Internal server error: ${error.message}`, 500);
    }
    
    next(error);
  }
};

/**
 * Process cancel request asynchronously
 * @param {Object} request - ONDC cancel request
 * @returns {Promise<void>}
 */
const processCancelAsync = async (request) => {
  const { context } = request;
  const transactionId = context.transaction_id;
  const orderId = request.message.order_id;
  const cancellationReasonId = request.message.cancellation_reason_id;
  
  // Get fulfillment ID either from descriptor.short_desc or default to order ID
  // In ONDC, if descriptor.short_desc is not provided, it's a full order cancellation
  const fulfillmentId = request.message.descriptor?.short_desc || orderId;

  // Add retry mechanism for validation
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError = null;
  
  try {
    logger.info('Starting async processing of cancel request', { 
      transactionId, 
      orderId,
      cancellationReasonId,
      fulfillmentId
    });

    // Retry validation a few times in case of temporary issues
    let validationResult;
    let success = false;
    
    while (retryCount < MAX_RETRIES && !success) {
      try {
        validationResult = await cancelService.validateCancellation(
          orderId, 
          cancellationReasonId, 
          fulfillmentId,
          context
        );
        
        success = true;
      } catch (error) {
        lastError = error;
        retryCount++;
        logger.warn(`Validation attempt ${retryCount} failed`, {
          transactionId,
          orderId,
          error: error.message
        });
        
        if (retryCount < MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    }
    
    // If we couldn't validate after all retries
    if (!success) {
      throw lastError || new Error('Validation failed after maximum retries');
    }

    // If validation failed for a legitimate reason
    if (!validationResult.valid) {
      logger.warn('Cancellation validation failed', {
        transactionId,
        orderId,
        reason: validationResult.reason,
        errorCode: validationResult.errorCode
      });
      
      // If it's a "final" failure that won't be fixed with retries, return
      if (validationResult.finalFailure) {
        return;
      }
      
      // Otherwise try again in case it's a temporary issue
      throw new Error(`Validation failed: ${validationResult.reason}`);
    }
    
    // Process the cancellation
    const ondcResponse = await cancelService.processCancellation(
      orderId,
      cancellationReasonId,
      fulfillmentId,
      context
    );
    
    logger.info('Successfully processed cancel request, sending on_cancel callback', { 
      transactionId,
      orderId,
      cancellationReasonId
    });
    
    // Send the on_cancel callback
    const callbackResult = await cancelService.sendOnCancelCallback(ondcResponse);
    
    logger.info('Completed async processing of cancel request', { 
      transactionId,
      orderId,
      callbackSuccess: callbackResult
    });
  } catch (error) {
    // Add more error context
    const errorContext = {
      transactionId,
      orderId,
      retryAttempts: retryCount,
      errorType: error.name,
      errorCode: error.code,
      error: error.message,
      stack: error.stack
    };
    
    logger.error('Error in async processing of cancel request', errorContext);
    
    // Try one more time with direct cancel approach as a fallback
    try {
      logger.info('Attempting fallback direct cancellation', {
        transactionId,
        orderId
      });
      
      // This is our last attempt - try to directly cancel in WooCommerce
      // without all the validation and extra steps
      const wooCommerceAPI = require('../utils/wooCommerceAPI');
      
      // Try to find and cancel the order directly
      await wooCommerceAPI.updateOrder(orderId, {
        status: 'cancelled',
        customer_note: 'Emergency cancellation due to system error: ' + error.message
      });
      
      logger.info('Fallback direct cancellation succeeded', {
        transactionId,
        orderId
      });
    } catch (fallbackError) {
      logger.error('Fallback direct cancellation also failed', {
        transactionId,
        orderId,
        error: fallbackError.message
      });
    }
  }
};

module.exports = {
  processCancelRequest
};
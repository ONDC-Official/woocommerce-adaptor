const cancelService = require('../services/cancelService');
const onCancelService = require('../services/onCancelService');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errorHandler');
const { onCancelRequestSchema } = require('../models/cancel');
const wooCommerceAPI = require('../utils/wooCommerceAPI');

/**
 * Process ONDC on_cancel request
 * For seller-initiated cancellations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const processOnCancelRequest = async (req, res, next) => {
  const transactionId = req.body?.context?.transaction_id || 'unknown';
  const messageId = req.body?.context?.message_id || 'unknown';
  
  try {
    logger.info('Received direct ONDC on_cancel request', { 
      transactionId,
      messageId,
      domain: req.body?.context?.domain,
      city: req.body?.context?.city
    });
    
    // Validate request body using Joi schema
    const { error } = onCancelRequestSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      logger.warn('Validation error in on_cancel request', { 
        transactionId,
        error: errorMessages
      });
      throw new ApiError(`Validation error: ${errorMessages}`, 400);
    }
    
    logger.info('On_cancel request validation passed, processing request', { transactionId });
    
    // Find the order in WooCommerce
    const { message } = req.body;
    const ondcOrderId = message.order.id;
    
    // Find order by ONDC order ID
    const orders = await wooCommerceAPI.getOrders({
      meta_key: 'ondc_order_id',
      meta_value: ondcOrderId
    });
    
    if (!orders || orders.length === 0) {
      throw new ApiError(`No order found with ID: ${ondcOrderId}`, 404);
    }
    
    const order = orders[0];
    
    // Validate order state for cancellation
    await onCancelService.validateOrderForCancellation(order, transactionId);
    
    // Process the seller-initiated cancellation
    const result = await onCancelService.processSellerCancellation(
      order,
      message.order.cancellation,
      req.body.context
    );
    
    logger.info('Successfully processed seller-initiated cancellation', {
      transactionId,
      orderId: ondcOrderId,
      wooOrderId: order.id
    });
    
    // Send ACK response immediately
    res.status(202).json({
      message: {
        ack: {
          status: "ACK"
        }
      }
    });
    
    // Process callback asynchronously
    onCancelService.sendCancellationCallback(result, req.body.context)
      .catch(error => {
        logger.error('Error sending cancellation callback', {
          transactionId,
          error: error.message,
          stack: error.stack
        });
      });
    
  } catch (error) {
    logger.error('Error processing ONDC on_cancel request', { 
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

module.exports = {
  processOnCancelRequest
};
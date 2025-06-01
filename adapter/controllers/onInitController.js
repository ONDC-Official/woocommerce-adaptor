const initService = require('../services/initService');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errorHandler');

/**
 * Handle ONDC on_init request
 * This endpoint is typically not used in the async pattern, but provided for completeness
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleOnInitRequest = async (req, res, next) => {
  const transactionId = req.body?.context?.transaction_id || 'unknown';
  const messageId = req.body?.context?.message_id || 'unknown';
  
  try {
    logger.info('Received direct ONDC on_init request', { 
      transactionId,
      messageId
    });
    
    // This endpoint is not meant to be called directly in the async pattern
    // We're providing it for compatibility, but logging a warning
    logger.warn('Direct on_init endpoint called - this is unusual in async pattern', {
      transactionId
    });
    
    // Look up the order by transaction ID
    const order = await lookupOrderByTransactionId(transactionId);
    
    if (!order) {
      throw new ApiError(`No order found for transaction ID: ${transactionId}`, 404);
    }
    
    // Map WooCommerce order to ONDC on_init format
    const ondcResponse = initService.mapWooCommerceResponseToOndc(order, req.body.context);
    
    logger.info('Sending direct on_init response', {
      transactionId,
      ondcOrderId: ondcResponse.message.order.id
    });
    
    res.json(ondcResponse);
  } catch (error) {
    logger.error('Error handling direct on_init request', {
      transactionId,
      error: error.message,
      stack: error.stack
    });
    
    next(error);
  }
};

/**
 * Look up WooCommerce order by ONDC transaction ID
 * @param {string} transactionId - ONDC transaction ID
 * @returns {Promise<Object|null>} WooCommerce order object or null if not found
 */
const lookupOrderByTransactionId = async (transactionId) => {
  try {
    // Implement logic to look up order by transaction ID
    // This could use wooCommerceAPI.getOrders() with meta_data filtering
    // For this example, we'll return a placeholder
    return null;
  } catch (error) {
    logger.error('Error looking up order by transaction ID', {
      transactionId,
      error: error.message
    });
    return null;
  }
};

module.exports = {
  handleOnInitRequest
};
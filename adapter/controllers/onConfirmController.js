const confirmService = require('../services/confirmService');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errorHandler');
const wooCommerceAPI = require('../utils/wooCommerceAPI');

/**
 * Handle ONDC on_confirm request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleOnConfirmRequest = async (req, res, next) => {
  const transactionId = req.body?.context?.transaction_id || 'unknown';
  const messageId = req.body?.context?.message_id || 'unknown';
  
  try {
    logger.info('Received direct ONDC on_confirm request', { 
      transactionId,
      messageId
    });
    
    // This endpoint is not meant to be called directly in the async pattern
    logger.warn('Direct on_confirm endpoint called - this is unusual in async pattern', {
      transactionId
    });
    
    // Look up the order by transaction ID
    const orders = await wooCommerceAPI.getOrders({
      meta_key: 'ondc_transaction_id',
      meta_value: transactionId
    });
    
    if (!orders || orders.length === 0) {
      throw new ApiError(`No order found for transaction ID: ${transactionId}`, 404);
    }
    
    const order = orders[0];
    
    // Map WooCommerce order to ONDC on_confirm format
    const ondcResponse = confirmService.mapWooCommerceToOnConfirm(order, req.body.context);
    
    logger.info('Sending direct on_confirm response', {
      transactionId,
      ondcOrderId: ondcResponse.message.order.id
    });
    
    res.json(ondcResponse);
  } catch (error) {
    logger.error('Error handling direct on_confirm request', {
      transactionId,
      error: error.message,
      stack: error.stack
    });
    
    next(error);
  }
};

module.exports = {
  handleOnConfirmRequest
};
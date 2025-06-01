const logger = require('../utils/logger');
const { ApiError } = require('../utils/errorHandler');
const wooCommerceAPI = require('../utils/wooCommerceAPI');
const callbackHandler = require('../utils/callbackHandler');
const rtoHandler = require('../utils/rtoHandler');
const cancelService = require('./cancelService');

/**
 * Validate order state for cancellation
 * @param {Object} order - WooCommerce order
 * @param {string} transactionId - ONDC transaction ID
 * @returns {Promise<boolean>} Whether order can be cancelled
 */
const validateOrderForCancellation = async (order, transactionId) => {
  try {
    // Check if order is already cancelled
    if (order.status === 'cancelled') {
      logger.warn('Order is already cancelled', {
        orderId: order.id,
        transactionId
      });
      return true; // Allow idempotent operation
    }
    
    // Check if order is in a cancellable state
    const cancellableStates = ['pending', 'processing', 'on-hold'];
    
    if (!cancellableStates.includes(order.status)) {
      throw new ApiError(`Order in non-cancellable state: ${order.status}`, 400);
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating order for cancellation', {
      error: error.message,
      orderId: order.id,
      transactionId
    });
    throw error;
  }
};

/**
 * Process seller-initiated cancellation
 * @param {Object} order - WooCommerce order
 * @param {Object} cancellation - ONDC cancellation object
 * @param {Object} context - ONDC context
 * @returns {Promise<Object>} Cancellation result
 */
const processSellerCancellation = async (order, cancellation, context) => {
  try {
    const transactionId = context.transaction_id;
    const reasonId = cancellation.reason.id;
    const cancelledBy = cancellation.cancelled_by || context.bpp_id;
    
    logger.info('Processing seller-initiated cancellation', {
      orderId: order.id,
      transactionId,
      reasonId,
      cancelledBy
    });
    
    // Update order status to cancelled
    const updatedOrder = await wooCommerceAPI.updateOrder(order.id, {
      status: 'cancelled',
      meta_data: [
        { key: 'ondc_order_state', value: 'Cancelled' },
        { key: 'ondc_cancellation_reason', value: reasonId },
        { key: 'ondc_cancelled_by', value: cancelledBy },
        { key: 'ondc_cancellation_time', value: new Date().toISOString() }
      ]
    });
    
    // Check if this is an RTO cancellation
    const isRTO = cancelService.isRTOCancellation(order, reasonId);
    
    // If RTO, handle special RTO flow
    if (isRTO) {
      await rtoHandler.handleRTOCancellation(updatedOrder, reasonId, context);
    }
    
    // Generate cancellation response
    const ondcResponse = await cancelService.generateOnCancelResponse(updatedOrder, reasonId, context);
    
    return ondcResponse;
  } catch (error) {
    logger.error('Error processing seller-initiated cancellation', {
      error: error.message,
      orderId: order.id,
      transactionId: context.transaction_id,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Send cancellation callback to BAP
 * @param {Object} ondcResponse - ONDC on_cancel response
 * @param {Object} context - ONDC context
 * @returns {Promise<boolean>} Success status
 */
const sendCancellationCallback = async (ondcResponse, context) => {
  return await cancelService.sendOnCancelCallback(ondcResponse);
};

module.exports = {
  validateOrderForCancellation,
  processSellerCancellation,
  sendCancellationCallback
};
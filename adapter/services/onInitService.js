const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { ApiError } = require('../utils/errorHandler');
const wooCommerceAPI = require('../utils/wooCommerceAPI');

/**
 * Send on_init callback to BAP (Buyer App)
 * This handles the asynchronous response pattern for ONDC
 * @param {Object} ondcResponse - ONDC formatted on_init response
 * @returns {Promise<boolean>} Success status of the callback
 */
const sendOnInitCallback = async (ondcResponse) => {
  try {
    const { context } = ondcResponse;
    
    logger.info('Sending on_init callback to BAP', {
      transactionId: context.transaction_id,
      messageId: context.message_id,
      bapUri: context.bap_uri
    });
    
    // Form the callback URL
    const callbackUrl = `${context.bap_uri}/on_init`;
    
    // Send the callback
    const response = await axios.post(callbackUrl, ondcResponse, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ondc.authToken}` // Configure this in your config.js
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    logger.info('Successfully sent on_init callback to BAP', {
      transactionId: context.transaction_id,
      messageId: context.message_id,
      statusCode: response.status
    });
    
    // Record the callback success in the order if possible
    await recordCallbackStatus(context.transaction_id, 'on_init', true);
    
    return true;
  } catch (error) {
    const { context } = ondcResponse;
    
    logger.error('Error sending on_init callback to BAP', {
      transactionId: context?.transaction_id,
      messageId: context?.message_id,
      error: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    // Record the callback failure in the order
    await recordCallbackStatus(context.transaction_id, 'on_init', false, error.message);
    
    return false;
  }
};

/**
 * Record callback status in the order metadata
 * @param {string} transactionId - ONDC transaction ID
 * @param {string} callbackType - Type of callback (e.g., 'on_init')
 * @param {boolean} success - Whether callback was successful
 * @param {string} errorMessage - Error message if any
 * @returns {Promise<void>}
 */
const recordCallbackStatus = async (transactionId, callbackType, success, errorMessage = '') => {
  try {
    // Find the order by transaction ID
    const orders = await wooCommerceAPI.getOrders({
      meta_key: 'ondc_transaction_id',
      meta_value: transactionId
    });
    
    if (!orders || orders.length === 0) {
      logger.warn('Could not find order for transaction ID when recording callback status', {
        transactionId, callbackType
      });
      return;
    }
    
    const order = orders[0];
    const timestamp = new Date().toISOString();
    
    // Add callback status to order meta_data
    const meta_data = [
      { 
        key: `ondc_${callbackType}_callback_status`, 
        value: success ? 'success' : 'failed' 
      },
      { 
        key: `ondc_${callbackType}_callback_timestamp`, 
        value: timestamp 
      }
    ];
    
    if (!success && errorMessage) {
      meta_data.push({
        key: `ondc_${callbackType}_callback_error`,
        value: errorMessage.substring(0, 255) // Limit error message length
      });
    }
    
    // Update the order
    await wooCommerceAPI.updateOrder(order.id, { meta_data });
    
    logger.info(`Recorded ${callbackType} callback status for order`, {
      transactionId,
      orderId: order.id,
      status: success ? 'success' : 'failed'
    });
  } catch (error) {
    logger.error('Error recording callback status', {
      transactionId,
      callbackType,
      error: error.message,
      stack: error.stack
    });
    // Don't throw, this is a non-critical operation
  }
};

module.exports = {
  sendOnInitCallback
};
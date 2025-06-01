const logger = require('./logger');
const authRequestClient = require('../auth/authRequestClient');
const wooCommerceAPI = require('./wooCommerceAPI');

/**
 * Send callback to BAP with retry logic and authentication
 * @param {string} url - Callback URL
 * @param {Object} payload - Callback payload
 * @param {string} transactionId - ONDC transaction ID for logging
 * @param {string} type - Callback type (e.g., 'on_init', 'on_confirm')
 * @returns {Promise<Object>} Result with success status
 */
const sendCallback = async (url, payload, transactionId, type) => {
  // Use the authenticated request client for sending callbacks
  const result = await authRequestClient.sendAuthenticatedCallback(url, payload, transactionId, type);
  
  // Record callback status in order metadata
  await recordCallbackStatus(transactionId, type, result.success, result.error);
  
  return result;
};

/**
 * Record callback status in order metadata
 * @param {string} transactionId - ONDC transaction ID
 * @param {string} callbackType - Type of callback (e.g., 'on_init', 'on_confirm')
 * @param {boolean} success - Whether the callback was successful
 * @param {string} errorMessage - Error message if unsuccessful
 * @returns {Promise<void>}
 */
const recordCallbackStatus = async (transactionId, callbackType, success, errorMessage = '') => {
  try {
    // Find order by transaction ID
    const orders = await wooCommerceAPI.getOrders({
      meta_key: 'ondc_transaction_id',
      meta_value: transactionId
    });
    
    if (!orders || orders.length === 0) {
      logger.warn('Could not find order for recording callback status', {
        transactionId,
        callbackType
      });
      return;
    }
    
    const order = orders[0];
    const timestamp = new Date().toISOString();
    
    // Prepare metadata for callback status
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
    
    // Add error message if callback failed
    if (!success && errorMessage) {
      meta_data.push({
        key: `ondc_${callbackType}_callback_error`,
        value: errorMessage.substring(0, 255) // Limit length to avoid metadata issues
      });
    }
    
    // Update order with callback status
    await wooCommerceAPI.updateOrder(order.id, { meta_data });
    
    logger.info(`Recorded ${callbackType} callback status`, {
      transactionId,
      orderId: order.id,
      status: success ? 'success' : 'failed'
    });
  } catch (error) {
    logger.error('Error recording callback status', {
      transactionId,
      callbackType,
      error: error.message
    });
    // Non-critical operation, so we don't throw the error
  }
};

/**
 * Send multiple callbacks in sequence
 * @param {Array<Object>} callbacks - Array of callback objects with url, payload, and type
 * @param {string} transactionId - ONDC transaction ID for logging
 * @returns {Promise<Array<Object>>} Array of callback results
 */
const sendMultipleCallbacks = async (callbacks, transactionId) => {
  const results = [];
  
  for (const callback of callbacks) {
    logger.info(`Sending ${callback.type} callback`, {
      transactionId,
      url: callback.url
    });
    
    const result = await sendCallback(
      callback.url,
      callback.payload,
      transactionId,
      callback.type
    );
    
    results.push({
      type: callback.type,
      success: result.success,
      data: result.data
    });
    
    // If a critical callback fails, we might want to abort the sequence
    if (!result.success && callback.critical) {
      logger.error(`Critical callback ${callback.type} failed, aborting sequence`, {
        transactionId
      });
      break;
    }
  }
  
  return results;
};

/**
 * Send a callback and update order status based on result
 * @param {string} url - Callback URL
 * @param {Object} payload - Callback payload
 * @param {string} transactionId - ONDC transaction ID
 * @param {string} type - Callback type
 * @param {Object} statusMapping - Mapping of callback result to order status
 * @returns {Promise<Object>} Callback result
 */
const sendCallbackAndUpdateStatus = async (url, payload, transactionId, type, statusMapping = {}) => {
  const result = await sendCallback(url, payload, transactionId, type);
  
  // Default status mappings if not provided
  const defaultMapping = {
    success: 'processing',
    failure: 'on-hold'
  };
  
  const mapping = { ...defaultMapping, ...statusMapping };
  
  try {
    // Find order by transaction ID
    const orders = await wooCommerceAPI.getOrders({
      meta_key: 'ondc_transaction_id',
      meta_value: transactionId
    });
    
    if (orders && orders.length > 0) {
      const order = orders[0];
      const newStatus = result.success ? mapping.success : mapping.failure;
      
      // Update order status
      await wooCommerceAPI.updateOrder(order.id, {
        status: newStatus,
        meta_data: [
          {
            key: 'ondc_callback_triggered_status_change',
            value: `${type}:${result.success ? 'success' : 'failure'}`
          }
        ]
      });
      
      logger.info(`Updated order status after ${type} callback`, {
        transactionId,
        orderId: order.id,
        newStatus
      });
    }
  } catch (error) {
    logger.error(`Error updating order status after ${type} callback`, {
      transactionId,
      error: error.message
    });
  }
  
  return result;
};

module.exports = {
  sendCallback,
  recordCallbackStatus,
  sendMultipleCallbacks,
  sendCallbackAndUpdateStatus
};
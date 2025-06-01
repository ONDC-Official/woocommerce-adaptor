const logger = require('./logger');
const wooCommerceAPI = require('./wooCommerceAPI');

/**
 * Creates a new order in WooCommerce
 * @param {Object} orderData - The order data in WooCommerce format
 * @param {string} transactionId - ONDC transaction ID
 * @returns {Promise<Object>} Created order data
 * @throws {Error} If order creation fails
 */
const createOrder = async (orderData, transactionId) => {
  try {
    // Log order creation attempt
    logger.info('Creating WooCommerce order', {
      transactionId,
      customerName: orderData.billing?.name,
      items: orderData.line_items?.length || 0
    });

    // Add ONDC metadata
    orderData.meta_data = [
      ...(orderData.meta_data || []),
      {
        key: 'ondc_transaction_id',
        value: transactionId
      },
      {
        key: 'order_source',
        value: 'ONDC'
      }
    ];

    // Create order in WooCommerce
    const response = await wooCommerceAPI.post('orders', orderData);
    
    // Log successful creation
    logger.info('Order created successfully', {
      transactionId,
      orderId: response.data.id,
      status: response.data.status
    });

    return response.data;
  } catch (error) {
    // Log failure with details
    logger.error('Order creation failed', {
      transactionId,
      error: error.message,
      orderData: JSON.stringify(orderData)
    });
    throw error;
  }
};

module.exports = { createOrder };
const logger = require('./logger');
const wooCommerceAPI = require('./wooCommerceAPI');

/**
 * Handle RTO cancellation
 * @param {Object} order - WooCommerce order
 * @param {string} reasonId - Cancellation reason code
 * @param {Object} context - ONDC context
 * @returns {Promise<Object>} Updated order
 */
const handleRTOCancellation = async (order, reasonId, context) => {
  try {
    const transactionId = context.transaction_id;
    
    logger.info('Handling RTO cancellation', {
      orderId: order.id,
      transactionId,
      reasonId
    });
    
    // Extract original fulfillment ID
    const fulfillmentId = getMainFulfillmentId(order);
    
    // Create RTO fulfillment ID
    const rtoFulfillmentId = `${fulfillmentId}-RTO`;
    
    // Add RTO-specific metadata
    const meta_data = [
      { key: `ondc_rto_initiated`, value: 'true' },
      { key: `ondc_rto_fulfillment_id`, value: rtoFulfillmentId },
      { key: `ondc_rto_reason`, value: reasonId },
      { key: `ondc_rto_initiated_by`, value: context.bpp_id },
      { key: `ondc_rto_initiated_time`, value: new Date().toISOString() },
      { key: `ondc_rto_state`, value: 'RTO-Initiated' }
    ];
    
    // Update the order with RTO metadata
    const updatedOrder = await wooCommerceAPI.updateOrder(order.id, { meta_data });
    
    logger.info('RTO metadata added to order', {
      orderId: order.id,
      transactionId,
      rtoFulfillmentId
    });
    
    return updatedOrder;
  } catch (error) {
    logger.error('Error handling RTO cancellation', {
      error: error.message,
      orderId: order.id,
      transactionId: context?.transaction_id,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Create RTO fulfillment object for on_cancel response
 * @param {Object} order - WooCommerce order
 * @returns {Promise<Object|null>} RTO fulfillment object or null if not applicable
 */
const createRTOFulfillment = async (order) => {
  try {
    // Check if this order has RTO initiated
    const rtoInitiatedMeta = order.meta_data.find(meta => meta.key === 'ondc_rto_initiated');
    
    if (!rtoInitiatedMeta || rtoInitiatedMeta.value !== 'true') {
      return null; // Not an RTO
    }
    
    // Get RTO fulfillment ID
    const rtoFulfillmentId = order.meta_data.find(meta => meta.key === 'ondc_rto_fulfillment_id')?.value;
    if (!rtoFulfillmentId) {
      return null;
    }
    
    // Get main fulfillment to extract location details
    const mainFulfillmentId = getMainFulfillmentId(order);
    
    // Create RTO fulfillment object
    return {
      id: rtoFulfillmentId,
      type: 'RTO',
      state: {
        descriptor: {
          code: 'RTO-Initiated'
        }
      },
      start: {
        time: {
          timestamp: new Date().toISOString()
        },
        location: getDeliveryLocation(order)
      },
      end: {
        time: {
          timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        },
        location: getOriginLocation(order, mainFulfillmentId)
      },
      tags: [
        {
          code: 'quote_trail',
          list: [
            {
              code: 'type',
              value: 'delivery'
            },
            {
              code: 'id',
              value: rtoFulfillmentId
            },
            {
              code: 'currency',
              value: 'INR'
            },
            {
              code: 'value',
              value: calculateRTOCharge(order).toFixed(2)
            }
          ]
        }
      ]
    };
  } catch (error) {
    logger.error('Error creating RTO fulfillment object', {
      error: error.message,
      orderId: order.id
    });
    return null;
  }
};

/**
 * Get main fulfillment ID from order
 * @param {Object} order - WooCommerce order
 * @returns {string} Fulfillment ID
 */
const getMainFulfillmentId = (order) => {
  // Try to find fulfillment ID in line items
  for (const item of order.line_items) {
    const fulfillmentMeta = item.meta_data.find(meta => meta.key === 'ondc_fulfillment_id');
    if (fulfillmentMeta && fulfillmentMeta.value) {
      return fulfillmentMeta.value;
    }
  }
  
  // Fallback to default
  return 'F1';
};

/**
 * Get delivery location (customer address)
 * @param {Object} order - WooCommerce order
 * @returns {Object} Location object
 */
const getDeliveryLocation = (order) => {
  return {
    gps: order.meta_data.find(meta => meta.key === 'ondc_delivery_gps')?.value || '0,0',
    address: {
      name: order.shipping.address_1.split(',')[0] || '',
      building: order.shipping.address_1,
      locality: order.shipping.address_2 || '',
      city: order.shipping.city,
      state: order.shipping.state,
      country: order.shipping.country,
      area_code: order.shipping.postcode
    }
  };
};

/**
 * Get origin location (seller/store address)
 * @param {Object} order - WooCommerce order
 * @param {string} fulfillmentId - Fulfillment ID
 * @returns {Object} Location object
 */
const getOriginLocation = (order, fulfillmentId) => {
  // Try to get from order metadata
  const locationId = order.meta_data.find(meta => 
    meta.key === `ondc_fulfillment_${fulfillmentId}_start_location_id`
  )?.value || 'L1';
  
  // In a real implementation, you'd fetch store location from configuration or database
  // This is a simplified version
  return {
    id: locationId,
    descriptor: {
      name: 'Store Location'
    },
    gps: order.meta_data.find(meta => meta.key === 'ondc_store_gps')?.value || '12.956399,77.636803',
    address: {
      locality: 'Jayanagar',
      city: 'Bengaluru',
      area_code: '560076',
      state: 'KA'
    }
  };
};

/**
 * Calculate RTO charge based on order
 * @param {Object} order - WooCommerce order
 * @returns {number} RTO charge amount
 */
const calculateRTOCharge = (order) => {
  // In a real implementation, you'd calculate this based on your business rules
  // For simplicity, we're using the original shipping cost
  const shippingTotal = parseFloat(order.shipping_total) || 0;
  return shippingTotal;
};

/**
 * Update RTO status for order
 * @param {Object} order - WooCommerce order
 * @param {string} newState - New RTO state
 * @returns {Promise<Object>} Updated order
 */
const updateRTOStatus = async (order, newState) => {
  try {
    // Get RTO fulfillment ID
    const rtoFulfillmentId = order.meta_data.find(meta => meta.key === 'ondc_rto_fulfillment_id')?.value;
    if (!rtoFulfillmentId) {
      throw new Error('No RTO fulfillment ID found');
    }
    
    // Update RTO state
    const meta_data = [
      { key: 'ondc_rto_state', value: newState },
      { key: 'ondc_rto_updated_time', value: new Date().toISOString() }
    ];
    
    // Update the order
    return await wooCommerceAPI.updateOrder(order.id, { meta_data });
  } catch (error) {
    logger.error('Error updating RTO status', {
      error: error.message,
      orderId: order.id,
      newState
    });
    throw error;
  }
};

module.exports = {
  handleRTOCancellation,
  createRTOFulfillment,
  updateRTOStatus
};
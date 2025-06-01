const fs = require('fs').promises;
const path = require('path');
const { makeRequest } = require("../utils/networkHandler");
const logger = require("../utils/logger");
const wooCommerceAPI = require("../utils/wooCommerceAPI");
const { transformOrderToONDC } = require("./statusService");

// Update order in WooCommerce
const updateOrderInWooCommerce = async (orderId, updateData) => {
  try {
    const mappedOrderId = orderId.replace(/^O/, ''); // Remove 'O' prefix if present
    
    logger.info(`Updating WooCommerce order: ${mappedOrderId}`);
    
    if (process.env.NODE_ENV === 'production') {
      // Production: Use actual WooCommerce API
      return await wooCommerceAPI.put(`/orders/${mappedOrderId}`, updateData);
    }
    
    // Development: Use sample data
    const filePath = path.join(__dirname, '../Data/status.json');
    const rawData = await fs.readFile(filePath, 'utf8');
    const orderData = JSON.parse(rawData);
    
    // Simulate updating the order
    logger.debug(`Simulated updating order ${mappedOrderId} with data: ${JSON.stringify(updateData)}`);
    return { ...orderData, ...updateData };
  } catch (error) {
    logger.error(`Failed to update order in WooCommerce: ${error.message}`, {
      orderId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get updated order from WooCommerce
const getUpdatedOrder = async (orderId) => {
  try {
    const mappedOrderId = orderId.replace(/^O/, ''); // Remove 'O' prefix if present
    
    logger.info(`Fetching updated WooCommerce order: ${mappedOrderId}`);
    
    if (process.env.NODE_ENV === 'production') {
      // Production: Use actual WooCommerce API
      return await wooCommerceAPI.get(`/orders/${mappedOrderId}`);
    }
    
    // Development: Use sample data
    const filePath = path.join(__dirname, '../Data/status.json');
    const rawData = await fs.readFile(filePath, 'utf8');
    const orderData = JSON.parse(rawData);
    
    logger.debug(`Retrieved updated order data for ID ${mappedOrderId}`);
    return orderData;
  } catch (error) {
    logger.error(`Failed to fetch updated order: ${error.message}`, {
      orderId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Process update request and prepare WooCommerce update data
const processUpdateRequest = async (message) => {
  const { order } = message;
  const updateData = {};
  
  // Handle billing address update
  if (order?.billing) {
    updateData.billing = {
      first_name: order.billing.name?.split(' ')[0] || '',
      last_name: order.billing.name?.split(' ').slice(1).join(' ') || '',
      address_1: order.billing.address?.name || '',
      address_2: order.billing.address?.building || '',
      city: order.billing.address?.city || '',
      state: order.billing.address?.state || '',
      postcode: order.billing.address?.area_code || '',
      country: order.billing.address?.country || '',
      email: order.billing.email || '',
      phone: order.billing.phone || ''
    };
  }
  
  // Handle shipping address update
  if (order?.fulfillments?.[0]?.end?.location?.address) {
    const shippingAddress = order.fulfillments[0].end.location.address;
    updateData.shipping = {
      first_name: order.billing?.name?.split(' ')[0] || '',
      last_name: order.billing?.name?.split(' ').slice(1).join(' ') || '',
      address_1: shippingAddress.name || '',
      address_2: shippingAddress.building || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postcode: shippingAddress.area_code || '',
      country: shippingAddress.country || ''
    };
  }
  
  // Handle cancellation
  if (order?.cancellation) {
    updateData.status = 'cancelled';
    updateData.customer_note = order.cancellation.reason?.description || 'Order cancelled';
  }
  
  return updateData;
};

// Create on_update response
const getOnUpdateResponse = async (context, message) => {
  try {
    // Extract order ID
    const orderId = message.order_id || message.order?.id;
    if (!orderId) {
      throw new Error("Order ID not found in message");
    }
    
    // Process update request
    const updateData = await processUpdateRequest(message);
    
    // Update order in WooCommerce
    await updateOrderInWooCommerce(orderId, updateData);
    
    // Get updated order from WooCommerce
    const updatedOrder = await getUpdatedOrder(orderId);
    
    // Transform to ONDC format
    const ondcOrder = transformOrderToONDC(updatedOrder);
    
    // Create on_update response
    return {
      context: {
        domain: context.domain || "ONDC:RET10",
        country: context.country || "IND",
        city: context.city || "std:080",
        action: "on_update",
        core_version: context.core_version || "1.2.0",
        bap_id: context.bap_id,
        bap_uri: context.bap_uri,
        bpp_id: process.env.BPP_ID || "woocommerce.bpp.example.com",
        bpp_uri: process.env.BPP_URI || "https://woocommerce-adaptor.example.com",
        transaction_id: context.transaction_id,
        message_id: context.message_id,
        timestamp: new Date().toISOString()
      },
      message: {
        order: ondcOrder
      }
    };
  } catch (error) {
    logger.error(`Error in getOnUpdateResponse: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Send on_update response to BAP
const sendOnUpdateResponse = async (context, message) => {
  try {
    // Extract BAP URI
    const bapUri = context.bap_uri;
    if (!bapUri) {
      throw new Error("BAP URI not found in context");
    }
    
    // Get the response payload
    const onUpdateResponse = await getOnUpdateResponse(context, message);
    
    // Send on_update response
    const onUpdateUrl = `${bapUri}/on_update`;
    
    logger.info(`Sending on_update response to ${onUpdateUrl}`, {
      transactionId: context.transaction_id,
      orderId: message.order_id || message.order?.id
    });
    
    // Development only: Log response
    if (process.env.NODE_ENV !== 'production') {
      console.log("\n===== ON_UPDATE RESPONSE START =====");
      console.log(JSON.stringify(onUpdateResponse, null, 2));
      console.log("===== ON_UPDATE RESPONSE END =====\n");
    }
    
    // Send the actual request in production
    if (process.env.NODE_ENV === 'production') {
      await makeRequest('POST', onUpdateUrl, onUpdateResponse);
    }
    
    logger.info(`Successfully sent on_update response`, {
      transactionId: context.transaction_id
    });
    
    return onUpdateResponse;
  } catch (error) {
    logger.error(`Error in sendOnUpdateResponse: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  sendOnUpdateResponse,
  getOnUpdateResponse,
  updateOrderInWooCommerce,
  getUpdatedOrder
};
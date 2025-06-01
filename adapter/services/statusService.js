const fs = require('fs').promises;
const path = require('path');
const { makeRequest } = require("../utils/networkHandler");
const logger = require("../utils/logger");

// Gets order status from sample JSON data
const getOrderFromWooCommerce = async (orderId) => {
  try {
    logger.info(`Starting to fetch order from WooCommerce for ID: ${orderId}`);
    const mappedOrderId = orderId.replace(/^O/, ''); // Remove 'O' prefix if present
    
    logger.info(`Mapped order ID from ${orderId} to ${mappedOrderId}`);
    
    // Read the sample data file
    const filePath = path.join(__dirname, '../Data/status.json');
    logger.debug(`Attempting to read sample data from: ${filePath}`);
    
    const rawData = await fs.readFile(filePath, 'utf8');
    logger.debug(`Successfully read sample data file, size: ${rawData.length} bytes`);
    
    const orderData = JSON.parse(rawData);
    logger.debug(`Successfully parsed order data from JSON`);
    
    // In a real implementation, we would check if the ID matches
    // For this sample, we'll just use the sample data regardless of the ID
    logger.debug(`WooCommerce order data retrieved for ID ${mappedOrderId}`);
    logger.info(`Order data fetch completed successfully for ID: ${mappedOrderId}`);
    return orderData;
  } catch (error) {
    logger.error(`Failed to fetch order from sample data: ${error.message}`, {
      orderId: orderId,
      error: error.message,
      stack: error.stack
    });
    logger.debug(`Error details: ${error.stack}`);
    throw error;
  }
};

/// Maps WooCommerce order status to ONDC order state 
const mapOrderState = (wooStatus) => {
  logger.debug(`Mapping WooCommerce status '${wooStatus}' to ONDC order state`);
  
  const stateMapping = {
    'pending': 'Created',
    'processing': 'Accepted',
    'on-hold': 'In-progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'refunded': 'Cancelled',
    'failed': 'Cancelled',
    'trash': 'Cancelled'
  };
  
  const mappedState = stateMapping[wooStatus] || 'Created';
  logger.debug(`Mapped WooCommerce status '${wooStatus}' to ONDC state '${mappedState}'`);
  
  return mappedState;
};

// Maps WooCommerce order status to ONDC fulfillment state 
const mapFulfillmentState = (wooStatus) => {
  logger.debug(`Mapping WooCommerce status '${wooStatus}' to ONDC fulfillment state`);
  
  const fulfillmentState = {
    'pending': 'Pending',
    'processing': 'Packed',
    'on-hold': 'Pending',
    'completed': 'Order-delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Cancelled',
    'failed': 'Cancelled',
    'trash': 'Cancelled'
  };
  
  const mappedState = fulfillmentState[wooStatus] || 'Pending';
  logger.debug(`Mapped WooCommerce status '${wooStatus}' to fulfillment state '${mappedState}'`);
  
  return mappedState;
};

// Transform WooCommerce order to ONDC on_status format
const transformOrderToONDC = (wooOrder) => {
  logger.info(`Starting transformation of WooCommerce order ID ${wooOrder.id} to ONDC format`);
  
  // Extract items from WooCommerce order
  logger.debug(`Processing line items from order, count: ${wooOrder.line_items.length}`);
  const items = wooOrder.line_items.map(item => ({
    id: `I${item.id}`,
    fulfillment_id: "F1",
    quantity: {
      count: item.quantity
    }
  }));
  logger.debug(`Transformed ${items.length} line items to ONDC format`);

  // Build quote breakup
  logger.debug(`Starting to build quote breakup`);
  const quoteBreakup = [];
  
  // Add product items
  logger.debug(`Processing product items for quote breakup`);
  wooOrder.line_items.forEach(item => {
    logger.debug(`Adding item ${item.id} - ${item.name} to quote breakup`);
    quoteBreakup.push({
      "@ondc/org/item_id": `I${item.id}`,
      "@ondc/org/item_quantity": {
        count: item.quantity
      },
      "title": item.name,
      "@ondc/org/title_type": "item",
      "price": {
        "currency": wooOrder.currency,
        "value": item.total
      }
    });
    
    // Add tax if available
    if (parseFloat(item.total_tax) > 0) {
      logger.debug(`Adding tax for item ${item.id}, value: ${item.total_tax}`);
      quoteBreakup.push({
        "@ondc/org/item_id": `I${item.id}`,
        "title": "Tax",
        "@ondc/org/title_type": "tax",
        "price": {
          "currency": wooOrder.currency,
          "value": item.total_tax
        }
      });
    }
  });
  
  // Add shipping
  if (parseFloat(wooOrder.shipping_total) > 0) {
    logger.debug(`Adding shipping cost to quote breakup: ${wooOrder.shipping_total}`);
    quoteBreakup.push({
      "@ondc/org/item_id": "F1",
      "title": "Delivery charges",
      "@ondc/org/title_type": "delivery",
      "price": {
        "currency": wooOrder.currency,
        "value": wooOrder.shipping_total
      }
    });
  }
  
  // Add discount if available
  if (parseFloat(wooOrder.discount_total) > 0) {
    logger.debug(`Adding discount to quote breakup: ${wooOrder.discount_total}`);
    quoteBreakup.push({
      "@ondc/org/item_id": "I1", // Generic ID for overall discount
      "title": "Discount",
      "@ondc/org/title_type": "discount",
      "price": {
        "currency": wooOrder.currency,
        "value": `-${wooOrder.discount_total}`
      }
    });
  }

  logger.debug(`Quote breakup completed with ${quoteBreakup.length} entries`);

  // Prepare cancellation object if order is cancelled
  let cancellation = null;
  if (wooOrder.status === 'cancelled' || wooOrder.status === 'refunded') {
    logger.debug(`Order is ${wooOrder.status}, adding cancellation details`);
    cancellation = {
      cancelled_by: "sellerNP.com", // Default as we don't have this info in sample data
      reason: {
        id: "001",
        description: wooOrder.customer_note || "Order cancelled"
      }
    };
  }

  // Construct the ONDC order response
  logger.debug(`Building final ONDC order object`);
  const ondcOrder = {
    id: `O${wooOrder.id}`,
    state: mapOrderState(wooOrder.status),
    ...(cancellation && { cancellation }),
    provider: {
      id: "P1", // Hardcoded for sample
      locations: [{ id: "L1" }]
    },
    items: items,
    billing: {
      name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
      address: {
        name: wooOrder.billing.address_1,
        building: wooOrder.billing.address_2 || "N/A",
        locality: wooOrder.billing.city,
        city: wooOrder.billing.city,
        state: wooOrder.billing.state,
        country: wooOrder.billing.country,
        area_code: wooOrder.billing.postcode
      },
      email: wooOrder.billing.email,
      phone: wooOrder.billing.phone,
      created_at: wooOrder.date_created,
      updated_at: wooOrder.date_modified
    },
    fulfillments: [
      {
        id: "F1",
        "@ondc/org/provider_name": "WooCommerce Store", // Hardcoded for sample
        "type": "Delivery",
        "tracking": false, // No tracking info in sample data
        "@ondc/org/TAT": "PT60M", // Default TAT (1 hour)
        "state": {
          "descriptor": {
            "code": mapFulfillmentState(wooOrder.status)
          }
        },
        "start": {
          "location": {
            "descriptor": {
              "name": "WooCommerce Store"
            },
            "gps": "12.967555,77.749666", // Hardcoded for sample
            "address": {
              "locality": "Locality",
              "city": "City",
              "area_code": "560001",
              "state": "State"
            }
          }
        },
        "end": {
          "location": {
            "gps": "0,0", // Not available in sample data
            "address": {
              "name": wooOrder.shipping.address_1 || wooOrder.billing.address_1,
              "building": wooOrder.shipping.address_2 || wooOrder.billing.address_2 || "N/A",
              "locality": wooOrder.shipping.city || wooOrder.billing.city,
              "city": wooOrder.shipping.city || wooOrder.billing.city,
              "state": wooOrder.shipping.state || wooOrder.billing.state,
              "country": wooOrder.shipping.country || wooOrder.billing.country,
              "area_code": wooOrder.shipping.postcode || wooOrder.billing.postcode
            }
          }
        }
      }
    ],
    quote: {
      price: {
        currency: wooOrder.currency,
        value: wooOrder.total
      },
      breakup: quoteBreakup,
      ttl: "P1D" // 1 day validity
    },
    payment: {
      uri: "https://ondc.transaction.com/payment", // Placeholder
      params: {
        currency: wooOrder.currency,
        transaction_id: wooOrder.transaction_id || `tr-${wooOrder.id}`,
        amount: wooOrder.total
      },
      status: wooOrder.date_paid ? "PAID" : "NOT-PAID",
      type: "ON-ORDER", // Default payment type
      collected_by: "BAP",
      time: {
        timestamp: wooOrder.date_paid || wooOrder.date_created
      }
    },
    created_at: wooOrder.date_created,
    updated_at: wooOrder.date_modified
  };

  logger.info(`Successfully transformed WooCommerce order ${wooOrder.id} to ONDC format`);
  return ondcOrder;
};

// For local testing: Get the on_status response without sending it to BAP
const getLocalOnStatusResponse = async (context, message) => {
  try {
    logger.info(`Starting to build local on_status response for transaction ID: ${context.transaction_id}`);
    
    // Extract order ID from request
    const orderId = message.order_id;
    logger.debug(`Extracted order ID: ${orderId} from message`);
    
    if (!orderId) {
      logger.error(`Order ID not provided in status request`);
      throw new Error("Order ID not found in message");
    }

    // Get order from sample data
    logger.debug(`Retrieving WooCommerce order data for ID: ${orderId}`);
    const wooOrder = await getOrderFromWooCommerce(orderId);
    logger.debug(`Successfully retrieved WooCommerce order data`);
    
    // Transform to ONDC format
    logger.debug(`Transforming WooCommerce order to ONDC format`);
    const ondcOrder = transformOrderToONDC(wooOrder);
    logger.debug(`Order transformation complete`);

    // Create on_status response
    logger.debug(`Building final on_status response payload`);
    const response = {
      context: {
        domain: context.domain || "ONDC:RET10",
        country: context.country || "IND",
        city: context.city || "std:080",
        action: "on_status",
        core_version: context.core_version || "1.2.0",
        bap_id: context.bap_id,
        bap_uri: context.bap_uri,
        bpp_id: "sellerNP.com", // Hardcoded for sample
        bpp_uri: "https://sellerNP.com/ondc", // Hardcoded for sample
        transaction_id: context.transaction_id,
        message_id: context.message_id,
        timestamp: new Date().toISOString()
      },
      message: {
        order: ondcOrder
      }
    };

    logger.info(`Local on_status response generated successfully for order ID: ${orderId}`);
    return response;
  } catch (error) {
    logger.error(`Error in getLocalOnStatusResponse: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    logger.debug(`Error details: ${error.stack}`);
    throw error;
  }
};

// Sends on_status response to BAP
const sendOnStatusResponse = async (context, message) => {
  try {
    logger.info(`Starting to send on_status response for transaction ID: ${context.transaction_id}`);
    
    // Extract BAP URI
    const bapUri = context.bap_uri;
    logger.debug(`Extracted BAP URI: ${bapUri}`);
    
    if (!bapUri) {
      logger.error(`BAP URI not provided in request context`);
      throw new Error("BAP URI not found in context");
    }

    // Get the response payload
    logger.debug(`Generating on_status response payload`);
    const onStatusResponse = await getLocalOnStatusResponse(context, message);
    logger.debug(`Response payload generated successfully`);

    // Send on_status response
    const onStatusUrl = `${bapUri}/on_status`;
    logger.info(`Preparing to send on_status to URL: ${onStatusUrl}`);
    
    logger.info(`Sending on_status response to ${onStatusUrl}`, { 
      transactionId: context.transaction_id,
      orderId: message.order_id
    });
    
    // UNCOMMENT FOR PRODUCTION: Send the actual request
    // logger.debug(`Initiating HTTP POST request to ${onStatusUrl}`);
    // await makeRequest('POST', onStatusUrl, onStatusResponse);
    // logger.debug(`HTTP request completed successfully`);
    
    logger.info(`Successfully sent on_status response for order ${message.order_id}`, {
      transactionId: context.transaction_id
    });
    
    return onStatusResponse;
  } catch (error) {
    logger.error(`Error in sendOnStatusResponse: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    logger.debug(`Error details: ${error.stack}`);
    throw error;
  }
};

module.exports = {
  sendOnStatusResponse,
  getOrderFromWooCommerce,
  transformOrderToONDC,
  getLocalOnStatusResponse
};
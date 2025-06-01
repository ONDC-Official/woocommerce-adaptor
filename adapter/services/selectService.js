const logger = require("../utils/logger");
const { makeRequest } = require("../utils/networkHandler");
const wooCommerceAPI = require("../utils/wooCommerceAPI");
const fs = require("fs").promises;
const path = require("path");
const chargesMiddleware = require("../middleware/chargesMiddleware");
const fulfillmentService = require("../services/fulfillmentService");

/**
 * Get product details from WooCommerce
 * @param {string} productId - WooCommerce product ID
 * @returns {Promise<Object>} - Product details
 */
const getProductFromWooCommerce = async (productId) => {
  try {
    logger.info(`Fetching product from WooCommerce: ${productId}`);

    // In a production environment, you'd use WooCommerce API
    // return await wooCommerceAPI.get(`/products/${productId}`);

    // For now, use sample data
    const filePath = path.join(__dirname, "../Data/select.json");
    const rawData = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(rawData);

    logger.debug(
      `select.json data structure: ${typeof data}, isArray: ${Array.isArray(
        data
      )}`
    );
    if (typeof data === "object") {
      logger.debug(`Keys in data: ${Object.keys(data).join(", ")}`);
    }

    // Check if data is an array or direct object
    let product;
    if (Array.isArray(data)) {
      product = data.find((p) => p.id.toString() === productId.toString());
    } else if (data.id && data.id.toString() === productId.toString()) {
      product = data;
    } else if (data.products && Array.isArray(data.products)) {
      product = data.products.find(
        (p) => p.id.toString() === productId.toString()
      );
    } else {
      // If we have a different structure, try to locate the product
      product = data[productId] || null;
    }

    if (!product) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    return product;
  } catch (error) {
    logger.error(`Error fetching product: ${error.message}`, {
      error: error.stack,
    });
    throw error;
  }
};

/**
 * Check if products are in stock
 * @param {Array} items - Order items
 * @returns {Promise<Array>} - Items with availability information
 */
const checkProductAvailability = async (items) => {
  try {
    const itemsWithAvailability = [];

    for (const item of items) {
      // Extract product ID from item ID (remove any prefix like 'I')
      const productId = item.id.replace(/^[A-Za-z]+/, "");

      // Get product details
      const product = await getProductFromWooCommerce(productId);

      // Check if product exists and is in stock
      const available = product && product.stock_status === "instock";

      itemsWithAvailability.push({
        ...item,
        product: product,
        available: available,
      });
    }

    return itemsWithAvailability;
  } catch (error) {
    logger.error(`Error checking product availability: ${error.message}`, {
      error: error.stack,
    });
    throw error;
  }
};

/**
 * Calculate quote for selected items
 * @param {Array} items - Items with product information
 * @param {Object} fulfillment - Fulfillment information
 * @param {Object} context - Request context
 * @returns {Promise<Object>} - Quote with breakup
 */
const calculateQuote = async (items, fulfillment, context) => {
  try {
    // Calculate item prices and subtotal
    let subtotal = 0;
    const quoteBreakup = [];

    items.forEach((item) => {
      const { product } = item;
      const price = parseFloat(product.price || product.regular_price || 0);
      const quantity = item.quantity?.count || 1;
      const itemTotal = price * quantity;

      subtotal += itemTotal;

      // Add item to quote breakup
      quoteBreakup.push({
        "@ondc/org/item_id": item.id,
        title: product.name,
        "@ondc/org/title_type": "item",
        "@ondc/org/item_quantity": {
          count: quantity,
        },
        price: {
          currency: "INR",
          value: itemTotal.toFixed(2),
        },
      });
    });

    // Calculate tax (simplified example: 18% GST)
    const tax = subtotal * 0.18;
    quoteBreakup.push({
      "@ondc/org/item_id": "tax",
      title: "Tax",
      "@ondc/org/title_type": "tax",
      price: {
        currency: "INR",
        value: tax.toFixed(2),
      },
    });

    // Calculate delivery charges
    const deliveryCharge = await chargesMiddleware.calculateDeliveryCharges(
      fulfillment,
      items,
      context
    );
    quoteBreakup.push({
      "@ondc/org/item_id": "delivery",
      title: "Delivery charges",
      "@ondc/org/title_type": "delivery",
      price: {
        currency: "INR",
        value: deliveryCharge.value,
      },
    });

    // Calculate packing charges
    const packingCharge = await chargesMiddleware.calculatePackingCharges(
      items,
      context
    );
    quoteBreakup.push({
      "@ondc/org/item_id": "packing",
      title: "Packing charges",
      "@ondc/org/title_type": "packing",
      price: {
        currency: "INR",
        value: packingCharge.value,
      },
    });

    // Calculate total
    const total =
      subtotal +
      tax +
      parseFloat(deliveryCharge.value) +
      parseFloat(packingCharge.value);

    return {
      price: {
        currency: "INR",
        value: total.toFixed(2),
      },
      breakup: quoteBreakup,
    };
  } catch (error) {
    logger.error(`Error calculating quote: ${error.message}`, {
      error: error.stack,
    });
    throw error;
  }
};

/**
 * Generate on_select response
 * @param {Object} context - Request context
 * @param {Object} message - Request message
 * @returns {Promise<Object>} - on_select response
 */
const generateOnSelectResponse = async (context, message) => {
  try {
    const order = message.order;
    const items = order.items;
    const fulfillment = order.fulfillments?.[0] || { end: {} };

    // Check product availability
    const itemsWithAvailability = await checkProductAvailability(items);

    // Check if all items are available
    const allItemsAvailable = itemsWithAvailability.every(
      (item) => item.available
    );

    // Check if delivery location is serviceable
    const deliveryLocation = fulfillment.end.location;
    const isServiceable = await fulfillmentService.checkServiceability(
      deliveryLocation
    );

    // Calculate quote
    const quote = await calculateQuote(
      itemsWithAvailability,
      fulfillment,
      context
    );

    // Calculate TAT (Turn Around Time)
    const tat = "P2D"; // 2 days delivery time (ISO 8601 duration format)

    // Generate on_select response
    return {
      context: {
        domain: context.domain || "ONDC:RET10",
        country: context.country || "IND",
        city: context.city || "std:080",
        action: "on_select",
        core_version: context.core_version || "1.2.0",
        bap_id: context.bap_id,
        bap_uri: context.bap_uri,
        bpp_id: process.env.BPP_ID || "woocommerce.bpp.example.com",
        bpp_uri:
          process.env.BPP_URI || "https://woocommerce-adaptor.example.com",
        transaction_id: context.transaction_id,
        message_id: context.message_id,
        timestamp: new Date().toISOString(),
      },
      message: {
        order: {
          provider: {
            id: "WooCommerce_Store",
            locations: [{ id: "store-location" }],
          },
          items: itemsWithAvailability.map((item) => ({
            id: item.id,
            fulfillment_id: fulfillment.id || "standard-delivery",
            quantity: item.quantity,
          })),
          fulfillments: [
            {
              id: fulfillment.id || "standard-delivery",
              "@ondc/org/category": "Immediate Delivery",
              "@ondc/org/TAT": tat,
              state: {
                descriptor: {
                  code: isServiceable ? "Serviceable" : "Non-serviceable",
                },
              },
            },
          ],
          quote: quote,
          payments: [
            {
              "@ondc/org/buyer_app_finder_fee_type": "percent",
              "@ondc/org/buyer_app_finder_fee_amount": "3.0",
            },
          ],
        },
      },
    };
  } catch (error) {
    logger.error(`Error generating on_select response: ${error.message}`, {
      error: error.stack,
    });
    throw error;
  }
};

/**
 * Send on_select response to BAP
 * @param {Object} context - Request context
 * @param {Object} message - Request message
 * @returns {Promise<Object>} - API response
 */
const sendOnSelectResponse = async (context, message) => {
  try {
    // Extract BAP URI
    const bapUri = context.bap_uri;
    if (!bapUri) {
      throw new Error("BAP URI not found in context");
    }

    // Generate on_select response
    const onSelectResponse = await generateOnSelectResponse(context, message);

    // Send on_select response
    const onSelectUrl = `${bapUri}/on_select`;

    logger.info(`Sending on_select response to ${onSelectUrl}`, {
      transactionId: context.transaction_id,
    });

    // Log the response in development mode
    console.log("\n===== ON_SELECT RESPONSE START =====");
    console.log(JSON.stringify(onSelectResponse, null, 2));
    console.log("===== ON_SELECT RESPONSE END =====\n");

    // PRODUCTION MODE (Commented out for now)
    // await makeRequest('POST', onSelectUrl, onSelectResponse);

    logger.info(`Successfully sent on_select response`, {
      transactionId: context.transaction_id,
    });

    return onSelectResponse;
  } catch (error) {
    logger.error(`Error in sendOnSelectResponse: ${error.message}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  sendOnSelectResponse,
  calculateQuote,
  checkProductAvailability,
  getProductFromWooCommerce,
};
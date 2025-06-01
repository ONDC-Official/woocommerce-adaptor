const { createOrder } = require('../utils/orderHelper');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { ApiError } = require('../utils/errorHandler');
const wooCommerceAPI = require('../utils/wooCommerceAPI');

/**
 * Transform ONDC order to WooCommerce format
 * @param {Object} request - ONDC request
 * @returns {Object} WooCommerce order data
 */
const transformOndcToWooCommerceOrder = (request) => {
  const order = request.message.order;
  return {
    status: 'pending', // Changed from 'processing' to 'pending'
    payment_method: 'cod',
    payment_method_title: 'Cash on Delivery',
    billing: {
      first_name: order.billing.name,
      email: order.billing.email,
      phone: order.billing.phone,
      address_1: order.billing.address.building,
      address_2: order.billing.address.street,
      city: order.billing.address.city,
      state: order.billing.address.state,
      postcode: order.billing.address.area_code,
      country: order.billing.address.country
    },
    shipping: {
      first_name: order.billing.name,
      address_1: order.billing.address.building,
      address_2: order.billing.address.street,
      city: order.billing.address.city,
      state: order.billing.address.state,
      postcode: order.billing.address.area_code,
      country: order.billing.address.country
    },
    line_items: order.items.map(item => ({
      product_id: item.id,
      quantity: item.quantity.count
    })),
    meta_data: [
      {
        key: 'ondc_order_id',
        value: request.context.transaction_id
      },
      {
        key: 'ondc_message_id',
        value: request.context.message_id
      }
    ]
  };
};

async function ensureProductExists(ondcProductId) {
  try {
    logger.info('Ensuring product exists', { ondcProductId });
    const sku = `ONDC-${ondcProductId}`;
    
    // Try to find existing product
    let product = await wooCommerceAPI.findProductBySku(sku);
    
    if (!product) {
      // Create new product
      const productData = {
        name: `ONDC Product ${ondcProductId}`,
        type: 'simple',
        regular_price: '99.99',
        sku: sku,
        status: 'publish',
        manage_stock: true,
        stock_quantity: 100,
        meta_data: [{
          key: 'ondc_product_id',
          value: ondcProductId
        }]
      };
      
      product = await wooCommerceAPI.createProduct(productData);
      logger.info('Created new product', { id: product.id, sku });
    }
    
    return product;
  } catch (error) {
    logger.error('Failed to ensure product exists', { ondcProductId, error: error.message });
    throw error;
  }
}

const processInit = async (request) => {
  const transactionId = request.context.transaction_id;
  
  try {
    logger.info('Processing init request', { transactionId });
    
    // Process each item in the order
    const productMap = {};
    for (const item of request.message.order.items) {
      const product = await ensureProductExists(item.id);
      productMap[item.id] = product;
    }

    // Create order
    const orderData = {
      status: 'pending',
      payment_method: 'cod',
      payment_method_title: 'Cash on Delivery',
      billing: {
        first_name: request.message.order.billing.name,
        email: request.message.order.billing.email,
        phone: request.message.order.billing.phone,
        address_1: request.message.order.billing.address.building,
        city: request.message.order.billing.address.city,
        state: request.message.order.billing.address.state,
        postcode: request.message.order.billing.address.area_code,
        country: request.message.order.billing.address.country
      },
      shipping: {
        first_name: request.message.order.billing.name,
        address_1: request.message.order.billing.address.building,
        city: request.message.order.billing.address.city,
        state: request.message.order.billing.address.state,
        postcode: request.message.order.billing.address.area_code,
        country: request.message.order.billing.address.country
      },
      line_items: request.message.order.items.map(item => ({
        product_id: productMap[item.id].id,
        quantity: item.quantity.count
      })),
      meta_data: [{
        key: 'ondc_transaction_id',
        value: transactionId
      }]
    };

    const order = await wooCommerceAPI.createOrder(orderData);
    
    return {
      context: {
        ...request.context,
        action: 'on_init'
      },
      message: {
        order: {
          id: order.id.toString(),
          state: 'Created'
        }
      }
    };
  } catch (error) {
    logger.error('Init processing failed', { error: error.message, transactionId });
    throw new ApiError(`WooCommerce API error: ${error.message}`);
  }
};

module.exports = {
  processInit,
  transformOndcToWooCommerceOrder // Exported for testing
};
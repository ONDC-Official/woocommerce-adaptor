const axios = require("axios");
const logger = require("./logger");

// Fetches products from WooCommerce API
const fetchProducts = async (url) => {
  try {
    logger.debug(`Making request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status !== 200) {
      logger.warn(`WooCommerce API returned status ${response.status}`);
      return null;
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Error fetching products from WooCommerce: ${error.message}`, {
      error: error.stack,
      url: url.replace(/consumer_key=[^&]+/, 'consumer_key=REDACTED')
           .replace(/consumer_secret=[^&]+/, 'consumer_secret=REDACTED')
    });
    
    return null;
  }
};

// Fetches a single product by ID from WooCommerce
const fetchProductById = async (productId, { wooBaseUrl, wooConsumerKey, wooConsumerSecret }) => {
  try {
    const url = `${wooBaseUrl}/wp-json/wc/v3/products/${productId}?consumer_key=${wooConsumerKey}&consumer_secret=${wooConsumerSecret}`;
    
    logger.debug(`Fetching product details for ID: ${productId}`);
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      logger.warn(`WooCommerce API returned status ${response.status} for product ${productId}`);
      return null;
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Error fetching product by ID ${productId}: ${error.message}`, {
      error: error.stack
    });
    return null;
  }
};

module.exports = {
  fetchProducts,
  fetchProductById
};
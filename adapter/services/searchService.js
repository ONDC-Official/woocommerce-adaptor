const { makeRequest } = require("../utils/networkHandler");
const { fetchProducts } = require("../utils/fetchProducts");
const catalogModel = require("../models/catalougeModel");
const cityMappings = require("../static/cityMappings");
const logger = require("../utils/logger");
const fs = require('fs').promises;
const path = require('path');
const {
  WOO_BASE_URL,
  WOO_CONSUMER_KEY,
  WOO_CONSUMER_SECRET,
} = require("../utils/config");

/**
 * Maps a city code to its corresponding city name
 * @param {string} cityCode - City code (e.g., "std:080")
 * @returns {string} - Mapped city name or default
 */
const mapCityCodeToName = (cityCode) => {
  try {
    if (!cityCode) return "default";
    
    // Extract the code part (remove "std:" prefix if present)
    // Support both formats: "std:080" and "std080"
    const code = cityCode.replace(/^std:?/, '');
    
    // Look up the city name in the mappings
    const lookupKey = `std${code}`;
    const cityName = cityMappings[lookupKey];
    
    if (cityName) {
      logger.debug(`Mapped city code ${cityCode} to ${cityName} using key ${lookupKey}`);
      return cityName;
    } else {
      logger.warn(`No mapping found for city code ${cityCode} (lookup key: ${lookupKey})`);
      return "default";
    }
  } catch (error) {
    logger.error(`Error mapping city code: ${error.message}`);
    return "default";
  }
};

const searchByCity = async ({ category, city }) => {
  try {
    // Map the city code to actual city name
    const cityName = mapCityCodeToName(city);
    
    logger.info(`Mapped city code "${city}" to "${cityName}"`);
    
    // DEVELOPMENT MODE: Use sample data
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV MODE] Fetching products from sample data for city: ${cityName}, category: ${category?.id || 'all'}`);
      
      const filePath = path.join(__dirname, '../Data/search.json');
      const rawData = await fs.readFile(filePath, 'utf8');
      const products = JSON.parse(rawData);
      
      // Filter products by the mapped city name
      let filteredProducts = products;
      if (cityName && cityName !== 'default') {
        filteredProducts = products.filter(product => {
          // Check in attributes
          const cityAttribute = product.attributes?.find(attr => 
            attr.name.toLowerCase() === 'city' || 
            attr.name.toLowerCase() === 'location' ||
            attr.name.toLowerCase() === 'available_in'
          );
          
          if (cityAttribute) {
            return cityAttribute.options.some(option => 
              option.toLowerCase().includes(cityName.toLowerCase())
            );
          }
          
          // Check in meta_data
          const cityMeta = product.meta_data?.find(meta => 
            meta.key.toLowerCase().includes('city') || 
            meta.key.toLowerCase().includes('location')
          );
          
          if (cityMeta && cityMeta.value) {
            return cityMeta.value.toLowerCase().includes(cityName.toLowerCase());
          }
          
          // If no city info found on product, include it by default
          return true;
        });
      }
      
      logger.debug(`Retrieved ${filteredProducts.length || 0} products from sample data for city: ${cityName}`);
      return filteredProducts;
    }
    
    // PRODUCTION MODE: Fetch from WooCommerce API
    logger.info(`Fetching products from WooCommerce API for city: ${cityName}, category: ${category?.id || 'all'}`);
    
    // Build the WooCommerce products API URL
    let endpoint = 'wp-json/wc/v3/products';
    let queryParams = new URLSearchParams({
      per_page: 100,        // Maximum items per page
      status: 'publish',    // Only published products
      stock_status: 'instock' // Only in-stock products
    });
    
    // Add category filter if provided
    if (category && category.id) {
      queryParams.append('category', category.id);
    }
    
    // Construct authentication parameters
    queryParams.append('consumer_key', WOO_CONSUMER_KEY);
    queryParams.append('consumer_secret', WOO_CONSUMER_SECRET);
    
    const url = `${WOO_BASE_URL}/${endpoint}?${queryParams.toString()}`;
    
    // Fetch first page of products
    let allProducts = [];
    let currentPage = 1;
    let hasMoreProducts = true;
    
    while (hasMoreProducts) {
      const pageUrl = `${url}&page=${currentPage}`;
      logger.debug(`Fetching products page ${currentPage} from WooCommerce`);
      
      const response = await fetchProducts(pageUrl);
      
      if (!response || !Array.isArray(response) || response.length === 0) {
        // No more products or error in response
        hasMoreProducts = false;
      } else {
        // Add products to our collection
        allProducts = [...allProducts, ...response];
        
        // Check if we received fewer products than requested per page
        // This indicates it's the last page
        if (response.length < 100) {
          hasMoreProducts = false;
        } else {
          currentPage++;
        }
      }
    }
    
    logger.debug(`Retrieved ${allProducts.length} products from WooCommerce API`);
    
    // Filter products by the mapped city name
    if (cityName && cityName !== 'default') {
      const filteredProducts = allProducts.filter(product => {
        // Check in attributes
        const cityAttribute = product.attributes?.find(attr => 
          attr.name.toLowerCase() === 'city' || 
          attr.name.toLowerCase() === 'location' ||
          attr.name.toLowerCase() === 'available_in'
        );
        
        if (cityAttribute) {
          return cityAttribute.options.some(option => 
            option.toLowerCase().includes(cityName.toLowerCase())
          );
        }
        
        // Check in meta_data
        const cityMeta = product.meta_data?.find(meta => 
          meta.key.toLowerCase().includes('city') || 
          meta.key.toLowerCase().includes('location')
        );
        
        if (cityMeta && cityMeta.value) {
          return cityMeta.value.toLowerCase().includes(cityName.toLowerCase());
        }
        
        // If no city info found on product, include it in results by default
        return true;
      });
      
      logger.debug(`Filtered to ${filteredProducts.length} products for city: ${cityName}`);
      return filteredProducts;
    }
    
    return allProducts;
  } catch (error) {
    logger.error(`Failed to fetch products: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      city,
      cityName: mapCityCodeToName(city),
      categoryId: category?.id
    });
    throw error;
  }
};

const sendOnSearchResponse = async (context, message) => {
  try {
    // Extract BAP URI
    const bapUri = context.bap_uri;
    if (!bapUri) {
      throw new Error("BAP URI not found in context");
    }

    // Process search intent
    const products = await searchByCity({
      category: message.intent?.category || {},
      city: context.city || "default"
    });

    // Map products to ONDC catalog format
    const catalog = catalogModel.mapToONDC(products);

    // on_search response 
    const onSearchResponse = {
      context: {
        domain: context.domain,
        country: context.country,
        city: context.city,
        action: "on_search",
        core_version: context.core_version,
        bap_id: context.bap_id,
        bap_uri: context.bap_uri,
        bpp_id: process.env.BPP_ID || "woocommerce.bpp.example.com",
        bpp_uri: process.env.BPP_URI || "https://woocommerce-adaptor.example.com",
        transaction_id: context.transaction_id,
        message_id: context.message_id,
        timestamp: new Date().toISOString()
      },
      message: {
        catalog: catalog
      }
    };

    // Send on_search response - Log to console in development mode
    const onSearchUrl = `${bapUri}/on_search`;
    
    console.log("\n===== ON_SEARCH RESPONSE START =====");
    console.log(JSON.stringify(onSearchResponse, null, 2));
    console.log("===== ON_SEARCH RESPONSE END =====\n");
    
    logger.info(`Generated on_search response (not sent to BAP)`, { 
      transactionId: context.transaction_id 
    });
    
    // PRODUCTION MODE (Commented out):
    // return await makeRequest(
    //   'post',
    //   onSearchUrl, 
    //   onSearchResponse, 
    //   {}, 
    //   context.transaction_id
    // );
    
    return onSearchResponse;
  } catch (error) {
    logger.error("Error sending on_search response", {
      transactionId: context.transaction_id,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

module.exports = {
  searchByCity,
  sendOnSearchResponse,
  mapCityCodeToName
};
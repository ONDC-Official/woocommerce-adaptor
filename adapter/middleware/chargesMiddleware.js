const logger = require('../utils/logger');

/**
 * Calculate delivery charges based on distance and item characteristics
 * @param {Object} fulfillment - Fulfillment information with delivery location
 * @param {Array} items - Order items
 * @param {Object} context - Request context
 * @returns {Promise<Object>} - Delivery charges
 */
const calculateDeliveryCharges = async (fulfillment, items, context) => {
  try {
    const transactionId = context?.transaction_id || 'unknown';
    logger.info(`Calculating delivery charges for transaction ${transactionId}`);
    
    // Check if we have location information
    const location = fulfillment?.end?.location;
    if (!location || (!location.gps && !location.address)) {
      logger.warn("Missing location information for delivery charge calculation");
      // Return default delivery charge
      return {
        currency: "INR",
        value: "40.00" // Default delivery charge
      };
    }
    
    // Extract GPS coordinates or use address to determine distance
    let distance = 5; // Default distance in km
    
    if (location.gps) {
      // In a real implementation, you'd calculate distance from store to delivery location
      // Here we just extract the coordinates for demonstration
      try {
        const [lat, lng] = location.gps.split(',').map(coord => parseFloat(coord.trim()));
        // Use coordinates to calculate distance (simplified for demo)
        distance = Math.abs(lat) + Math.abs(lng) / 10; // Just a dummy calculation
      } catch (error) {
        logger.warn(`Could not parse GPS coordinates: ${error.message}`);
      }
    } else if (location.address) {
      // Use address to determine distance (simplified for demo)
      const pincode = location.address.area_code;
      if (pincode) {
        // Use the last two digits of pincode for a dummy distance calculation
        try {
          const lastTwoDigits = pincode.toString().slice(-2);
          distance = parseInt(lastTwoDigits, 10) / 10 + 3;
        } catch (error) {
          logger.warn(`Error processing pincode: ${error.message}`);
        }
      }
    }
    
    // Calculate base charge
    let baseCharge = 30; // Base delivery charge in INR
    
    // Add distance-based charge (₹10 per km after first 3 km)
    const distanceCharge = Math.max(0, distance - 3) * 10;
    
    // Add weight-based charge if items are heavy
    let weightCharge = 0;
    let totalWeight = 0;
    
    items.forEach(item => {
      const product = item.product;
      const weight = parseFloat(product?.weight || 0);
      const quantity = item.quantity?.count || 1;
      totalWeight += weight * quantity;
    });
    
    if (totalWeight > 5) {
      weightCharge = 20; // Extra charge for heavy items
    }
    
    // Calculate total delivery charge
    const totalCharge = baseCharge + distanceCharge + weightCharge;
    
    return {
      currency: "INR",
      value: totalCharge.toFixed(2)
    };
  } catch (error) {
    logger.error(`Error calculating delivery charges: ${error.message}`, {
      error: error.stack
    });
    // Return default charge in case of errors
    return {
      currency: "INR",
      value: "50.00" // Default charge for error cases
    };
  }
};

/**
 * Calculate packing charges based on items
 * @param {Array} items - Order items
 * @param {Object} context - Request context
 * @returns {Promise<Object>} - Packing charges
 */
const calculatePackingCharges = async (items, context) => {
  try {
    // Base packing charge
    let baseCharge = 10; // Base packing charge in INR
    
    // Additional charge based on number of items
    const itemCount = items.reduce((total, item) => {
      return total + (item.quantity?.count || 1);
    }, 0);
    
    const additionalCharge = Math.max(0, itemCount - 1) * 5; // ₹5 for each additional item
    
    // Special packaging requirements based on item categories
    let specialPackagingCharge = 0;
    items.forEach(item => {
      const product = item.product;
      if (product?.categories) {
        // Special packaging for fragile items or electronics
        const needsSpecialPackaging = product.categories.some(category => 
          ['electronics', 'fragile', 'glass'].includes(category.slug.toLowerCase())
        );
        
        if (needsSpecialPackaging) {
          specialPackagingCharge += 15; // Additional charge for special packaging
        }
      }
    });
    
    // Calculate total packing charge
    const totalCharge = baseCharge + additionalCharge + specialPackagingCharge;
    
    return {
      currency: "INR",
      value: totalCharge.toFixed(2)
    };
  } catch (error) {
    logger.error(`Error calculating packing charges: ${error.message}`, {
      error: error.stack
    });
    // Return default charge in case of errors
    return {
      currency: "INR",
      value: "10.00" // Default charge for error cases
    };
  }
};

module.exports = {
  calculateDeliveryCharges,
  calculatePackingCharges
};
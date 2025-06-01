require('dotenv').config();
const logger = require('../utils/logger');

function checkWooCommerceConfig() {
    const required = {
        'WOO_BASE_URL': process.env.WOO_BASE_URL,
        'WOO_CONSUMER_KEY': process.env.WOO_CONSUMER_KEY,
        'WOO_CONSUMER_SECRET': process.env.WOO_CONSUMER_SECRET,
        'WOO_API_VERSION': process.env.WOO_API_VERSION
    };

    const missing = Object.entries(required)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        logger.error('Missing required WooCommerce configuration:', {
            missing
        });
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    logger.info('WooCommerce configuration verified', {
        url: process.env.WOO_BASE_URL,
        version: process.env.WOO_API_VERSION
    });
}

if (require.main === module) {
    checkWooCommerceConfig();
}

module.exports = checkWooCommerceConfig;
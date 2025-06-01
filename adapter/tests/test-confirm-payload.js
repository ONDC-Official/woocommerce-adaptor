const wooCommerceAPI = require('../utils/wooCommerceAPI');
const logger = require('../utils/logger');
const config = require('../config/test-config');

/**
 * Test the ONDC confirm API endpoint
 * @param {string} orderId - The order ID to confirm
 */
async function testConfirmOrder(orderId = config.defaults.orderId) {
    try {
        console.log('\nTesting WooCommerce API functions...');

        // Test getOrder
        console.log('\nTesting getOrder...');
        const order = await wooCommerceAPI.getOrder(orderId);
        console.log('Order found:', order.id);

        // Test order confirmation
        console.log('\nTesting order confirmation...');
        const confirmed = await wooCommerceAPI.confirmOrder(orderId);
        console.log('Order confirmed:', confirmed.status);

        // Verify confirmation
        console.log('\nVerifying confirmation...');
        const verifyOrder = await wooCommerceAPI.getOrder(orderId);
        console.log('Final order status:', verifyOrder.status);

        if (verifyOrder.status === config.order.status.confirmed) {
            console.log('\nOrder successfully confirmed!');
        } else {
            throw new Error(`Order not confirmed. Current status: ${verifyOrder.status}`);
        }

    } catch (error) {
        logger.error('Test failed', { error: error.message });
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const orderId = args[0] || '15'; // Default to order ID 15

if (require.main === module) {
    testConfirmOrder(orderId)
        .then(() => {
            console.log('\nConfirm test completed successfully!');
        })
        .catch(error => {
            console.error('Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = testConfirmOrder;
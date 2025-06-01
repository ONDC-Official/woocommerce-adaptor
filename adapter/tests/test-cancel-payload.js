const wooCommerceAPI = require('../utils/wooCommerceAPI');
const logger = require('../utils/logger');
const config = require('../config/test-config');

/**
 * Test the ONDC cancel API endpoint with payload
 * @param {string} orderId - The order ID to cancel
 * @param {string} reasonId - Cancellation reason code
 */
async function testCancelPayload(orderId = config.defaults.orderId, reasonId = config.defaults.reasonCode) {
    try {
        console.log('\n=== Testing ONDC Cancel API ===');
        console.log(`Order ID: ${orderId}`);
        console.log(`Cancellation Reason: ${reasonId}\n`);

        // Test getOrder
        const order = await wooCommerceAPI.getOrder(orderId);
        console.log('Order found:', order.id);

        // Test order cancellation
        console.log('\nProcessing cancellation...');
        const cancelled = await wooCommerceAPI.cancelOrder(orderId, reasonId);
        console.log('Order cancelled:', cancelled.status);

        // Verify cancellation
        console.log('\nVerifying cancellation...');
        const verifyOrder = await wooCommerceAPI.getOrder(orderId);
        console.log('Final order status:', verifyOrder.status);

        if (verifyOrder.status === config.order.status.cancelled) {
            console.log('\n✅ Order successfully cancelled!');
        } else {
            throw new Error(`❌ Order not cancelled. Current status: ${verifyOrder.status}`);
        }

    } catch (error) {
        logger.error('Cancel test failed', { error: error.message });
        throw error;
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const orderId = args[0] || '15'; // Default to order ID 15
const reasonId = args[1] || '001'; // Default reason code

if (require.main === module) {
    testCancelPayload(orderId, reasonId)
        .then(() => {
            console.log('\nCancel test completed successfully!');
        })
        .catch(error => {
            console.error('\nTest failed:', error.message);
            process.exit(1);
        });
}

module.exports = testCancelPayload;
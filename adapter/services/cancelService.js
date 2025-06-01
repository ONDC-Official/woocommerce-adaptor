const wooCommerceAPI = require('../utils/wooCommerceAPI');
const logger = require('../utils/logger');

async function validateCancellation(orderId, transactionId) {
    try {
        const order = await wooCommerceAPI.getOrder(orderId);
        
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status === 'cancelled') {
            throw new Error('Order is already cancelled');
        }

        return true;
    } catch (error) {
        logger.error('Validation failed', { error: error.message, orderId });
        throw new Error(`Error during validation: ${error.message}`);
    }
}

const processCancellation = async (orderId, cancellationReasonId, fulfillmentId, context) => {
    try {
        const reason = `Cancelled via ONDC. Reason ID: ${cancellationReasonId}`;
        await wooCommerceAPI.cancelOrder(orderId, reason);

        return {
            context: {
                ...context,
                action: 'on_cancel'
            },
            message: {
                order: {
                    id: orderId,
                    state: 'Cancelled',
                    cancellation_reason_id: cancellationReasonId
                }
            }
        };
    } catch (error) {
        throw new Error(`Cancellation failed: ${error.message}`);
    }
};

module.exports = {
    validateCancellation,
    processCancellation
};
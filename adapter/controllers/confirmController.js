const logger = require('../utils/logger');
const confirmService = require('../services/confirmService');
const { ApiError } = require('../utils/errorHandler');

const processConfirmRequest = async (req, res, next) => {
    const transactionId = req.body?.context?.transaction_id || 'unknown';
    
    try {
        logger.info('Received confirm request', { 
            transactionId,
            body: JSON.stringify(req.body)
        });

        // Send immediate ACK
        res.status(202).json({
            message: {
                ack: { status: "ACK" }
            }
        });

        // Process asynchronously
        Promise.resolve().then(async () => {
            try {
                const response = await confirmService.processConfirm(req.body);
                
                logger.info('Confirm request processed successfully', {
                    transactionId,
                    orderId: response.message.order.id
                });

                // Send on_confirm callback
                const onConfirmService = require('../services/onConfirmService');
                await onConfirmService.sendOnConfirmCallback(response);
            } catch (error) {
                logger.error('Async confirm processing failed', {
                    transactionId,
                    error: error.message,
                    stack: error.stack
                });
            }
        });

    } catch (error) {
        logger.error('Confirm request failed', {
            transactionId,
            error: error.message
        });
        next(error);
    }
};

module.exports = { processConfirmRequest };
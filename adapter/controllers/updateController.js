const logger = require("../utils/logger");
const handleError = require("../utils/errorHandler");
const { sendOnUpdateResponse } = require("../services/updateService");

const handleUpdateRequest = async (req, res) => {
  const { context, message } = req.body;
  
  try {
    logger.info("Update request received", { transactionId: context.transaction_id });
    
    // Send acknowledgment response
    const ackResponse = {
      context: {
        ...context,
        timestamp: new Date().toISOString()
      },
      message: {
        ack: {
          status: "ACK"
        }
      }
    };

    res.status(200).json(ackResponse);
    
    // Log update request details
    console.log("\n===== PROCESSING UPDATE REQUEST =====");
    console.log(`Transaction ID: ${context.transaction_id}`);
    console.log(`BAP URI: ${context.bap_uri}`);
    console.log(`Order ID: ${message.order_id}`);
    
    // Process update and send on_update callback
    await sendOnUpdateResponse(context, message);
    
    logger.info("Update response processed and sent to BAP", { 
      transactionId: context.transaction_id,
      orderId: message.order_id
    });
  } catch (error) {
    logger.error(`Error handling update request: ${error.message}`, {
      error: error.stack,
      transactionId: context?.transaction_id
    });
    
    // If response wasn't already sent, send error response
    if (!res.headersSent) {
      handleError(res, error);
    }
  }
};

module.exports = {
  handleUpdateRequest
};
const logger = require("../utils/logger");
const handleError = require("../utils/errorHandler");
const { sendOnStatusResponse, getLocalOnStatusResponse } = require("../services/statusService");

const handleStatusRequest = async (req, res) => {
  const { context, message } = req.body;
  
  try {
    logger.info(`Status request received for transaction ID: ${context.transaction_id}, order ID: ${message.order_id}`);
    logger.debug(`Request body: ${JSON.stringify(req.body)}`);
    
    // Send immediate acknowledgement
    logger.debug(`Preparing acknowledgement response`);
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

    logger.info(`Sending acknowledgement for status request, transaction ID: ${context.transaction_id}`);
    res.status(200).json(ackResponse);
    logger.debug(`Acknowledgement sent with status 200`);
    
    // DEVELOPMENT MODE: Generate and log the response
    try {
      logger.info(`Processing status request asynchronously after sending ACK`);
      
      // Generate the response without sending it
      logger.debug(`Generating on_status response locally`);
      const onStatusResponse = await getLocalOnStatusResponse(context, message);
      logger.debug(`Local on_status response generated successfully`);
      
      // Format and log the response for better readability
      logger.debug(`Logging formatted response for development purposes`);
      console.log("\n===== ON_STATUS RESPONSE START =====");
      console.log(JSON.stringify(onStatusResponse, null, 2));
      console.log("===== ON_STATUS RESPONSE END =====\n");
      
      logger.info(`Generated on_status response (not sent to BAP)`, { 
        transactionId: context.transaction_id,
        orderId: message.order_id
      });
      
      // PRODUCTION MODE (Commented out):
      // logger.debug(`PRODUCTION MODE: Would now send response to BAP`);
      // await sendOnStatusResponse(context, message);
      // logger.info("Status response sent to BAP", { 
      //   transactionId: context.transaction_id,
      //   orderId: message.order_id
      // });
    } catch (error) {
      logger.error(`Failed to generate status response: ${error.message}`, { 
        transactionId: context.transaction_id,
        orderId: message.order_id,
        error: error.message,
        stack: error.stack
      });
      logger.debug(`Error stack: ${error.stack}`);
    }
  } catch (error) {
    logger.error(`Error in handleStatusRequest: ${error.message}`, {
      transactionId: context?.transaction_id,
      error: error.message,
      stack: error.stack
    });
    logger.debug(`Error details: ${error.stack}`);
    handleError(res, error, "Error processing /status request");
  }
};

module.exports = {
  handleStatusRequest
};
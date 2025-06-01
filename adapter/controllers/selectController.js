const selectService = require("../services/selectService");
const handleError = require("../utils/errorHandler");
const logger = require("../utils/logger");

const handleSelectRequest = async (req, res) => {
  const { context, message } = req.body;
  const order = message.order;
  const transactionId = context.transaction_id;

  try {
    logger.info("Select request received", { transactionId });
    
    // Send acknowledgment response
    const ackResponse = {
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      message: {
        ack: {
          status: "ACK",
        },
      },
    };
    res.status(200).json(ackResponse);
    
    logger.info("Select acknowledgment sent", { transactionId });

    // Process select request asynchronously
    try {
      // Send on_select response to BAP
      await selectService.sendOnSelectResponse(context, message);
      
      logger.info("On_select response sent successfully", { transactionId });
    } catch (error) {
      logger.error("Error processing select request", {
        transactionId,
        error: error.message,
        stack: error.stack
      });
    }
  } catch (error) {
    logger.error("Error handling select request", {
      transactionId,
      error: error.message,
      stack: error.stack
    });
    handleError(error, res);
  }
};

module.exports = {
  handleSelectRequest,
};
const logger = require("../utils/logger");
const handleError = require("../utils/errorHandler");
const { sendOnSearchResponse } = require("../services/searchService");

const handleSearchRequest = async (req, res) => {
  const { context, message } = req.body;
  
  try {
    logger.info("Search request received", { transactionId: context.transaction_id });
    
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
    
    try {
      console.log("\n===== PROCESSING SEARCH REQUEST =====");
      console.log(`Transaction ID: ${context.transaction_id}`);
      console.log(`BAP URI: ${context.bap_uri}`);
      if (message.intent) {
        console.log(`Search Category: ${message.intent.category?.id || 'All Categories'}`);
      }
      
      const onSearchResponse = await sendOnSearchResponse(context, message);
      
      logger.info("Search response processed (not sent to BAP)", { 
        transactionId: context.transaction_id 
      });
    } catch (error) {
      logger.error("Failed to process search response", { 
        transactionId: context.transaction_id,
        error: error.message,
        stack: error.stack
      });
      console.error("Error processing search:", error.message);
    }
  } catch (error) {
    handleError(res, error, "Error processing /search request");
  }
};

module.exports = { handleSearchRequest };
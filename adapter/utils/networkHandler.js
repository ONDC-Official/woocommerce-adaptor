const axios = require("axios");
const logger = require("./logger");

const makeRequest = async (method, url, data = null, headers = {}, transactionId = null) => {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      ...(data && { data })
    };
    
    logger.info(`Making ${method.toUpperCase()} request to ${url}`, { transactionId });
    
    const response = await axios(config);
    
    logger.info(`Request to ${url} successful`, { 
      transactionId,
      status: response.status 
    });
    
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    
    logger.error(`Request to ${url} failed`, {
      transactionId,
      status,
      error: error.message,
      responseData
    });
    
    throw error;
  }
};

module.exports = {
  makeRequest
};
const axios = require('axios');

/**
 * Test the ONDC cancel API endpoint
 * @param {string} orderId - The order ID to cancel
 * @param {string} reasonId - Cancellation reason code
 */
async function testCancelRequest(orderId, reasonId = '001') {
  // Generate unique identifiers for this test
  const now = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const timestamp = new Date().toISOString();
  
  // Create unique transaction and message IDs
  const transactionId = `T_${randomStr}_${now}`;
  const messageId = `M_${randomStr}_${now}`;
  
  // Build the payload
  const payload = {
    "context": {
      "domain": "retail",
      "action": "cancel",
      "core_version": "1.0.0",
      "bap_id": "buyer-app.ondc.org",
      "bap_uri": "http://localhost:3000/webhook", // Use local webhook for testing
      "bpp_id": "woocommerce-test-adaptor.ondc.org",
      "bpp_uri": "http://localhost:3000/api/v1",
      "transaction_id": transactionId,
      "message_id": messageId,
      "timestamp": timestamp,
      "country": "IND",
      "city": "std:080",
      "ttl": "PT30S"
    },
    "message": {
      "order_id": orderId,
      "cancellation_reason_id": reasonId,
      "descriptor": {
        "name": "test_descriptor",
        "short_desc": "Customer requested cancellation"
      }
    }
  };

  try {
    console.log('\n=== Testing ONDC Cancel API ===');
    console.log(`Order ID: ${orderId}`);
    console.log(`Cancellation Reason: ${reasonId}`);
    console.log(`Transaction ID: ${transactionId}`);
    
    const response = await axios.post('http://localhost:3000/api/v1/cancel', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\nResponse:', {
      status: response.status,
      ack: response.data?.message?.ack,
      error: response.data?.error
    });
    
    // Wait for cancel processing to complete
    console.log('\nWaiting for cancel processing...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    
    // Verify the order status (optional)
    try {
      console.log('\nChecking order status (if available)...');
      const verifyResponse = await axios.get(`http://localhost:3000/api/v1/order/${orderId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Order status:', verifyResponse.data?.message?.order?.state || 'unknown');
    } catch (verifyError) {
      console.log('Could not verify order status:', verifyError.message);
    }
    
    console.log('\nTest complete! Check WooCommerce admin for cancelled order.');
  } catch (error) {
    console.error('\nError occurred:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const orderId = args[0] || '15'; // Default to order ID 15
const reasonId = args[1] || '001'; // Default reason: Order delivery delayed

// Run the test
console.log(`Starting cancel test for Order ID: ${orderId} with Reason: ${reasonId}`);
testCancelRequest(orderId, reasonId);
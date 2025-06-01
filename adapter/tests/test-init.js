const axios = require('axios');

async function testInit() {
  // Generate dynamic values
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  const payload = {
    "context": {
      "domain": "retail",
      "action": "init",
      "core_version": "1.0.0",
      "bap_id": "woocommerce-test-adaptor.ondc.org",
      "bap_uri": "https://buyer-app.ondc.org/callback",
      "bpp_id": "woocommerce-test-adaptor.ondc.org",
      "bpp_uri": "http://localhost:3000/api/v1",
      "transaction_id": "T_20250404_",
      "message_id": "M_20250404_",
      "timestamp": "2024-01-01T10:30:00Z",
      "country": "IND",
      "city": "std:080"
    },
    "message": {
      "order": {
        "provider": {
          "id": "woocommerce-test-adaptor.ondc.org"
        },
        "items": [
          {
            "id": "product-1",
            "quantity": {
              "count": 1
            },
            "fulfillment_id": "fulfillment-1"
          }
        ],
        "billing": {
          "name": "Test Customer",
          "phone": "9999999999",
          "email": "test@example.com",
          "address": {
            "name": "Home",
            "building": "123 Test Building",
            "locality": "Test Locality",
            "city": "Bangalore",
            "state": "Karnataka",
            "country": "India",
            "area_code": "560001"
          }
        },
        "fulfillments": [
          {
            "id": "fulfillment-1",
            "type": "Delivery",
            "end": {
              "location": {
                "address": {
                  "name": "Home",
                  "building": "123 Test Building",
                  "locality": "Test Locality",
                  "city": "Bangalore",
                  "state": "Karnataka",
                  "country": "India",
                  "area_code": "560001"
                }
              },
              "contact": {
                "phone": "9999999999"
              }
            }
          }
        ]
      }
    }
  };

  try {
    const response = await axios.post('http://localhost:3000/api/v1/init', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testInit();
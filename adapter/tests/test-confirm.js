const axios = require('axios');
const logger = require('../utils/logger');

async function testInit() {
    // Generate unique identifiers
    const now = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    
    const payload = {
        context: {
            domain: "ONDC:RET10",
            action: "init",
            core_version: "1.1.0",
            bap_id: "buyer-app.ondc.org",
            bap_uri: "http://localhost:3000",
            bpp_id: "woocommerce-test-adaptor.ondc.org",
            bpp_uri: "http://localhost:3000/api/v1",
            transaction_id: `T_${randomStr}_${now}`,
            message_id: `M_${randomStr}_${now}`,
            timestamp: new Date().toISOString(),
            country: "IND",
            city: "std:080"
        },
        message: {
            order: {
                items: [{
                    id: "test-product-1",
                    quantity: { count: 1 }
                }],
                billing: {
                    name: `Test Customer ${randomStr}`,
                    phone: "9999999999",
                    email: `test.${randomStr}@example.com`,
                    address: {
                        building: "123 Test Building",
                        city: "Bangalore",
                        state: "Karnataka",
                        country: "India",
                        area_code: "560001"
                    }
                }
            }
        }
    };

    try {
        console.log('\n=== Testing ONDC Init API ===');
        console.log('Transaction ID:', payload.context.transaction_id);
        const response = await axios.post('http://localhost:3000/api/v1/init', payload);
        return response.data;
    } catch (error) {
        console.error('Init Error:', error.message);
        throw error;
    }
}

async function testConfirm(orderId) {
    if (!orderId) {
        throw new Error('Order ID is required for confirm action');
    }

    const now = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    
    const payload = {
        context: {
            domain: "ONDC:RET10",
            action: "confirm",
            core_version: "1.1.0",
            bap_id: "buyer-app.ondc.org",
            bap_uri: "http://localhost:3000",
            bpp_id: "woocommerce-test-adaptor.ondc.org",
            bpp_uri: "http://localhost:3000/api/v1",
            transaction_id: `T_${randomStr}_${now}`,
            message_id: `M_${randomStr}_${now}`,
            timestamp: new Date().toISOString(),
            country: "IND",
            city: "std:080"
        },
        message: {
            order: {
                id: orderId,
                state: "Created"
            }
        }
    };

    try {
        console.log('\n=== Testing ONDC Confirm API ===');
        console.log('Transaction ID:', payload.context.transaction_id);
        console.log('Order ID:', orderId);
        
        const response = await axios.post('http://localhost:3000/api/v1/confirm', payload);
        return response.data;
    } catch (error) {
        console.error('Confirm Error:', error.message);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    const action = process.argv[2];
    const orderId = process.argv[3];

    if (!action || !['init', 'confirm'].includes(action)) {
        console.error('Usage: node test-confirm.js <action> [orderId]');
        console.error('Actions: init, confirm');
        console.error('Example: node test-confirm.js init');
        console.error('Example: node test-confirm.js confirm 123');
        process.exit(1);
    }

    (async () => {
        try {
            if (action === 'init') {
                const result = await testInit();
                console.log('\nInit Response:', result);
            } else {
                const result = await testConfirm(orderId);
                console.log('\nConfirm Response:', result);
            }
        } catch (error) {
            console.error('\nError:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { testInit, testConfirm };
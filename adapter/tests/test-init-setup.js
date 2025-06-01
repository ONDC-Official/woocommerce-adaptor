require('dotenv').config();
const wooCommerceAPI = require('../utils/wooCommerceAPI');
const logger = require('../utils/logger');
const config = require('../config/test-config');

async function getNextSequentialId() {
    const [lastProductId, lastOrderId] = await Promise.all([
        wooCommerceAPI.getLastProductId(),
        wooCommerceAPI.getLastOrderNumber()
    ]);
    return Math.max(lastProductId, lastOrderId) + 1;
}

async function initializeTestData() {
    try {
        const nextId = await getNextSequentialId();
        
        // Create product
        const productData = {
            name: `Test Product ${nextId}`,
            type: config.product.type,
            regular_price: config.product.defaultPrice,
            description: `Test product ${nextId}`,
            status: config.product.status,
            manage_stock: config.product.manage_stock,
            stock_quantity: config.product.defaultStock,
            sku: `TEST-${nextId}`,
            meta_data: [{
                key: 'sequence_number',
                value: nextId.toString()
            }]
        };

        const product = await wooCommerceAPI.createProduct(productData);

        // Create order
        const orderData = {
            status: config.order.status.initial,
            payment_method: config.order.payment.method,
            payment_method_title: config.order.payment.title,
            billing: {
                first_name: 'Test Customer',
                email: `test${nextId}@example.com`,
                phone: config.customer.phone,
                ...config.customer.address
            },
            shipping: {
                first_name: 'Test Customer',
                ...config.customer.address
            },
            line_items: [{
                product_id: product.id,
                quantity: 1
            }],
            meta_data: [{
                key: 'sequence_number',
                value: nextId.toString()
            }]
        };

        const order = await wooCommerceAPI.createOrder(orderData);

        return { order, product };
    } catch (error) {
        logger.error('Test setup failed', { error: error.message });
        throw error;
    }
}

if (require.main === module) {
    initializeTestData()
        .then(({ order, product }) => {
            console.log('\nTest Setup completed successfully!');
            console.log(`Product ID: ${product.id}, Order ID: ${order.id}`);
        })
        .catch(error => {
            console.error('Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = initializeTestData;
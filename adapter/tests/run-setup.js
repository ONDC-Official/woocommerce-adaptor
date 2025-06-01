require('dotenv').config();
const setupWooCommerce = require('./setup-woocommerce');

console.log('Starting WooCommerce setup...');
console.log('Using WooCommerce URL:', process.env.WOO_BASE_URL);

setupWooCommerce()
    .then(({ product, order }) => {
        console.log('\nSetup completed successfully!');
        console.log('Product created:', {
            id: product.id,
            name: product.name,
            sku: product.sku
        });
        console.log('Order created:', {
            id: order.id,
            status: order.status
        });
    })
    .catch(error => {
        console.error('Setup failed:', error.message);
        process.exit(1);
    });
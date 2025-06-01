module.exports = {
    product: {
        type: 'simple',
        status: 'publish',
        manage_stock: true,
        defaultPrice: process.env.DEFAULT_PRODUCT_PRICE || '99.99',
        defaultStock: parseInt(process.env.DEFAULT_STOCK_QUANTITY) || 100
    },
    order: {
        payment: {
            method: process.env.DEFAULT_PAYMENT_METHOD || 'cod',
            title: process.env.DEFAULT_PAYMENT_TITLE || 'Cash on Delivery'
        },
        status: {
            initial: 'pending',
            confirmed: 'processing',
            cancelled: 'cancelled'
        }
    },
    customer: {
        phone: process.env.DEFAULT_PHONE || '9999999999',
        address: {
            line1: process.env.DEFAULT_ADDRESS || '123 Test Building',
            city: process.env.DEFAULT_CITY || 'Bangalore',
            state: process.env.DEFAULT_STATE || 'Karnataka',
            postcode: process.env.DEFAULT_POSTCODE || '560001',
            country: process.env.DEFAULT_COUNTRY || 'India'
        }
    },
    defaults: {
        reasonCode: process.env.DEFAULT_REASON_CODE || '001',
        orderId: process.env.DEFAULT_ORDER_ID || '15'
    }
};
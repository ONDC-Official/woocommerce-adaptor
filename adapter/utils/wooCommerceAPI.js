const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const logger = require('./logger');
require('dotenv').config();

class WooCommerceAPI {
    constructor() {
        logger.info('Initializing WooCommerce API');
        
        if (!process.env.WOO_BASE_URL || !process.env.WOO_CONSUMER_KEY || !process.env.WOO_CONSUMER_SECRET) {
            throw new Error('Missing required WooCommerce configuration');
        }

        this.api = new WooCommerceRestApi({
            url: process.env.WOO_BASE_URL,
            consumerKey: process.env.WOO_CONSUMER_KEY,
            consumerSecret: process.env.WOO_CONSUMER_SECRET,
            version: process.env.WOO_API_VERSION || 'wc/v3',
            queryStringAuth: true
        });
    }

    async findProductBySku(sku) {
        try {
            const response = await this.api.get('products', { sku });
            return response.data.length > 0 ? response.data[0] : null;
        } catch (error) {
            logger.error('Find product failed', { error: error.message, sku });
            throw error;
        }
    }

    async createProduct(data) {
        try {
            const response = await this.api.post('products', data);
            logger.info('Product created', { id: response.data.id });
            return response.data;
        } catch (error) {
            logger.error('Create product failed', { error: error.message });
            throw error;
        }
    }

    async createOrder(data) {
        try {
            const response = await this.api.post('orders', data);
            logger.info('Order created', { id: response.data.id });
            return response.data;
        } catch (error) {
            logger.error('Create order failed', { error: error.message });
            throw error;
        }
    }

    async getOrders(params = {}) {
        try {
            const response = await this.api.get('orders', {
                orderby: 'date',
                order: 'desc',
                per_page: 100,
                ...params
            });
            return response.data;
        } catch (error) {
            logger.error('Get orders failed', { error: error.message });
            throw error;
        }
    }

    async getOrder(orderId) {
        try {
            logger.info('Getting order', { orderId });
            const response = await this.api.get(`orders/${orderId}`);
            return response.data;
        } catch (error) {
            logger.error('Get order failed', { error: error.message, orderId });
            throw error;
        }
    }

    async updateOrder(orderId, data) {
        try {
            logger.info('Updating order', { orderId, data });
            const response = await this.api.put(`orders/${orderId}`, data);
            return response.data;
        } catch (error) {
            logger.error('Update order failed', { error: error.message, orderId });
            throw error;
        }
    }

    async cancelOrder(orderId, reason) {
        try {
            logger.info('Cancelling order', { orderId, reason });
            return await this.updateOrder(orderId, {
                status: 'cancelled',
                meta_data: [{ key: 'cancel_reason', value: reason }]
            });
        } catch (error) {
            logger.error('Cancel order failed', { error: error.message, orderId });
            throw error;
        }
    }

    async confirmOrder(orderId) {
        try {
            logger.info('Confirming order', { orderId });
            return await this.updateOrder(orderId, {
                status: 'processing',
                meta_data: [{ 
                    key: 'confirmation_time', 
                    value: new Date().toISOString() 
                }]
            });
        } catch (error) {
            logger.error('Confirm order failed', { error: error.message, orderId });
            throw error;
        }
    }

    async getLastOrderNumber() {
        try {
            const orders = await this.getOrders({
                per_page: 1,
                orderby: 'id',
                order: 'desc'
            });

            if (orders.length === 0) return 0;

            // Try to get custom order number from meta data
            const orderNumberMeta = orders[0].meta_data.find(
                meta => meta.key === 'ondc_order_number'
            );

            if (orderNumberMeta) {
                return parseInt(orderNumberMeta.value);
            }

            // Fallback to WooCommerce order number
            return parseInt(orders[0].number) || 0;
        } catch (error) {
            logger.error('Get last order number failed', { error: error.message });
            return 0;
        }
    }

    async getLastProductId() {
        try {
            const response = await this.api.get('products', {
                per_page: 1,
                orderby: 'id',
                order: 'desc'
            });
            return response.data[0]?.id || 0;
        } catch (error) {
            logger.error('Get last product ID failed', { error: error.message });
            return 0;
        }
    }
}

// Create and export singleton instance
const wooCommerceAPI = new WooCommerceAPI();
module.exports = wooCommerceAPI;


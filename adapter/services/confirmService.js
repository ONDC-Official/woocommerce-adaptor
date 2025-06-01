const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { ApiError } = require('../utils/errorHandler');
const wooCommerceAPI = require('../utils/wooCommerceAPI');
const callbackHandler = require('../utils/callbackHandler');

/**
 * Process ONDC confirm request
 * @param {Object} request - ONDC confirm request payload
 * @returns {Promise<Object>} ONDC on_confirm response
 */
const processConfirm = async (request) => {
    const transactionId = request.context.transaction_id;
    const orderId = request.message?.order?.id;

    try {
        logger.info('Processing confirm request', {
            transactionId,
            orderId
        });

        // Find order by ONDC transaction ID if orderId doesn't exist directly
        let order;
        try {
            order = await wooCommerceAPI.getOrder(orderId);
        } catch (error) {
            if (error.response?.status === 404) {
                // Try finding order by meta data
                const orders = await wooCommerceAPI.getOrders({
                    search: transactionId,
                    meta_key: 'ondc_transaction_id'
                });

                if (orders && orders.length > 0) {
                    order = orders[0];
                } else {
                    throw new ApiError('Order not found', 404);
                }
            } else {
                throw error;
            }
        }

        if (!order) {
            throw new ApiError('Order not found', 404);
        }

        // Update order status to processing
        const updatedOrder = await wooCommerceAPI.updateOrder(order.id, {
            status: 'processing',
            meta_data: [
                ...(order.meta_data || []),
                {
                    key: 'ondc_confirmed',
                    value: 'true'
                },
                {
                    key: 'ondc_confirm_transaction_id',
                    value: transactionId
                }
            ]
        });

        logger.info('Order confirmed successfully', {
            transactionId,
            orderId: order.id,
            status: updatedOrder.status
        });

        // Prepare on_confirm response
        return {
            context: {
                ...request.context,
                action: 'on_confirm'
            },
            message: {
                order: {
                    id: order.id,
                    state: 'Accepted',
                    provider: {
                        id: config.store.id
                    },
                    items: order.line_items.map(item => ({
                        id: item.product_id.toString(),
                        quantity: {
                            count: item.quantity
                        },
                        price: {
                            currency: "INR",
                            value: item.total
                        }
                    })),
                    billing: {
                        name: order.billing.first_name,
                        address: {
                            name: order.billing.first_name,
                            building: order.billing.address_1,
                            locality: order.billing.address_2,
                            city: order.billing.city,
                            state: order.billing.state,
                            country: order.billing.country,
                            area_code: order.billing.postcode
                        },
                        email: order.billing.email,
                        phone: order.billing.phone
                    },
                    fulfillment: {
                        type: "Delivery",
                        tracking: false,
                        start: {
                            location: {
                                gps: config.store.gps,
                                address: {
                                    name: config.store.name,
                                    locality: config.store.locality,
                                    city: config.store.city,
                                    state: config.store.state,
                                    area_code: config.store.areaCode
                                }
                            },
                            contact: {
                                phone: config.store.phone,
                                email: config.store.email
                            }
                        },
                        end: {
                            location: {
                                gps: order.shipping?.gps || "",
                                address: {
                                    name: order.shipping.first_name,
                                    building: order.shipping.address_1,
                                    locality: order.shipping.address_2,
                                    city: order.shipping.city,
                                    state: order.shipping.state,
                                    country: order.shipping.country,
                                    area_code: order.shipping.postcode
                                }
                            },
                            contact: {
                                phone: order.billing.phone,
                                email: order.billing.email
                            }
                        }
                    },
                    quote: {
                        price: {
                            currency: "INR",
                            value: order.total
                        },
                        breakup: [
                            {
                                title: "Net Amount",
                                price: {
                                    currency: "INR",
                                    value: order.total
                                }
                            }
                        ]
                    },
                    payment: {
                        status: "NOT-PAID",
                        type: "POST-FULFILLMENT",
                        collected_by: "BAP"
                    },
                    created_at: order.date_created,
                    updated_at: order.date_modified
                }
            }
        };
    } catch (error) {
        logger.error('Confirm processing failed', {
            transactionId,
            orderId,
            error: error.message
        });
        throw error;
    }
};

/**
 * Send on_confirm callback to BAP
 * @param {Object} ondcResponse - ONDC on_confirm response
 * @returns {Promise<boolean>} Success status
 */
const sendOnConfirmCallback = async (ondcResponse) => {
  const { context } = ondcResponse;
  const transactionId = context.transaction_id;
  const orderId = ondcResponse.message.order.id;
  
  try {
    logger.info('Sending on_confirm callback to BAP', {
      transactionId,
      orderId,
      bapUri: context.bap_uri
    });
    
    // Use the callback handler to send and manage retries
    const result = await callbackHandler.sendCallback(
      `${context.bap_uri}/on_confirm`,
      ondcResponse,
      transactionId,
      'on_confirm'
    );
    
    if (result.success) {
      // Update order status to Accepted
      await updateOrderToAccepted(orderId, transactionId);
      
      logger.info('Successfully updated order to Accepted status', {
        transactionId,
        orderId
      });
      
      return true;
    } else {
      // If callback failed after retries, cancel the order
      await cancelOrder(context, '998', 'Order cancelled because of order confirmation failure');
      return false;
    }
  } catch (error) {
    logger.error('Error sending on_confirm callback', {
      transactionId,
      orderId,
      error: error.message
    });
    
    // Cancel the order if callback fails
    await cancelOrder(context, '998', 'Order cancelled because of order confirmation failure');
    return false;
  }
};

/**
 * Cancel order with reason code
 * @param {Object} context - ONDC context
 * @param {string} reasonCode - Cancellation reason code
 * @param {string} reasonDescription - Cancellation reason description
 * @returns {Promise<boolean>} Success status
 */
const cancelOrder = async (context, reasonCode, reasonDescription) => {
  const transactionId = context.transaction_id;
  
  try {
    // Find WooCommerce order by transaction ID
    const orders = await wooCommerceAPI.getOrders({
      meta_key: 'ondc_transaction_id',
      meta_value: transactionId
    });
    
    if (!orders || orders.length === 0) {
      logger.warn('Order not found for cancellation', {
        transactionId
      });
      return false;
    }
    
    const wooOrderId = orders[0].id;
    
    // Update order status and metadata
    await wooCommerceAPI.updateOrder(wooOrderId, {
      status: 'cancelled',
      meta_data: [
        { key: 'ondc_state', value: 'Cancelled' },
        { key: 'ondc_cancellation_reason', value: reasonCode },
        { key: 'ondc_cancellation_description', value: reasonDescription },
        { key: 'ondc_updated_at', value: new Date().toISOString() }
      ]
    });
    
    logger.info('Order cancelled', {
      wooOrderId,
      transactionId,
      reasonCode,
      reasonDescription
    });
    
    return true;
  } catch (error) {
    logger.error('Error cancelling order', {
      error: error.message,
      transactionId,
      reasonCode
    });
    
    return false;
  }
};

module.exports = {
  processConfirm,
  sendOnConfirmCallback,
  cancelOrder
};
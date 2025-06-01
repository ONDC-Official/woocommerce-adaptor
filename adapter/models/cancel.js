const Joi = require('joi');

// Schema for ONDC cancel request validation
const cancelRequestSchema = Joi.object({
  context: Joi.object({
    domain: Joi.string().required(),
    action: Joi.string().valid('cancel').required(),
    core_version: Joi.string().required(),
    bap_id: Joi.string().required(),
    bap_uri: Joi.string().uri().required(),
    bpp_id: Joi.string().required(),
    bpp_uri: Joi.string().uri().required(),
    transaction_id: Joi.string().required(),
    message_id: Joi.string().required(),
    city: Joi.string(),
    country: Joi.string(),
    timestamp: Joi.string().isoDate().required(),
    ttl: Joi.string()
  }).required(),
  message: Joi.object({
    order_id: Joi.string().required(),
    cancellation_reason_id: Joi.string().required(),
    descriptor: Joi.object({
      name: Joi.string().required(),
      short_desc: Joi.string().required(),
      tags: Joi.array().items(
        Joi.object({
          code: Joi.string().required(),
          list: Joi.array().items(
            Joi.object({
              code: Joi.string().required(),
              value: Joi.string().required()
            })
          )
        })
      )
    }).required()
  }).required()
});

// Schema for ONDC on_cancel request validation
const onCancelRequestSchema = Joi.object({
  context: Joi.object({
    domain: Joi.string().required(),
    action: Joi.string().valid('on_cancel').required(),
    core_version: Joi.string().required(),
    bap_id: Joi.string().required(),
    bap_uri: Joi.string().uri().required(),
    bpp_id: Joi.string().required(),
    bpp_uri: Joi.string().uri().required(),
    transaction_id: Joi.string().required(),
    message_id: Joi.string().required(),
    city: Joi.string(),
    country: Joi.string(),
    timestamp: Joi.string().isoDate().required(),
    ttl: Joi.string()
  }).required(),
  message: Joi.object({
    order: Joi.object({
      id: Joi.string().required(),
      state: Joi.string().valid('Cancelled').required(),
      provider: Joi.object({
        id: Joi.string().required(),
        locations: Joi.array().items(
          Joi.object({
            id: Joi.string().required()
          })
        )
      }).required(),
      items: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          fulfillment_id: Joi.string().required(),
          quantity: Joi.object({
            count: Joi.number().integer().required()
          }).required()
        })
      ).required(),
      billing: Joi.object().required(),
      fulfillments: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          state: Joi.object({
            descriptor: Joi.object({
              code: Joi.string().required()
            }).required()
          }).required()
        })
      ).required(),
      quote: Joi.object().required(),
      cancellation: Joi.object({
        cancelled_by: Joi.string().required(),
        reason: Joi.object({
          id: Joi.string().required()
        }).required()
      }).required()
    }).required()
  }).required()
});

// Validation function for direct use
const validateCancel = (data) => {
  return cancelRequestSchema.validate(data, { abortEarly: false });
};

const validateOnCancel = (data) => {
  return onCancelRequestSchema.validate(data, { abortEarly: false });
};

module.exports = {
  cancelRequestSchema,
  onCancelRequestSchema,
  validateCancel,
  validateOnCancel
};
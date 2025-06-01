const Joi = require('joi');

// Schema for ONDC init request validation
const initRequestSchema = Joi.object({
  context: Joi.object({
    domain: Joi.string().required(),
    action: Joi.string().valid('init').required(),
    core_version: Joi.string().required(),
    bap_id: Joi.string().required(),
    bap_uri: Joi.string().uri().required(),
    bpp_id: Joi.string().required(),
    bpp_uri: Joi.string().uri().required(),
    transaction_id: Joi.string().required(),
    message_id: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    country: Joi.string().required(),
    city: Joi.string().required()
  }).required(),
  
  message: Joi.object({
    order: Joi.object({
      provider: Joi.object({
        id: Joi.string().required()
      }).required(),
      
      items: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          quantity: Joi.object({
            count: Joi.number().integer().min(1).required()
          }).required(),
          fulfillment_id: Joi.string()
        })
      ).min(1).required(),
      
      billing: Joi.object({
        name: Joi.string().required(),
        address: Joi.object({
          name: Joi.string(),
          building: Joi.string(),
          locality: Joi.string(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          country: Joi.string().required(),
          area_code: Joi.string().required()
        }).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().required()
      }).required(),
      
      fulfillments: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().required(),
          end: Joi.object({
            location: Joi.object({
              gps: Joi.string(),
              address: Joi.object({
                name: Joi.string(),
                building: Joi.string(),
                locality: Joi.string(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                country: Joi.string().required(),
                area_code: Joi.string().required()
              }).required()
            }).required(),
            contact: Joi.object({
              phone: Joi.string().required(),
              email: Joi.string().email()
            }).required()
          }).required()
        })
      ).min(1).required()
    }).required()
  }).required()
});

module.exports = {
  initRequestSchema
};

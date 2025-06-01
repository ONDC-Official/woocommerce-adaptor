// Create a file named init.js in the models directory with the following content

const Joi = require('joi');

// Schema for validating ONDC init requests
const initRequestSchema = Joi.object({
  context: Joi.object({
    domain: Joi.string().required(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    action: Joi.string().valid('init').required(),
    core_version: Joi.string().required(),
    bap_id: Joi.string().required(),
    bap_uri: Joi.string().uri().required(),
    bpp_id: Joi.string().required(),
    bpp_uri: Joi.string().uri().required(),
    transaction_id: Joi.string().required(),
    message_id: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    ttl: Joi.string().optional()
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
            count: Joi.number().integer().required()
          }).required(),
          fulfillment_id: Joi.string().optional()
        })
      ).required(),
      billing: Joi.object({
        name: Joi.string().required(),
        address: Joi.object({
          door: Joi.string().optional(),
          name: Joi.string().optional(),
          building: Joi.string().optional(),
          street: Joi.string().optional(),
          locality: Joi.string().optional(),
          ward: Joi.string().optional(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          country: Joi.string().required(),
          area_code: Joi.string().required()
        }).required(),
        phone: Joi.string().required(),
        email: Joi.string().email().required(),
        created_at: Joi.string().isoDate().optional(),
        updated_at: Joi.string().isoDate().optional()
      }).required(),
      fulfillments: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().required(),
          tracking: Joi.boolean().optional(),
          end: Joi.object({
            location: Joi.object({
              gps: Joi.string().pattern(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/).optional(),
              address: Joi.object({
                door: Joi.string().optional(),
                name: Joi.string().optional(),
                building: Joi.string().optional(),
                street: Joi.string().optional(),
                locality: Joi.string().optional(),
                ward: Joi.string().optional(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                country: Joi.string().required(),
                area_code: Joi.string().required()
              }).required()
            }).required(),
            contact: Joi.object({
              phone: Joi.string().required(),
              email: Joi.string().email().optional()
            }).required()
          }).required()
        })
      ).required()
    }).required()
  }).required()
});

// Export the schema
module.exports = {
  initRequestSchema
};
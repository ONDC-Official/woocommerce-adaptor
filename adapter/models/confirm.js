const Joi = require('joi');

// Schema for ONDC confirm request validation
const confirmRequestSchema = Joi.object({
  context: Joi.object({
    domain: Joi.string().required(),
    action: Joi.string().valid('confirm').required(),
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
      state: Joi.string(),
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
          }).required(),
          parent_item_id: Joi.string(),
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
        })
      ).required(),
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
        tax_number: Joi.string(),
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
        created_at: Joi.string().isoDate(),
        updated_at: Joi.string().isoDate()
      }).required(),
      fulfillments: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().required(),
          '@ondc/org/TAT': Joi.string(),
          tracking: Joi.boolean(),
          end: Joi.object({
            person: Joi.object({
              name: Joi.string()
            }),
            contact: Joi.object({
              email: Joi.string().email(),
              phone: Joi.string().required()
            }),
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
            }).required()
          }).required(),
          vehicle: Joi.object({
            registration: Joi.string()
          })
        })
      ).required(),
      quote: Joi.object({
        price: Joi.object({
          currency: Joi.string().required(),
          value: Joi.string().required()
        }).required(),
        breakup: Joi.array().items(
          Joi.object({
            '@ondc/org/item_id': Joi.string().required(),
            '@ondc/org/item_quantity': Joi.object({
              count: Joi.number().integer()
            }),
            title: Joi.string().required(),
            '@ondc/org/title_type': Joi.string().required(),
            price: Joi.object({
              currency: Joi.string().required(),
              value: Joi.string().required()
            }).required(),
            item: Joi.object()
          })
        ).required(),
        ttl: Joi.string()
      }).required(),
      payment: Joi.object({
        uri: Joi.string(),
        tl_method: Joi.string(),
        params: Joi.object(),
        status: Joi.string().required(),
        type: Joi.string().required(),
        collected_by: Joi.string().required(),
        '@ondc/org/buyer_app_finder_fee_type': Joi.string(),
        '@ondc/org/buyer_app_finder_fee_amount': Joi.string(),
        '@ondc/org/settlement_basis': Joi.string(),
        '@ondc/org/settlement_window': Joi.string(),
        '@ondc/org/withholding_amount': Joi.string(),
        '@ondc/org/settlement_details': Joi.array().items(
          Joi.object({
            settlement_counterparty: Joi.string(),
            settlement_phase: Joi.string(),
            settlement_type: Joi.string(),
            upi_address: Joi.string(),
            settlement_bank_account_no: Joi.string(),
            settlement_ifsc_code: Joi.string(),
            beneficiary_name: Joi.string(),
            bank_name: Joi.string(),
            branch_name: Joi.string()
          })
        )
      }).required(),
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
      ),
      created_at: Joi.string().isoDate(),
      updated_at: Joi.string().isoDate()
    }).required()
  }).required()
});

module.exports = {
  confirmRequestSchema
};
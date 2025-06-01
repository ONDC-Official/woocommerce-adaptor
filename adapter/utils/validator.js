const Joi = require('joi');

const validateProduct = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    price: Joi.number().positive().required(),
    category: Joi.string().required(),
    stock: Joi.number().integer().min(0).required(),
  });

  return schema.validate(data);
};

const validateOrder = (data) => {
  const schema = Joi.object({
    customerName: Joi.string().required(),
    email: Joi.string().email().required(),
    products: Joi.array().items(
      Joi.object({
        productId: Joi.number().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
    totalPrice: Joi.number().positive().required(),
  });

  return schema.validate(data);
};

module.exports = {
  validateProduct,
  validateOrder,
};

const express = require('express');
const { validateProduct } = require('../utils/validator'); // Import validation function

const router = express.Router();

router.post('/api/v1/products', (req, res) => {
  const { error } = validateProduct(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  // Proceed with product creation logic here...
  res.status(201).json({ message: 'Product created successfully' });
});

module.exports = router;

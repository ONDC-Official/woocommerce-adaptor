
// Test WooCommerce connection on startup
(async function testWooCommerceConnection() {
  try {
    const isConnected = await wooCommerceAPI.testConnection
// adapter/adapter/utils/config.js
require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    bodyLimit: process.env.BODY_LIMIT || '1mb',
    enableAuthentication: process.env.ENABLE_AUTH === 'true' && process.env.BYPASS_AUTH !== 'true'
  },
  
  woocommerce: {
    url: process.env.WOO_BASE_URL || process.env.WOOCOMMERCE_STORE_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: process.env.WOO_API_VERSION || 'wc/v3',
    timeout: parseInt(process.env.WOO_API_TIMEOUT || '30000')
  },
  
  ondc: {
    // Backward compatibility with existing env variables
    authToken: process.env.ONDC_AUTH_TOKEN,
    subscriberId: process.env.ONDC_SUBSCRIPTION_ID || process.env.ONDC_SUBSCRIBER_ID,
    participantId: process.env.ONDC_PARTICIPANT_ID,
    bppId: process.env.ONDC_BPP_ID,
    bppUri: process.env.ONDC_BPP_URI,
    
    // Registry URLs
    registryUrl: process.env.ONDC_REGISTRY_URL || 'https://staging.registry.ondc.org',
    gatewayUrl: process.env.ONDC_GATEWAY_URL || 'https://staging.gateway.ondc.org',
    
    // Domain configuration
    domain: process.env.ONDC_DOMAIN || 'nic2004:60212',
    country: process.env.ONDC_COUNTRY || 'IND',
    city: process.env.ONDC_CITY || 'std:080',
    type: process.env.ONDC_TYPE || 'BPP', // BPP or BAP
    
    // Cryptographic keys
    signingPublicKey: process.env.ONDC_SIGNING_PUBLIC_KEY,
    signingPrivateKey: process.env.ONDC_SIGNING_PRIVATE_KEY,
    encryptionPublicKey: process.env.ONDC_ENCRYPTION_PUBLIC_KEY,
    encryptionPrivateKey: process.env.ONDC_ENCRYPTION_PRIVATE_KEY,
    ukId: process.env.ONDC_UK_ID || 'UKID1',
    
    // Callback settings
    callbackRetryCount: parseInt(process.env.ONDC_CALLBACK_RETRY_COUNT || '3'),
    callbackRetryDelay: parseInt(process.env.ONDC_CALLBACK_RETRY_DELAY || '5000')
  },
  
  store: {
    name: process.env.STORE_NAME || 'WooCommerce Store',
    gps: process.env.STORE_GPS || '12.956399,77.636803',
    locality: process.env.STORE_LOCALITY || 'Main Street',
    city: process.env.STORE_CITY || 'Bengaluru',
    areaCode: process.env.STORE_AREA_CODE || '560076',
    state: process.env.STORE_STATE || 'Karnataka',
    phone: process.env.STORE_PHONE || '9999999999',
    email: process.env.STORE_EMAIL || 'store@example.com',
    jurisdiction: process.env.STORE_JURISDICTION || 'Bengaluru',
    gstNumber: process.env.STORE_GST_NUMBER || 'GST_NUMBER',
    panNumber: process.env.STORE_PAN_NUMBER || 'PAN_NUMBER'
  },
  
  settlement: {
    beneficiaryName: process.env.SETTLEMENT_BENEFICIARY_NAME || 'Store',
    upiAddress: process.env.SETTLEMENT_UPI_ADDRESS || 'store@upi',
    accountNo: process.env.SETTLEMENT_ACCOUNT_NO || 'XXXXXXXXXX',
    ifscCode: process.env.SETTLEMENT_IFSC_CODE || 'XXXXXXXXX',
    bankName: process.env.SETTLEMENT_BANK_NAME || 'Bank Name',
    branchName: process.env.SETTLEMENT_BRANCH_NAME || 'Branch Name'
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filename: process.env.LOG_FILE,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7')
  },

  WOO_BASE_URL: process.env.WOO_BASE_URL,
  WOO_CONSUMER_KEY: process.env.WOO_CONSUMER_KEY,
  WOO_CONSUMER_SECRET: process.env.WOO_CONSUMER_SECRET,
};
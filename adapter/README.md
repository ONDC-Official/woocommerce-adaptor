<div align="center">

# WooCommerce ONDC Adapter

[![Node.js](https://img.shields.io/badge/Node.js-20.9.0-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![WooCommerce](https://img.shields.io/badge/WooCommerce-7.x-96588A?style=flat-square&logo=woocommerce&logoColor=white)](https://woocommerce.com/)
[![ONDC](https://img.shields.io/badge/ONDC-Protocol-0077B5?style=flat-square)](https://ondc.org/)

*Enterprise-grade WooCommerce to ONDC network integration*

</div>

## Overview

The WooCommerce ONDC Adapter provides seamless integration between WooCommerce stores and the Open Network for Digital Commerce (ONDC) protocol, enabling real-time order processing and management.

## Features

### Core Capabilities

- **Order Initialization** - Dynamic product and order creation
- **Order Confirmation** - Real-time status management
- **Order Cancellation** - Validation with reason codes

### Technical Implementation

| Feature | Description | SLA |
|---------|-------------|-----|
| Response Time | Immediate acknowledgment | < 3s |
| Processing | Asynchronous handling | Background |
| Callbacks | BAP notifications | Guaranteed |
| Configuration | Dynamic business rules | Runtime |

## Installation

```powershell
# Clone repository
git clone https://github.com/your-repo/woocommerce-adaptor
cd woocommerce-adaptor/adapter/adapter

# Install dependencies
npm install @woocommerce/woocommerce-rest-api dotenv --save
```

## Configuration

1. Environment Setup
```properties
# WooCommerce Configuration
WOO_BASE_URL=http://localhost/wordpress2
WOO_CONSUMER_KEY=ck_your_key
WOO_CONSUMER_SECRET=cs_your_secret
WOO_API_VERSION=wc/v3
```

2. Server Initialization
```powershell
npm run start
```

## API Testing

### Initialize Order
```powershell
node tests\test-init-setup.js
```

### Confirm Order
```powershell
node tests\test-confirm-payload.js <order_id>
```

### Cancel Order
```powershell
node tests\test-cancel-payload.js <order_id> <reason_code>
```

## Project Architecture

```
adapter/
├── config/
│   ├── test-config.js          # Dynamic configuration
│   └── ondc-config.js          # ONDC network settings
├── controllers/
│   ├── initController.js       # Initialize order handling
│   ├── confirmController.js    # Confirm order logic
│   ├── cancelController.js     # Cancel order processing
│   └── callbackController.js   # BAP callback handling
├── services/
│   ├── wooCommerceAPI.js      # WooCommerce integration
│   ├── ondcService.js         # ONDC business logic
│   ├── validationService.js   # Request validation
│   ├── queueService.js        # Async job queue
│   └── callbackService.js     # BAP notifications
├── utils/
│   ├── logger.js             # Logging configuration
│   ├── errorHandler.js       # Error management
│   ├── statusMapper.js       # ONDC-WooCommerce status mapping
│   └── validator.js          # Schema validation
├── middleware/
│   └── errorHandler.js      # Error handling middleware
├── models/
│   ├── order.js            # Order data structure
│   └── callback.js         # Callback format
├── tests/
│   ├── unit/
│   │   ├── init.test.js
│   │   ├── confirm.test.js
│   │   └── cancel.test.js
│   ├── integration/
│   │   └── api.test.js
│   ├── test-init-setup.js
│   ├── test-confirm-payload.js
│   └── test-cancel-payload.js
├── routes/
│   ├── init.js             # Initialize endpoints
│   ├── confirm.js         # Confirm endpoints
│   ├── cancel.js         # Cancel endpoints
│   └── callback.js      # Callback endpoints
├── docs/
│   ├── api.md           # API documentation
│   ├── setup.md        # Setup guide
│   └── testing.md      # Testing guide
├── scripts/
│   ├── keyTester.js    # API key validation
│   └── setup.js        # Project setup
├── .env               # Environment variables
├── .env.example      # Example configuration
├── package.json      # Project dependencies
├── server.js         # Main application
└── README.md         # Project documentation
```

## API Documentation

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/init` | POST | Order initialization | < 3s |
| `/confirm` | POST | Order confirmation | < 3s |
| `/cancel` | POST | Order cancellation | < 3s |

## Error Management

- Comprehensive validation
- Automated retry mechanisms
- Structured error logging
- Exception handling

## Monitoring

- Request/Response tracking
- Performance metrics
- Status transition logs

## Support

For technical assistance:
- Open [GitHub Issues](https://github.com/your-repo/woocommerce-adaptor/issues)
- Email: support@example.com

## License

MIT License © 2024

<div align="center">
<sub>Built for enterprise ONDC integration</sub>
</div>
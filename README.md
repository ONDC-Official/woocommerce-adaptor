# ONDC WooCommerce Connector

This adapter connects WooCommerce stores to the ONDC (Open Network for Digital Commerce) network, implementing the required ONDC API contracts and authentication mechanisms.

## Features

- ONDC API endpoints implementation:
  - Search
  - Select
  - Init/On_Init
  - Confirm/On_Confirm
- ONDC Authentication:
  - Request signature verification
  - Registry lookup
  - Secure response signing
  - Key generation utilities

## Authentication Implementation

This connector implements the ONDC authentication mechanism with:

1. **Request Signature Verification**: Using ED25519 public key cryptography
2. **Blake2b Hashing**: For payload integrity verification
3. **Registry Integration**: For participant authentication
4. **Response Signing**: For secure callbacks to buyers

## Setup

### Prerequisites

- Node.js 14+
- WooCommerce store with REST API access
- ONDC Subscription and Registry Access

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-repo/ondc-woocommerce-connector.git
   cd ondc-woocommerce-connector
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Generate cryptographic keys:
   ```
   npm run generate-keys
   ```

4. Copy `.env.example` to `.env` and update with your configuration:
   ```
   cp .env.example .env
   ```

5. Register with ONDC:
   - Use the generated public keys for ONDC registry registration
   - Get your Subscriber ID and UK ID from ONDC
   - Update these values in your `.env` file

### Running the Application

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## Environment Variables

Key environment variables for authentication:

- `ENABLE_AUTH`: Enable/disable authentication middleware (default: true)
- `ONDC_SUBSCRIPTION_ID`: Your ONDC subscription ID
- `ONDC_UK_ID`: Your Unique Key ID from ONDC
- `ONDC_SIGNING_PRIVATE_KEY`: Base64 encoded ED25519 private key
- `ONDC_SIGNING_PUBLIC_KEY`: Base64 encoded ED25519 public key
- `ONDC_ENCRYPTION_PRIVATE_KEY`: Base64 encoded X25519 private key
- `ONDC_ENCRYPTION_PUBLIC_KEY`: Base64 encoded X25519 public key
- `ONDC_REGISTRY_URL`: URL of the ONDC registry

See the `.env.example` file for a complete list of configuration options.

## Authentication Flow

1. **Incoming Request Verification**:
   - Parse the Authorization header
   - Extract keyId, signature, and digest
   - Lookup subscriber in ONDC registry
   - Verify signature using Blake2b hash and ED25519 verification

2. **Outgoing Request Signing**:
   - Generate Blake2b hash of payload
   - Sign the hash with ED25519 private key
   - Format Authorization header according to ONDC specs
   - Send signed request to ONDC network

## API Endpoints

- `/api/v1/search`: Search products in the WooCommerce store
- `/api/v1/select`: Select products and get quote
- `/api/v1/init`: Initialize an order
- `/api/v1/on_init`: Callback for init response
- `/api/v1/confirm`: Confirm an order
- `/api/v1/on_confirm`: Callback for confirm response

## Security Considerations

- Private keys should be kept secure and not shared
- Implement proper API rate limiting in production
- Consider using a secure key management system in production
- Monitor failed authentication attempts

## License

ISC License
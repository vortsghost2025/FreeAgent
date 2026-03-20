# API Integrator Skill

## Overview

The **API Integrator** skill enables Kilo Code to connect to any REST or GraphQL API with comprehensive authentication, rate limiting, retry logic, and request/response transformation capabilities.

## Capabilities

- **Multi-protocol Support**: REST APIs, GraphQL endpoints
- **Authentication**: API keys, Bearer tokens, OAuth 2.0, Basic Auth
- **Rate Limiting**: Automatic handling with configurable limits
- **Retry Logic**: Exponential backoff with jitter
- **Request/Response Transformation**: Transform data before sending or after receiving

## When to Use

Use this skill when you need to:
- Connect to external APIs (weather, database, ML models, etc.)
- Handle authentication securely
- Manage API rate limits automatically
- Transform data between formats
- Create reusable API clients

## Implementation Files

- [`skills/api-integrator/api-client.js`](skills/api-integrator/api-client.js) - Core API client
- [`skills/api-integrator/auth-handlers.js`](skills/api-integrator/auth-handlers.js) - Authentication handlers
- [`skills/api-integrator/rate-limiter.js`](skills/api-integrator/rate-limiter.js) - Rate limiting logic
- [`skills/api-integrator/transformers.js`](skills/api-integrator/transformers.js) - Data transformers
- [`skills/api-integrator/index.js`](skills/api-integrator/index.js) - Main export

## Usage Examples

```javascript
// Basic REST API call
const client = new APIClient({
  baseURL: 'https://api.example.com',
  auth: { type: 'bearer', token: 'your-token' }
});

const data = await client.get('/users/123');

// GraphQL query
const result = await client.graphql({
  query: `query { user(id: $id) { name email } }`,
  variables: { id: '123' }
});

// With rate limiting and retry
const resilientClient = new APIClient({
  baseURL: 'https://api.rate-limited.com',
  rateLimit: { maxRequests: 10, windowMs: 60000 },
  retry: { maxRetries: 3, backoffMs: 1000 }
});
```
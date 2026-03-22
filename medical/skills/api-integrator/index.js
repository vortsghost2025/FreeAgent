/**
 * API Integrator Skill - Main Export
 * 
 * A comprehensive skill for connecting to REST/GraphQL APIs
 * with authentication, rate limiting, retry logic, and data transformation.
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

// Core client
const { APIClient } = require('./api-client');

// Authentication handlers
const { 
  AuthHandler,
  ApiKeyAuthHandler,
  BearerAuthHandler,
  BasicAuthHandler,
  OAuth2Handler,
  CustomHeaderAuthHandler,
  createAuthHandler 
} = require('./auth-handlers');

// Rate limiters
const { 
  RateLimiter,
  SlidingWindowRateLimiter,
  AdaptiveRateLimiter 
} = require('./rate-limiter');

// Transformers
const { 
  DataTransformer,
  createTransformer,
  commonTransformers,
  mapFields,
  pickFields,
  omitFields,
  renameFields,
  flatten,
  unflatten,
  extractPath 
} = require('./transformers');

// Skill metadata
const SKILL_METADATA = {
  name: 'API Integrator',
  version: '1.0.0',
  description: 'Connect to REST/GraphQL APIs with authentication, rate limiting, and data transformation',
  capabilities: [
    'REST API calls',
    'GraphQL queries',
    'API Key authentication',
    'Bearer token authentication',
    'Basic authentication',
    'OAuth 2.0 authentication',
    'Rate limiting (token bucket)',
    'Sliding window rate limiting',
    'Adaptive rate limiting',
    'Exponential backoff retry',
    'Request transformation',
    'Response transformation',
    'Field mapping and renaming',
    'Data flattening/unflattening'
  ]
};

/**
 * Create a pre-configured API client
 * @param {Object} config - Configuration options
 * @returns {APIClient} Configured API client
 */
function createClient(config) {
  return new APIClient(config);
}

/**
 * Create a quick client for simple GET requests
 * @param {string} baseURL - Base URL for the API
 * @param {string} apiKey - Optional API key
 * @returns {APIClient} Simple API client
 */
function createSimpleClient(baseURL, apiKey) {
  return new APIClient({
    baseURL,
    auth: apiKey ? { type: 'apiKey', apiKey } : null
  });
}

/**
 * Create a client with OAuth2 authentication
 * @param {string} baseURL - Base URL for the API
 * @param {Object} oauthConfig - OAuth2 configuration
 * @returns {APIClient} OAuth2 configured client
 */
function createOAuthClient(baseURL, oauthConfig) {
  const client = new APIClient({ baseURL });
  
  const oauthHandler = new OAuth2Handler({
    ...oauthConfig,
    client
  });
  
  client.authHandler = oauthHandler;
  return client;
}

module.exports = {
  // Main client
  APIClient,
  
  // Factory functions
  createClient,
  createSimpleClient,
  createOAuthClient,
  
  // Authentication
  AuthHandler,
  ApiKeyAuthHandler,
  BearerAuthHandler,
  BasicAuthHandler,
  OAuth2Handler,
  CustomHeaderAuthHandler,
  createAuthHandler,
  
  // Rate limiting
  RateLimiter,
  SlidingWindowRateLimiter,
  AdaptiveRateLimiter,
  
  // Transformers
  DataTransformer,
  createTransformer,
  commonTransformers,
  mapFields,
  pickFields,
  omitFields,
  renameFields,
  flatten,
  unflatten,
  extractPath,
  
  // Metadata
  SKILL_METADATA
};
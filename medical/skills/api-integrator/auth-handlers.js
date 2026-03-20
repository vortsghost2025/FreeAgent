/**
 * Authentication Handlers - Support for various auth methods
 * Part of the API Integrator Skill
 */

/**
 * Base authentication handler
 */
class AuthHandler {
  getHeaders() {
    return {};
  }
  
  refreshToken() {
    return Promise.resolve();
  }
}

/**
 * API Key Authentication
 * Supports header or query param authentication
 */
class ApiKeyAuthHandler extends AuthHandler {
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.headerName = config.headerName || 'X-API-Key';
    this.addToQuery = config.addToQuery || false;
  }
  
  getHeaders() {
    return { [this.headerName]: this.apiKey };
  }
}

/**
 * Bearer Token Authentication
 */
class BearerAuthHandler extends AuthHandler {
  constructor(config) {
    super();
    this.token = config.token;
  }
  
  getHeaders() {
    return { 'Authorization': `Bearer ${this.token}` };
  }
  
  setToken(token) {
    this.token = token;
  }
}

/**
 * Basic Authentication
 */
class BasicAuthHandler extends AuthHandler {
  constructor(config) {
    super();
    this.username = config.username;
    this.password = config.password;
  }
  
  getHeaders() {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return { 'Authorization': `Basic ${credentials}` };
  }
}

/**
 * OAuth 2.0 Authentication
 */
class OAuth2Handler extends AuthHandler {
  constructor(config) {
    super();
    this.accessToken = config.accessToken;
    this.tokenType = config.tokenType || 'Bearer';
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tokenUrl = config.tokenUrl;
    this.client = config.client; // Parent API client for token refresh
  }
  
  getHeaders() {
    return { 
      'Authorization': `${this.tokenType} ${this.accessToken}` 
    };
  }
  
  async refreshToken() {
    if (!this.tokenUrl || !this.clientId || !this.clientSecret) {
      throw new Error('OAuth2 refresh not configured');
    }
    
    try {
      const response = await this.client.post(this.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });
      
      this.accessToken = response.data.access_token;
      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`OAuth2 token refresh failed: ${error.message}`);
    }
  }
}

/**
 * Custom Header Authentication
 */
class CustomHeaderAuthHandler extends AuthHandler {
  constructor(config) {
    super();
    this.headers = config.headers || {};
  }
  
  getHeaders() {
    return { ...this.headers };
  }
  
  setHeader(key, value) {
    this.headers[key] = value;
  }
}

/**
 * Create appropriate auth handler based on config
 */
function createAuthHandler(config) {
  if (!config) return null;
  
  switch (config.type) {
    case 'apiKey':
    case 'api_key':
      return new ApiKeyAuthHandler({
        apiKey: config.apiKey,
        headerName: config.headerName,
        addToQuery: config.addToQuery
      });
    
    case 'bearer':
      return new BearerAuthHandler({
        token: config.token
      });
    
    case 'basic':
      return new BasicAuthHandler({
        username: config.username,
        password: config.password
      });
    
    case 'oauth2':
    case 'oauth':
      return new OAuth2Handler({
        accessToken: config.accessToken,
        tokenType: config.tokenType,
        refreshToken: config.refreshToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        tokenUrl: config.tokenUrl,
        client: config.client
      });
    
    case 'custom':
      return new CustomHeaderAuthHandler({
        headers: config.headers
      });
    
    default:
      throw new Error(`Unknown auth type: ${config.type}`);
  }
}

module.exports = { 
  AuthHandler,
  ApiKeyAuthHandler,
  BearerAuthHandler,
  BasicAuthHandler,
  OAuth2Handler,
  CustomHeaderAuthHandler,
  createAuthHandler
};
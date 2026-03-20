/**
 * API Client - Core HTTP client with authentication, rate limiting, and retry logic
 * Part of the API Integrator Skill
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { createAuthHandler } = require('./auth-handlers');
const { RateLimiter } = require('./rate-limiter');
const { createTransformer } = require('./transformers');

class APIClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 30000;
    this.headers = options.headers || {};
    
    // Authentication
    this.auth = options.auth || null;
    this.authHandler = this.auth ? createAuthHandler(this.auth) : null;
    
    // Rate limiting
    this.rateLimit = options.rateLimit || { maxRequests: 100, windowMs: 60000 };
    this.rateLimiter = new RateLimiter(this.rateLimit);
    
    // Retry configuration
    this.retry = options.retry || { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 };
    
    // Request/Response transformers
    this.requestTransformer = createTransformer(options.requestTransform);
    this.responseTransformer = createTransformer(options.responseTransform);
    
    // Logging
    this.logger = options.logger || console;
    
    // Statistics
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0
    };
  }

  /**
   * Build full URL from path
   */
  buildURL(path, queryParams = {}) {
    const url = new URL(path, this.baseURL);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  /**
   * Build request headers
   */
  buildHeaders(additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'KiloCode-API-Client/1.0',
      ...this.headers,
      ...additionalHeaders
    };
    
    if (this.authHandler) {
      const authHeaders = this.authHandler.getHeaders();
      Object.assign(headers, authHeaders);
    }
    
    return headers;
  }

  /**
   * Execute HTTP request with rate limiting and retry
   */
  async request(method, path, options = {}) {
    const { queryParams, body, headers, timeout } = options;
    const url = this.buildURL(path, queryParams);
    
    // Wait for rate limiter
    await this.rateLimiter.acquire();
    
    this.stats.requests++;
    
    return this._executeWithRetry({
      method,
      url,
      headers: this.buildHeaders(headers),
      body: body ? this.requestTransformer.transform(body) : undefined,
      timeout: timeout || this.timeout
    });
  }

  /**
   * Execute request with exponential backoff retry
   */
  async _executeWithRetry(requestOptions, attempt = 0) {
    try {
      const response = await this._makeRequest(requestOptions);
      this.stats.successes++;
      return this.responseTransformer.transform(response);
    } catch (error) {
      // Check if we should retry
      if (this._shouldRetry(error, attempt)) {
        this.stats.retries++;
        const backoffDelay = this._calculateBackoff(attempt);
        this.logger.log(`Retry attempt ${attempt + 1} after ${backoffDelay}ms`);
        
        await this._sleep(backoffDelay);
        return this._executeWithRetry(requestOptions, attempt + 1);
      }
      
      this.stats.failures++;
      throw error;
    }
  }

  /**
   * Determine if request should be retried
   */
  _shouldRetry(error, attempt) {
    if (attempt >= this.retry.maxRetries) return false;
    
    // Retry on network errors, timeouts, and 5xx errors
    if (error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }
    
    if (error.status >= 500) return true;
    if (error.status === 429) return true; // Rate limited
    
    return false;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  _calculateBackoff(attempt) {
    const baseDelay = this.retry.backoffMs * Math.pow(this.retry.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Make the actual HTTP request
   */
  _makeRequest(options) {
    return new Promise((resolve, reject) => {
      const parsedURL = new URL(options.url);
      const isHTTPS = parsedURL.protocol === 'https:';
      const client = isHTTPS ? https : http;
      
      const requestOptions = {
        hostname: parsedURL.hostname,
        port: parsedURL.port || (isHTTPS ? 443 : 80),
        path: parsedURL.pathname + parsedURL.search,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout
      };
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const contentType = res.headers['content-type'] || '';
            let parsedData;
            
            if (contentType.includes('application/json')) {
              parsedData = JSON.parse(data);
            } else {
              parsedData = data;
            }
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                data: parsedData,
                status: res.statusCode,
                headers: res.headers
              });
            } else {
              const error = new Error(`HTTP ${res.statusCode}: ${data}`);
              error.status = res.statusCode;
              error.response = parsedData;
              error.headers = res.headers;
              reject(error);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get(path, options = {}) {
    return this.request('GET', path, options);
  }

  async post(path, body, options = {}) {
    return this.request('POST', path, { ...options, body });
  }

  async put(path, body, options = {}) {
    return this.request('PUT', path, { ...options, body });
  }

  async patch(path, body, options = {}) {
    return this.request('PATCH', path, { ...options, body });
  }

  async delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }

  /**
   * Execute GraphQL query
   */
  async graphql(options = {}) {
    const { query, variables = {}, operationName } = options;
    
    const response = await this.post('/graphql', {
      query,
      variables,
      operationName
    });
    
    if (response.data.errors) {
      const error = new Error('GraphQL Error');
      error.errors = response.data.errors;
      throw error;
    }
    
    return response.data.data;
  }

  /**
   * Get client statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0
    };
  }
}

module.exports = { APIClient };
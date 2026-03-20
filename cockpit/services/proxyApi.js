/**
 * Proxy API Service
 * 
 * Provides safe external API calls through the backend.
 * Uses an allowlist of known services to prevent abuse.
 * 
 * Schema:
 * {
 *   serviceName: "string",
 *   endpoint: "string",
 *   method: "GET | POST | PUT | DELETE",
 *   headers: { "Header-Name": "value" },
 *   body: "string or object"
 * }
 * 
 * Example:
 * {
 *   service: "proxyApi",
 *   payload: {
 *     serviceName: "github",
 *     endpoint: "/repos/octocat/hello-world",
 *     method: "GET"
 *   }
 * }
 */

const https = require('https');
const { URL } = require('url');

// Known service configurations
const SERVICE_CONFIGS = {
  github: {
    baseUrl: 'https://api.github.com',
    defaultHeaders: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'FreeAgent-Cockpit/1.0'
    },
    auth: null // Can be extended with token
  },
  weather: {
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    defaultHeaders: {
      'User-Agent': 'FreeAgent-Cockpit/1.0'
    },
    auth: null // API key
  },
  news: {
    baseUrl: 'https://newsapi.org/v2',
    defaultHeaders: {
      'User-Agent': 'FreeAgent-Cockpit/1.0'
    },
    auth: null // API key
  }
};

class ProxyApiService {
  constructor() {
    this.name = 'proxyApi';
    this.enabled = false;
    this.allowedServices = Object.keys(SERVICE_CONFIGS);
    this.requestLog = [];
  }

  /**
   * Make an API request to a known service
   */
  async request(serviceName, options) {
    const { endpoint, method = 'GET', headers = {}, body = null, timeout = 30000 } = options;
    
    // Validate service
    if (!this.allowedServices.includes(serviceName)) {
      throw new Error(`Service not allowed: ${serviceName}. Allowed: ${this.allowedServices.join(', ')}`);
    }

    const config = SERVICE_CONFIGS[serviceName];
    const url = new URL(endpoint, config.baseUrl);
    
    this.logRequest({ serviceName, endpoint, method, timestamp: Date.now() });
    
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          ...config.defaultHeaders,
          ...headers
        },
        timeout: timeout
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // Try to parse JSON
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            // Keep as string
          }
          
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: parsed,
            service: serviceName,
            endpoint: endpoint
          });
        });
      });

      req.on('error', (error) => {
        reject({
          error: error.message,
          code: error.code,
          service: serviceName,
          endpoint: endpoint
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          code: 'ETIMEDOUT',
          service: serviceName
        });
      });

      if (body) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(bodyStr);
      }

      req.end();
    });
  }

  /**
   * Process a service request
   */
  async process(payload) {
    const { serviceName, endpoint, method, headers, body } = payload;
    
    if (!serviceName) {
      throw new Error('serviceName is required');
    }
    
    if (!endpoint) {
      throw new Error('endpoint is required');
    }
    
    return await this.request(serviceName, { endpoint, method, headers, body });
  }

  /**
   * Log a request
   */
  logRequest(entry) {
    this.requestLog.push(entry);
    if (this.requestLog.length > 100) {
      this.requestLog.shift();
    }
  }

  /**
   * Get allowed services
   */
  getAllowedServices() {
    return this.allowedServices;
  }

  /**
   * Get request history
   */
  getHistory() {
    return this.requestLog;
  }

  /**
   * Get service health
   */
  healthCheck() {
    return {
      service: this.name,
      enabled: this.enabled,
      status: 'ready',
      allowedServices: this.allowedServices,
      requests: this.requestLog.length
    };
  }

  /**
   * Enable/disable service
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Set API key for a service
   */
  setAuth(serviceName, auth) {
    if (SERVICE_CONFIGS[serviceName]) {
      SERVICE_CONFIGS[serviceName].auth = auth;
    }
  }
}

module.exports = ProxyApiService;

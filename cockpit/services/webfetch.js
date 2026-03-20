/**
 * WebFetch Service
 * 
 * Provides indirect web browsing for agents through the backend.
 * Safe, controlled, and logged access to external URLs.
 * 
 * Schema:
 * {
 *   action: "fetch",
 *   url: "string",
 *   method: "GET | POST | PUT | DELETE",
 *   headers: { "Header-Name": "value" },
 *   body: "string or object"
 * }
 * 
 * Example:
 * {
 *   service: "webfetch",
 *   payload: {
 *     action: "fetch",
 *     url: "https://example.com",
 *     method: "GET"
 *   }
 * }
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class WebFetchService {
  constructor() {
    this.name = 'webfetch';
    this.enabled = false;
    this.requestLog = [];
  }

  /**
   * Fetch a URL
   */
  async fetch(options) {
    const { url, method = 'GET', headers = {}, body = null, timeout = 30000 } = options;
    
    this.logRequest({ url, method, headers, timestamp: Date.now() });
    
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'User-Agent': 'FreeAgent-Cockpit/1.0',
          ...headers
        },
        timeout: timeout
      };

      const req = protocol.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: data,
            url: url
          });
        });
      });

      req.on('error', (error) => {
        reject({
          error: error.message,
          code: error.code,
          url: url
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          code: 'ETIMEDOUT',
          url: url
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
    const { action, url, method, headers, body } = payload;
    
    if (action === 'fetch') {
      if (!url) {
        throw new Error('URL is required for fetch action');
      }
      
      return await this.fetch({ url, method, headers, body });
    }
    
    throw new Error(`Unknown action: ${action}`);
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
      requests: this.requestLog.length
    };
  }

  /**
   * Enable/disable service
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

module.exports = WebFetchService;

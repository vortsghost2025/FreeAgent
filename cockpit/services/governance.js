/**
 * Governance & Safety Layer
 * Policy enforcement and safety checks for all services
 */

class GovernanceService {
  constructor(options = {}) {
    this.name = 'governance';
    this.enabled = true;
    
    // Rate limiting
    this.rateLimits = new Map();
    this.defaultRateLimit = options.rateLimit || 100; // requests per minute
    
    // Allowed paths for file operations
    this.allowedPaths = options.allowedPaths || [process.cwd()];
    
    // Allowed external services for API calls
    this.allowedServices = options.allowedServices || [
      'api.github.com',
      'api.openweathermap.org',
      'newsapi.org'
    ];
    
    // Blocked commands/patterns
    this.blockedPatterns = [
      /rm\s+-rf/i,
      /format\s+[a-z]:/i,
      /del\s+[a-z]:\\/i,
      /mkfs/i,
      /dd\s+if=/i,
      /shutdown/i,
      /reboot/i
    ];
    
    // Request log
    this.requestLog = [];
    this.maxLogSize = 1000;
  }

  // Check rate limit
  checkRateLimit(clientId, limit = null) {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const key = `${clientId}:${Math.floor(now / windowMs)}`;
    
    const current = this.rateLimits.get(key) || 0;
    const max = limit || this.defaultRateLimit;
    
    if (current >= max) {
      return { allowed: false, remaining: 0, resetAt: (Math.floor(now / windowMs) + 1) * windowMs };
    }
    
    this.rateLimits.set(key, current + 1);
    return { allowed: true, remaining: max - current - 1, resetAt: (Math.floor(now / windowMs) + 1) * windowMs };
  }

  // Validate file path
  validateFilePath(filePath) {
    const path = require('path');
    const resolved = path.resolve(filePath);
    
    const isAllowed = this.allowedPaths.some(allowed => 
      resolved.startsWith(path.resolve(allowed))
    );
    
    return {
      allowed: isAllowed,
      path: resolved,
      message: isAllowed ? 'Path allowed' : 'Path not in allowed directories'
    };
  }

  // Validate external URL
  validateExternalUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Check if host is in allowed list
      const isAllowed = this.allowedServices.some(service => 
        urlObj.hostname === service || urlObj.hostname.endsWith('.' + service)
      );
      
      // Also allow localhost for development
      const isLocalhost = ['localhost', '127.0.0.1'].includes(urlObj.hostname);
      
      return {
        allowed: isAllowed || isLocalhost,
        hostname: urlObj.hostname,
        message: (isAllowed || isLocalhost) ? 'URL allowed' : 'Hostname not in allowed list'
      };
    } catch (err) {
      return { allowed: false, error: err.message };
    }
  }

  // Check command safety
  validateCommand(command) {
    const isBlocked = this.blockedPatterns.some(pattern => pattern.test(command));
    
    return {
      allowed: !isBlocked,
      command: command,
      message: isBlocked ? 'Command blocked for safety' : 'Command allowed'
    };
  }

  // Log request
  logRequest(clientId, action, details = {}) {
    const entry = {
      timestamp: Date.now(),
      clientId,
      action,
      ...details
    };
    
    this.requestLog.push(entry);
    
    // Trim log if too large
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog = this.requestLog.slice(-this.maxLogSize);
    }
    
    return entry;
  }

  // Get request logs
  getLogs(options = {}) {
    const { clientId, action, limit = 100 } = options;
    
    let filtered = this.requestLog;
    
    if (clientId) {
      filtered = filtered.filter(log => log.clientId === clientId);
    }
    
    if (action) {
      filtered = filtered.filter(log => log.action === action);
    }
    
    return filtered.slice(-limit);
  }

  // Add allowed service
  addAllowedService(hostname) {
    if (!this.allowedServices.includes(hostname)) {
      this.allowedServices.push(hostname);
    }
    return { success: true, allowedServices: this.allowedServices };
  }

  // Remove allowed service
  removeAllowedService(hostname) {
    const index = this.allowedServices.indexOf(hostname);
    if (index > -1) {
      this.allowedServices.splice(index, 1);
    }
    return { success: true, allowedServices: this.allowedServices };
  }

  // Get status
  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      allowedPaths: this.allowedPaths,
      allowedServices: this.allowedServices,
      rateLimit: this.defaultRateLimit,
      requestCount: this.requestLog.length
    };
  }
}

// Factory function
function createGovernance(options) {
  return new GovernanceService(options);
}

module.exports = { GovernanceService, createGovernance };

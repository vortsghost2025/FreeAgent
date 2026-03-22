/**
 * PRODUCTION LOGGING SYSTEM
 * Configurable logger with levels, filters, and formatting
 */

// Log levels (ordered by severity)
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 99
};

// Default configuration
const defaultConfig = {
  level: LogLevel.INFO,
  enableColors: true,
  enableTimestamps: true,
  enableAgentId: true,
  format: 'standard', // 'standard', 'json', 'compact'
  filters: [], // Array of regex patterns to filter out
  outputs: [console] // Array of output targets
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Level colors
const levelColors = {
  [LogLevel.DEBUG]: colors.dim,
  [LogLevel.INFO]: colors.cyan,
  [LogLevel.WARN]: colors.yellow,
  [LogLevel.ERROR]: colors.red,
  [LogLevel.FATAL]: colors.bright + colors.red
};

// Level names
const levelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO ',
  [LogLevel.WARN]: 'WARN ',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

/**
 * Production Logger Class
 */
export class Logger {
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    this.metadata = {};
  }

  /**
   * Set log level
   */
  setLevel(level) {
    this.config.level = level;
  }

  /**
   * Add metadata that will be included in all logs
   */
  addMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Remove metadata
   */
  removeMetadata(key) {
    delete this.metadata[key];
  }

  /**
   * Clear all metadata
   */
  clearMetadata() {
    this.metadata = {};
  }

  /**
   * Add a filter pattern (messages matching will be suppressed)
   */
  addFilter(pattern) {
    this.config.filters.push(pattern);
  }

  /**
   * Check if message should be filtered
   */
  _shouldFilter(message) {
    for (const pattern of this.config.filters) {
      if (pattern.test(message)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Format a log message
   */
  _formatMessage(level, agentId, message, data) {
    if (this.config.format === 'json') {
      return this._formatJSON(level, agentId, message, data);
    } else if (this.config.format === 'compact') {
      return this._formatCompact(level, agentId, message, data);
    } else {
      return this._formatStandard(level, agentId, message, data);
    }
  }

  /**
   * Format as standard console output
   */
  _formatStandard(level, agentId, message, data) {
    let parts = [];

    // Timestamp
    if (this.config.enableTimestamps) {
      const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
      parts.push(colors.dim + timestamp + colors.reset);
    }

    // Level
    const levelColor = levelColors[level] || colors.white;
    const levelName = levelNames[level] || 'LOG  ';
    if (this.config.enableColors) {
      parts.push(levelColor + levelName + colors.reset);
    } else {
      parts.push(levelName);
    }

    // Agent ID
    if (this.config.enableAgentId && agentId) {
      if (this.config.enableColors) {
        parts.push(colors.blue + `[${agentId}]` + colors.reset);
      } else {
        parts.push(`[${agentId}]`);
      }
    }

    // Message
    parts.push(message);

    let output = parts.join(' ');

    // Append data if provided
    if (data !== undefined) {
      if (typeof data === 'object') {
        output += '\n' + JSON.stringify(data, null, 2);
      } else {
        output += ' ' + String(data);
      }
    }

    // Append metadata if present
    if (Object.keys(this.metadata).length > 0) {
      output += colors.dim + ' ' + JSON.stringify(this.metadata) + colors.reset;
    }

    return output;
  }

  /**
   * Format as compact output
   */
  _formatCompact(level, agentId, message, data) {
    const levelName = levelNames[level] || 'LOG';
    let output = `[${levelName}]`;

    if (agentId) {
      output += ` ${agentId}:`;
    }

    output += ` ${message}`;

    if (data !== undefined) {
      output += ` ${JSON.stringify(data)}`;
    }

    return output;
  }

  /**
   * Format as JSON
   */
  _formatJSON(level, agentId, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: levelNames[level] || 'LOG',
      agentId,
      message,
      ...this.metadata
    };

    if (data !== undefined) {
      logEntry.data = data;
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Write log to outputs
   */
  _write(level, formattedMessage) {
    for (const output of this.config.outputs) {
      if (level >= LogLevel.ERROR && output.error) {
        output.error(formattedMessage);
      } else if (level >= LogLevel.WARN && output.warn) {
        output.warn(formattedMessage);
      } else if (output.log) {
        output.log(formattedMessage);
      }
    }
  }

  /**
   * Core logging method
   */
  _log(level, agentId, message, data) {
    // Check level threshold
    if (level < this.config.level) {
      return;
    }

    // Check filters
    if (this._shouldFilter(message)) {
      return;
    }

    // Format and write
    const formatted = this._formatMessage(level, agentId, message, data);
    this._write(level, formatted);
  }

  /**
   * Public logging methods
   */
  debug(agentId, message, data) {
    this._log(LogLevel.DEBUG, agentId, message, data);
  }

  info(agentId, message, data) {
    this._log(LogLevel.INFO, agentId, message, data);
  }

  warn(agentId, message, data) {
    this._log(LogLevel.WARN, agentId, message, data);
  }

  error(agentId, message, data) {
    this._log(LogLevel.ERROR, agentId, message, data);
  }

  fatal(agentId, message, data) {
    this._log(LogLevel.FATAL, agentId, message, data);
  }

  /**
   * Create a child logger with fixed agent ID
   */
  forAgent(agentId) {
    return {
      debug: (message, data) => this.debug(agentId, message, data),
      info: (message, data) => this.info(agentId, message, data),
      warn: (message, data) => this.warn(agentId, message, data),
      error: (message, data) => this.error(agentId, message, data),
      fatal: (message, data) => this.fatal(agentId, message, data)
    };
  }
}

/**
 * Create a logger instance
 */
export function createLogger(config = {}) {
  return new Logger(config);
}

/**
 * Default logger instance (singleton)
 */
let defaultLogger = null;

export function getDefaultLogger() {
  if (!defaultLogger) {
    defaultLogger = new Logger();
  }
  return defaultLogger;
}

export function setDefaultLogger(logger) {
  defaultLogger = logger;
}

/**
 * Convenience exports for common logging patterns
 */
export const log = {
  debug: (agentId, message, data) => getDefaultLogger().debug(agentId, message, data),
  info: (agentId, message, data) => getDefaultLogger().info(agentId, message, data),
  warn: (agentId, message, data) => getDefaultLogger().warn(agentId, message, data),
  error: (agentId, message, data) => getDefaultLogger().error(agentId, message, data),
  fatal: (agentId, message, data) => getDefaultLogger().fatal(agentId, message, data)
};

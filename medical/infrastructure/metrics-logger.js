/**
 * Clinical Metrics System
 * Structured metrics collection for performance monitoring
 * Infrastructure-only: No domain logic
 */

export class MetricsCollector {
  constructor(options = {}) {
    this.metrics = new Map();
    this.handlers = [];
    this.enabled = options.enabled !== false;
    this.debug = options.debug || false;
    this.bufferSize = options.bufferSize || 1000;
    this.buffer = [];
  }

  /**
   * Record a metric event
   */
  record(metricName, value, tags = {}) {
    if (!this.enabled) return;

    const event = {
      name: metricName,
      value,
      tags,
      timestamp: Date.now(),
      ms: performance.now()
    };

    this.buffer.push(event);

    // Flush buffer if full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    // Initialize metric if not exists
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    this.metrics.get(metricName).push(event);

    // Notify handlers
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        if (this.debug) console.error(`[Metrics] Handler error:`, e);
      }
    });
  }

  /**
   * Record latency/duration
   */
  recordDuration(metricName, duration, tags = {}) {
    this.record(`${metricName}.duration_ms`, duration, tags);
  }

  /**
   * Record operation count
   */
  recordCount(metricName, count = 1, tags = {}) {
    this.record(`${metricName}.count`, count, tags);
  }

  /**
   * Record gauge (instantaneous value)
   */
  recordGauge(metricName, value, tags = {}) {
    this.record(`${metricName}.gauge`, value, tags);
  }

  /**
   * Add event handler
   */
  addHandler(handler) {
    if (typeof handler === 'function') {
      this.handlers.push(handler);
    }
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(metricName = null) {
    if (metricName) {
      return this._aggregateMetric(metricName);
    }

    const all = {};
    for (const [name] of this.metrics) {
      all[name] = this._aggregateMetric(name);
    }
    return all;
  }

  /**
   * Aggregate single metric
   */
  _aggregateMetric(metricName) {
    const events = this.metrics.get(metricName);
    if (!events || events.length === 0) return null;

    const values = events.map(e => e.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const avg = sum / count;

    // Calculate percentiles
    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      count,
      sum: sum.toFixed(2),
      avg: avg.toFixed(3),
      min: values[0],
      max: values[count - 1],
      p50: values[p50Index],
      p95: values[p95Index],
      p99: values[p99Index],
      stdev: this._calculateStdev(values, avg).toFixed(3)
    };
  }

  /**
   * Calculate standard deviation
   */
  _calculateStdev(values, avg) {
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squareDiffs.reduce((a, b) => a + b) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Flush buffer to storage/handlers
   */
  flush() {
    if (this.buffer.length === 0) return;

    const flushed = {
      timestamp: new Date().toISOString(),
      events: this.buffer
    };

    this.handlers.forEach(handler => {
      try {
        handler(flushed);
      } catch (e) {
        if (this.debug) console.error(`[Metrics] Flush handler error:`, e);
      }
    });

    this.buffer = [];
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.buffer = [];
  }

  /**
   * Export metrics as JSON
   */
  export() {
    this.flush();

    const exported = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      metrics: {}
    };

    for (const [name] of this.metrics) {
      exported.metrics[name] = this.getMetrics(name);
    }

    return exported;
  }
}

/**
 * Logger - Structured logging system
 */
export class Logger {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.level = options.level || 'info';
    this.handlers = [];
    this.buffer = [];
    this.bufferSize = options.bufferSize || 100;
  }

  /**
   * Log levels (numeric for comparison)
   */
  static LEVELS = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5
  };

  /**
   * Log a message
   */
  log(level, message, context = {}) {
    const levelNum = Logger.LEVELS[level] || Logger.LEVELS.info;
    const configLevelNum = Logger.LEVELS[this.level] || Logger.LEVELS.info;

    if (levelNum < configLevelNum) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      context,
      ms: performance.now()
    };

    this.buffer.push(logEntry);

    // Notify handlers
    this.handlers.forEach(handler => {
      try {
        handler(logEntry);
      } catch (e) {
        console.error(`[Logger] Handler error:`, e);
      }
    });

    // Flush if buffer full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  // Convenience methods
  trace(message, context) { this.log('trace', message, context); }
  debug(message, context) { this.log('debug', message, context); }
  info(message, context) { this.log('info', message, context); }
  warn(message, context) { this.log('warn', message, context); }
  error(message, context) { this.log('error', message, context); }
  fatal(message, context) { this.log('fatal', message, context); }

  /**
   * Add handler
   */
  addHandler(handler) {
    if (typeof handler === 'function') {
      this.handlers.push(handler);
    }
  }

  /**
   * Flush buffer
   */
  flush() {
    if (this.buffer.length === 0) return;

    const flushed = {
      timestamp: new Date().toISOString(),
      entries: this.buffer
    };

    this.handlers.forEach(handler => {
      try {
        handler(flushed);
      } catch (e) {
        console.error(`[Logger] Flush handler error:`, e);
      }
    });

    this.buffer = [];
  }

  /**
   * Create child logger
   */
  child(name) {
    return new Logger({ name: `${this.name}:${name}`, level: this.level });
  }
}

export default { MetricsCollector, Logger };

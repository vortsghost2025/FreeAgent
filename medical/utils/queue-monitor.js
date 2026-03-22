/**
 * Queue Monitor
 * 
 * A real-time monitoring system for task queues that:
 * - Monitors queue depth in real-time
 * - Triggers alerts when queue exceeds threshold
 * - Auto-pauses ingestion when overloaded
 * - Provides recovery mechanisms
 * 
 * Helps prevent the system from getting "stuck" with 50+ tasks queued
 * by providing visibility and automated recovery.
 */

const EventEmitter = require('events');

class QueueMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Queue reference
    this.queue = options.queue || null;
    
    // Thresholds
    this.alertThreshold = options.alertThreshold || 20;
    this.criticalThreshold = options.criticalThreshold || 40;
    this.pauseThreshold = options.pauseThreshold || 50;
    this.resumeThreshold = options.resumeThreshold || 10;
    
    // Monitoring configuration
    this.checkInterval = options.checkInterval || 1000; // 1 second
    this.smoothingWindow = options.smoothingWindow || 5; // For calculating moving average
    
    // Historical data
    this.history = [];
    this.maxHistorySize = options.maxHistorySize || 3600; // 1 hour at 1 sample/sec
    
    // State
    this.isMonitoring = false;
    this.isPaused = false;
    this.alertLevel = 'normal'; // 'normal', 'warning', 'critical'
    this.lastAlertTime = 0;
    this.alertCooldown = options.alertCooldown || 30000; // 30 seconds between alerts
    
    // Timer
    this.monitorInterval = null;
    
    // Metrics
    this.metrics = {
      totalChecks: 0,
      alertsTriggered: 0,
      autoPauses: 0,
      autoResumes: 0,
      peakQueueDepth: 0,
      avgQueueDepth: 0,
      avgProcessingRate: 0
    };
    
    // Processing rate tracking
    this.recentProcessingCounts = [];
    this.lastProcessedCount = 0;
    
    // Recovery configuration
    this.autoPauseEnabled = options.autoPauseEnabled !== false;
    this.autoResumeEnabled = options.autoResumeEnabled !== false;
  }

  /**
   * Set the queue to monitor
   */
  setQueue(queue) {
    this.queue = queue;
    
    // Get initial state
    if (queue) {
      const status = queue.getStatus();
      this.metrics.peakQueueDepth = Math.max(
        this.metrics.peakQueueDepth,
        status.pending + status.running
      );
    }
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this._check();
    }, this.checkInterval);
    
    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.emit('stopped');
  }

  /**
   * Perform a monitoring check
   * @private
   */
  _check() {
    if (!this.queue || !this.isMonitoring) return;
    
    this.metrics.totalChecks++;
    
    // Get queue status
    const status = this.queue.getStatus();
    const queueDepth = status.pending + status.running;
    const runningCount = status.running;
    const pendingCount = status.pending;
    
    // Update peak
    if (queueDepth > this.metrics.peakQueueDepth) {
      this.metrics.peakQueueDepth = queueDepth;
    }
    
    // Calculate processing rate
    const currentProcessed = this.metrics.totalChecks > 0 
      ? status.completed 
      : 0;
    const processedSinceLastCheck = currentProcessed - this.lastProcessedCount;
    this.lastProcessedCount = currentProcessed;
    
    this.recentProcessingCounts.push(processedSinceLastCheck);
    if (this.recentProcessingCounts.length > this.smoothingWindow) {
      this.recentProcessingCounts.shift();
    }
    
    const avgProcessingRate = this.recentProcessingCounts.reduce((a, b) => a + b, 0) / 
      Math.min(this.recentProcessingCounts.length, this.smoothingWindow);
    
    this.metrics.avgProcessingRate = avgProcessingRate;
    
    // Calculate moving average of queue depth
    this.history.push({
      timestamp: Date.now(),
      depth: queueDepth,
      running: runningCount,
      pending: pendingCount,
      processedPerSecond: avgProcessingRate,
      workers: status.workers
    });
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // Calculate average depth
    this.metrics.avgQueueDepth = this.history.reduce((sum, h) => sum + h.depth, 0) / 
      this.history.length;
    
    // Check thresholds and determine alert level
    const previousLevel = this.alertLevel;
    this._evaluateAlertLevel(queueDepth);
    
    // Emit metrics event
    this.emit('metrics', {
      queueDepth,
      runningCount,
      pendingCount,
      processingRate: avgProcessingRate,
      workers: status.workers,
      alertLevel: this.alertLevel
    });
    
    // Handle auto-pause
    if (this.autoPauseEnabled && queueDepth >= this.pauseThreshold && !this.isPaused) {
      this._autoPause();
    }
    
    // Handle auto-resume
    if (this.autoResumeEnabled && this.isPaused && queueDepth <= this.resumeThreshold) {
      this._autoResume();
    }
    
    // Trigger alerts if level changed
    if (this.alertLevel !== previousLevel) {
      this._triggerAlert(queueDepth, this.alertLevel);
    }
  }

  /**
   * Evaluate current alert level based on queue depth
   * @private
   */
  _evaluateAlertLevel(queueDepth) {
    if (queueDepth >= this.criticalThreshold) {
      this.alertLevel = 'critical';
    } else if (queueDepth >= this.alertThreshold) {
      this.alertLevel = 'warning';
    } else {
      this.alertLevel = 'normal';
    }
  }

  /**
   * Trigger an alert
   * @private
   */
  _triggerAlert(queueDepth, level) {
    const now = Date.now();
    
    // Apply cooldown
    if (now - this.lastAlertTime < this.alertCooldown && level !== 'critical') {
      return;
    }
    
    this.lastAlertTime = now;
    this.metrics.alertsTriggered++;
    
    const alert = {
      level,
      queueDepth,
      threshold: level === 'critical' ? this.criticalThreshold : this.alertThreshold,
      timestamp: now,
      message: this._generateAlertMessage(level, queueDepth)
    };
    
    this.emit('alert', alert);
    
    // Emit specific level events
    if (level === 'warning') {
      this.emit('warning', alert);
    } else if (level === 'critical') {
      this.emit('critical', alert);
    }
  }

  /**
   * Generate alert message
   * @private
   */
  _generateAlertMessage(level, queueDepth) {
    switch (level) {
      case 'critical':
        return `CRITICAL: Queue depth (${queueDepth}) exceeds critical threshold (${this.criticalThreshold}). System may become unresponsive.`;
      case 'warning':
        return `WARNING: Queue depth (${queueDepth}) exceeds alert threshold (${this.alertThreshold}). Consider scaling up workers.`;
      default:
        return `Queue normalized: ${queueDepth} tasks in queue.`;
    }
  }

  /**
   * Auto-pause queue ingestion
   * @private
   */
  _autoPause() {
    this.isPaused = true;
    this.metrics.autoPauses++;
    
    if (this.queue && this.queue.pause) {
      this.queue.pause();
    }
    
    this.emit('autoPaused', {
      queueDepth: this.queue?.getQueueDepth() || 0,
      threshold: this.pauseThreshold
    });
  }

  /**
   * Auto-resume queue ingestion
   * @private
   */
  _autoResume() {
    this.isPaused = false;
    this.metrics.autoResumes++;
    
    if (this.queue && this.queue.resume) {
      this.queue.resume();
    }
    
    this.emit('autoResumed', {
      queueDepth: this.queue?.getQueueDepth() || 0,
      threshold: this.resumeThreshold
    });
  }

  /**
   * Get current queue depth
   */
  getQueueDepth() {
    if (!this.queue) return 0;
    const status = this.queue.getStatus();
    return status.pending + status.running;
  }

  /**
   * Get recent history
   */
  getHistory(seconds = 60) {
    const cutoff = Date.now() - (seconds * 1000);
    return this.history.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Get moving average queue depth
   */
  getMovingAverage(windowSeconds = 60) {
    const cutoff = Date.now() - (windowSeconds * 1000);
    const recent = this.history.filter(h => h.timestamp >= cutoff);
    
    if (recent.length === 0) return 0;
    
    return recent.reduce((sum, h) => sum + h.depth, 0) / recent.length;
  }

  /**
   * Get processing rate (tasks per second)
   */
  getProcessingRate() {
    return this.metrics.avgProcessingRate;
  }

  /**
   * Estimate time to clear queue
   */
  getEstimatedClearTime() {
    const rate = this.metrics.avgProcessingRate;
    const depth = this.getQueueDepth();
    
    if (rate <= 0) return null;
    
    return depth / rate; // seconds
  }

  /**
   * Get health score (0-100)
   */
  getHealthScore() {
    const depth = this.getQueueDepth();
    const rate = this.metrics.avgProcessingRate;
    
    // Base score
    let score = 100;
    
    // Deduct for high queue depth
    if (depth >= this.criticalThreshold) {
      score -= 50;
    } else if (depth >= this.alertThreshold) {
      score -= 25;
    } else if (depth >= this.resumeThreshold) {
      score -= 10;
    }
    
    // Deduct for low processing rate
    if (rate < 1) {
      score -= 20;
    } else if (rate < 5) {
      score -= 10;
    }
    
    // Deduct if paused
    if (this.isPaused) {
      score -= 15;
    }
    
    return Math.max(0, score);
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      isPaused: this.isPaused,
      alertLevel: this.alertLevel,
      queueDepth: this.getQueueDepth(),
      thresholds: {
        alert: this.alertThreshold,
        critical: this.criticalThreshold,
        pause: this.pauseThreshold,
        resume: this.resumeThreshold
      },
      metrics: { ...this.metrics },
      healthScore: this.getHealthScore(),
      estimatedClearTime: this.getEstimatedClearTime(),
      processingRate: this.getProcessingRate()
    };
  }

  /**
   * Set alert threshold
   */
  setAlertThreshold(threshold) {
    this.alertThreshold = threshold;
    this.emit('thresholdChanged', { alert: threshold });
  }

  /**
   * Set critical threshold
   */
  setCriticalThreshold(threshold) {
    this.criticalThreshold = threshold;
    this.emit('thresholdChanged', { critical: threshold });
  }

  /**
   * Set pause threshold
   */
  setPauseThreshold(threshold) {
    this.pauseThreshold = threshold;
    this.emit('thresholdChanged', { pause: threshold });
  }

  /**
   * Force pause
   */
  forcePause() {
    this._autoPause();
  }

  /**
   * Force resume
   */
  forceResume() {
    if (this.isPaused) {
      this._autoResume();
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalChecks: 0,
      alertsTriggered: 0,
      autoPauses: 0,
      autoResumes: 0,
      peakQueueDepth: this.metrics.peakQueueDepth,
      avgQueueDepth: 0,
      avgProcessingRate: 0
    };
    this.history = [];
    this.emit('metricsReset');
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
    this.emit('historyCleared');
  }

  /**
   * Shutdown monitor
   */
  shutdown() {
    this.stop();
    this.emit('shutdown');
  }
}

/**
 * Create a monitor with alert handlers
 */
function createMonitoredQueueSystem(options = {}) {
  const { ParallelTaskQueue } = require('./parallel-task-queue');
  const { MessageDistributor } = require('./message-distributor');
  const monitor = new QueueMonitor(options.monitor || {});
  
  // Create queue system
  const { queue, distributor } = require('./message-distributor')
    .createDistributedQueueSystem(options.queue || {});
  
  // Connect monitor to queue
  monitor.setQueue(queue);
  
  // Set up alert handlers
  if (options.onAlert) {
    monitor.on('alert', options.onAlert);
  }
  
  if (options.onCritical) {
    monitor.on('critical', options.onCritical);
  }
  
  if (options.onWarning) {
    monitor.on('warning', options.onWarning);
  }
  
  if (options.onAutoPause) {
    monitor.on('autoPaused', options.onAutoPause);
  }
  
  if (options.onAutoResume) {
    monitor.on('autoResumed', options.onAutoResume);
  }
  
  // Start monitoring
  monitor.start();
  
  return {
    queue,
    distributor,
    monitor,
    // Convenience methods
    enqueue: (data, options) => distributor.distribute(data, options),
    enqueueBatch: (data, options) => distributor.distributeBatch(data, options),
    getStatus: () => ({
      queue: queue.getStatus(),
      distributor: distributor.getStatus(),
      monitor: monitor.getStatus()
    }),
    pause: () => {
      queue.pause();
      distributor.pause();
      monitor.forcePause();
    },
    resume: () => {
      queue.resume();
      distributor.resume();
      monitor.forceResume();
    },
    shutdown: async () => {
      monitor.stop();
      await queue.shutdown();
      await distributor.shutdown();
    }
  };
}

module.exports = {
  QueueMonitor,
  createMonitoredQueueSystem
};
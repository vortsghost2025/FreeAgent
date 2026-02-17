/**
 * Medical System Platform
 * Unified orchestrator integrating clinical protocols with infrastructure
 *
 * Coordinates:
 * - Protocol Manager (10 clinical protocols)
 * - Protocol Registry (metadata, versioning)
 * - Metrics Collection
 * - Structured Logging
 * - Plugin System
 * - Configuration Management
 */

import ProtocolManager from './clinical-intelligence/protocol-manager.js';
import { ProtocolRegistry } from './infrastructure/protocol-registry.js';
import { MetricsCollector, Logger } from './infrastructure/metrics-logger.js';
import { PluginManager } from './infrastructure/plugin-loader.js';
import { ConfigurationManager, createDefaultConfig, createDefaultProtocolRegistry } from './infrastructure/configuration.js';

export class MedicalSystemPlatform {
  constructor(config = {}) {
    this.startTime = Date.now();

    // Initialize infrastructure layer
    this.configManager = new ConfigurationManager({ debug: config.debug });
    this.registry = new ProtocolRegistry({ debug: config.debug });
    this.metrics = new MetricsCollector({ enabled: true, debug: config.debug });
    this.logger = new Logger({ name: 'medical-platform', level: config.logLevel || 'info' });
    this.pluginManager = new PluginManager({ debug: config.debug });

    // Initialize clinical layer
    this.protocolManager = null;

    this.config = config;
    this.initialized = false;
    this.debug = config.debug || false;

    this._setupLogging();
    this._setupMetrics();
  }

  /**
   * Setup logging pipeline
   */
  _setupLogging() {
    // Console handler (development)
    if (this.debug) {
      this.logger.addHandler((logEntry) => {
        const levelEmoji = { trace: '🔍', debug: '🐛', info: 'ℹ️ ', warn: '⚠️ ', error: '❌', fatal: '🔴' };
        const emoji = levelEmoji[logEntry.level] || '•';
        console.log(`${emoji} [${logEntry.logger}] ${logEntry.message}`);
      });
    }
  }

  /**
   * Setup metrics pipeline
   */
  _setupMetrics() {
    // Metrics handler - aggregate and log periodically
    let lastFlush = Date.now();
    this.metrics.addHandler((data) => {
      // Could send to external metrics service
      if (this.debug) {
        const now = Date.now();
        if (now - lastFlush > 5000) {
          this.logger.debug('Metrics buffered', { buffered: data.events ? data.events.length : 0 });
          lastFlush = now;
        }
      }
    });
  }

  /**
   * Initialize platform (load config, register protocols)
   */
  async initialize() {
    try {
      this.logger.info('Initializing Medical System Platform', { version: '1.0.0' });

      // Load configuration
      const defaultConfig = createDefaultConfig();
      this.configManager.loadConfig(defaultConfig.system);
      this.logger.debug('Configuration loaded', defaultConfig.system);

      // Load protocol registry
      const protocolRegistry = createDefaultProtocolRegistry();
      const registryConfig = this.configManager.loadProtocolRegistry(protocolRegistry);
      this.logger.debug('Protocol registry loaded', { protocols: registryConfig.protocols.length });

      // Register all protocols to local registry
      registryConfig.protocols.forEach(protoDef => {
        this.registry.register(protoDef.id, { name: protoDef.name }, {
          suite: protoDef.suite,
          version: protoDef.version,
          tags: protoDef.tags,
          description: protoDef.description
        });
      });

      this.logger.info('Protocol registry initialized', { count: registryConfig.protocols.length });

      // Initialize clinical protocol manager
      const standards = { metadata: { name: 'WHO 2024', version: '2024' }, rules: {} };
      this.protocolManager = new ProtocolManager(standards, { debug: this.debug });
      this.logger.info('Protocol Manager initialized', { protocols: 10 });

      this.initialized = true;
      this.logger.info('Platform initialization complete', { duration: Date.now() - this.startTime });

      return { success: true, duration: Date.now() - this.startTime };
    } catch (error) {
      this.logger.error('Platform initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Evaluate patient and return clinical decision support
   */
  evaluatePatient(patientData, options = {}) {
    const evalStart = performance.now();

    try {
      // Record evaluation start
      this.metrics.recordCount('evaluations', 1, { type: 'patient-evaluation' });

      // Evaluate all protocols
      const protocolResult = this.protocolManager.evaluateAllProtocols(patientData);
      const evalTime = performance.now() - evalStart;

      // Record metrics
      this.metrics.recordDuration('evaluation-total', evalTime, { protocols: 10 });
      this.registry.logActivation('platform', { score: protocolResult.primaryProtocol?.score || 0, triggered: !!protocolResult.primaryProtocol, processingTime: evalTime });

      this.logger.debug('Patient evaluation complete', {
        protocolsActivated: protocolResult.activatedProtocols.length,
        duration: evalTime.toFixed(2)
      });

      return {
        success: true,
        evaluation: {
          primaryProtocol: protocolResult.primaryProtocol,
          activatedProtocols: protocolResult.activatedProtocols,
          competingProtocols: protocolResult.competingProtocols,
          processingTime: evalTime
        }
      };
    } catch (error) {
      this.logger.error('Patient evaluation failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get system status and metrics
   */
  getStatus() {
    const registryStats = this.registry.getStats();
    const protocolMetrics = this.registry.getActivationMetrics();

    return {
      platform: {
        initialized: this.initialized,
        uptime: Date.now() - this.startTime,
        version: '1.0.0'
      },
      protocols: {
        registered: registryStats.totalProtocols,
        enabled: registryStats.enabled,
        disabled: registryStats.disabled,
        deprecated: registryStats.deprecated,
        suites: registryStats.suites
      },
      infrastructure: {
        plugins: this.pluginManager.getStatus(),
        metrics: { collected: Object.keys(this.metrics.getMetrics()).length },
        config: { loaded: this.configManager.loaded }
      },
      activations: protocolMetrics ? {
        totalActivations: protocolMetrics.totalActivations,
        triggeredCount: protocolMetrics.triggeredCount,
        triggerRate: protocolMetrics.triggerRate
      } : null
    };
  }

  /**
   * Get detailed metrics report
   */
  getMetricsReport() {
    const status = this.getStatus();
    const allMetrics = this.metrics.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      status,
      metrics: allMetrics,
      registryExport: this.registry.export()
    };
  }

  /**
   * Get system health check
   */
  healthCheck() {
    const checks = {
      initialized: this.initialized ? 'PASS' : 'FAIL',
      protocolManager: this.protocolManager ? 'PASS' : 'FAIL',
      registry: this.registry.getStats().totalProtocols > 0 ? 'PASS' : 'FAIL',
      metrics: Object.keys(this.metrics.getMetrics()).length > 0 ? 'PASS' : 'FAIL',
      logging: this.logger ? 'PASS' : 'FAIL',
      config: this.configManager.loaded ? 'PASS' : 'FAIL'
    };

    const allPass = Object.values(checks).every(status => status === 'PASS');

    return {
      healthy: allPass,
      timestamp: new Date().toISOString(),
      checks,
      status: allPass ? 'OPERATIONAL' : 'DEGRADED'
    };
  }

  /**
   * Shutdown platform gracefully
   */
  shutdown() {
    this.logger.info('Platform shutdown initiated');
    this.metrics.flush();
    this.logger.flush();
    this.logger.info('Platform shutdown complete');
    this.initialized = false;
  }
}

export default MedicalSystemPlatform;

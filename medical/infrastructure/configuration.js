/**
 * Configuration System
 * Protocol registry and system configuration management
 * Infrastructure-only: Loads metadata and structure, no domain logic
 */

export class ConfigurationManager {
  constructor(options = {}) {
    this.config = {};
    this.defaults = {
      enabledProtocols: 'all',
      logLevel: 'info',
      metricsEnabled: true,
      bufferSize: 1000,
      debug: false
    };
    this.loaded = false;
    this.debug = options.debug || false;
  }

  /**
   * Load configuration from object
   */
  loadConfig(config) {
    this.config = {
      ...this.defaults,
      ...config
    };
    this.loaded = true;

    if (this.debug) {
      console.log('[Config] Configuration loaded');
    }

    return this.config;
  }

  /**
   * Load protocol registry from config
   * Returns metadata-only definitions
   */
  loadProtocolRegistry(registryConfig) {
    if (!Array.isArray(registryConfig.protocols)) {
      throw new Error('Invalid protocol registry: protocols must be array');
    }

    const registry = {
      version: registryConfig.version || '1.0',
      protocols: registryConfig.protocols.map(proto => ({
        id: proto.id,
        name: proto.name,
        priority: proto.priority,
        suite: proto.suite,
        version: proto.version,
        enabled: proto.enabled !== false,
        tags: proto.tags || [],
        description: proto.description || '',
        triggers: proto.triggers || { primary: 0, secondary: 0 },
        conflicts: proto.conflicts || []
      }))
    };

    if (this.debug) {
      console.log(`[Config] Loaded ${registry.protocols.length} protocol definitions`);
    }

    return registry;
  }

  /**
   * Get protocol configuration
   */
  getProtocolConfig(protocolId) {
    const protoConfigs = this.config.protocolConfigs || {};
    return protoConfigs[protocolId] || null;
  }

  /**
   * Set protocol configuration
   */
  setProtocolConfig(protocolId, config) {
    if (!this.config.protocolConfigs) {
      this.config.protocolConfigs = {};
    }
    this.config.protocolConfigs[protocolId] = config;
  }

  /**
   * Get enabled protocols list
   */
  getEnabledProtocols() {
    if (this.config.enabledProtocols === 'all') {
      return null; // All enabled
    }

    if (Array.isArray(this.config.enabledProtocols)) {
      return this.config.enabledProtocols;
    }

    return [];
  }

  /**
   * Get system settings
   */
  getSettings() {
    return {
      logLevel: this.config.logLevel,
      metricsEnabled: this.config.metricsEnabled,
      bufferSize: this.config.bufferSize,
      debug: this.config.debug,
      enabledProtocols: this.config.enabledProtocols
    };
  }

  /**
   * Update setting
   */
  setSetting(key, value) {
    this.config[key] = value;
  }

  /**
   * Export configuration
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      loaded: this.loaded,
      config: this.config
    };
  }
}

/**
 * Build default protocol registry (metadata-only)
 */
export function createDefaultProtocolRegistry() {
  return {
    version: '1.0',
    protocols: [
      // V2 Suite (Metabolic, Allergic, Trauma, Pediatric, Obstetric)
      {
        id: 'dka-protocol',
        name: 'DKA Protocol',
        priority: 'CRITICAL',
        suite: 'v2',
        version: '1.0.0',
        enabled: true,
        tags: ['metabolic', 'endocrine', 'emergency'],
        description: 'Diabetic Ketoacidosis - aggressive fluid resuscitation'
      },
      {
        id: 'anaphylaxis-protocol',
        name: 'Anaphylaxis Protocol',
        priority: 'CRITICAL',
        suite: 'v2',
        version: '1.0.0',
        enabled: true,
        tags: ['allergic', 'emergency', 'shock'],
        description: 'Anaphylaxis - rapid IM epinephrine response'
      },
      {
        id: 'trauma-protocol',
        name: 'Trauma Primary Survey Protocol',
        priority: 'CRITICAL',
        suite: 'v2',
        version: '1.0.0',
        enabled: true,
        tags: ['trauma', 'emergency', 'massive-transfusion'],
        description: 'Trauma Primary Survey - ABCDE protocol'
      },
      {
        id: 'pediatric-fever-protocol',
        name: 'Pediatric Fever Protocol',
        priority: 'URGENT',
        suite: 'v2',
        version: '1.0.0',
        enabled: true,
        tags: ['pediatric', 'fever', 'infection'],
        description: 'Pediatric Fever - age-stratified evaluation'
      },
      {
        id: 'obstetric-protocol',
        name: 'Obstetric Emergency Protocol',
        priority: 'CRITICAL',
        suite: 'v2',
        version: '1.0.0',
        enabled: true,
        tags: ['obstetric', 'emergency', 'maternal'],
        description: 'Obstetric Emergencies - eclampsia, abruption, rupture'
      },
      // Extended Suite (Cardiac, Sepsis, Neuro, Metabolic)
      {
        id: 'stemi-protocol',
        name: 'STEMI Protocol',
        priority: 'CRITICAL',
        suite: 'extended',
        version: '1.0.0',
        enabled: true,
        tags: ['cardiac', 'acs', 'emergency', 'time-critical'],
        description: 'STEMI - door-to-balloon <90 minutes'
      },
      {
        id: 'sepsis-protocol',
        name: 'Sepsis Protocol',
        priority: 'CRITICAL',
        suite: 'extended',
        version: '1.0.0',
        enabled: true,
        tags: ['sepsis', 'infection', 'shock', 'emergency'],
        description: 'Sepsis/Septic Shock - qSOFA + 3-hour bundle'
      },
      {
        id: 'seizure-protocol',
        name: 'Status Epilepticus Protocol',
        priority: 'CRITICAL',
        suite: 'extended',
        version: '1.0.0',
        enabled: true,
        tags: ['seizure', 'neurology', 'emergency'],
        description: 'Status Epilepticus - benzodiazepine ladder'
      },
      {
        id: 'stroke-protocol',
        name: 'Acute Stroke Protocol',
        priority: 'CRITICAL',
        suite: 'extended',
        version: '1.0.0',
        enabled: true,
        tags: ['stroke', 'neurology', 'thrombolytic', 'time-critical'],
        description: 'Acute Stroke - FAST criteria, door-to-needle <60min'
      },
      {
        id: 'hypoglycemia-protocol',
        name: 'Severe Hypoglycemia Protocol',
        priority: 'CRITICAL',
        suite: 'extended',
        version: '1.0.0',
        enabled: true,
        tags: ['metabolic', 'endocrine', 'emergency'],
        description: 'Severe Hypoglycemia - IV dextrose rescue'
      }
    ]
  };
}

/**
 * Create default system configuration
 */
export function createDefaultConfig() {
  return {
    system: {
      version: '1.0.0',
      debug: false,
      logLevel: 'info',
      metricsEnabled: true
    },
    protocols: {
      enabledProtocols: 'all',
      registry: createDefaultProtocolRegistry()
    },
    performance: {
      bufferSize: 1000,
      metricsFlushInterval: 60000,
      activationCacheSize: 10000
    },
    integration: {
      logging: {
        enabled: true,
        handlers: ['console'],
        format: 'json'
      },
      metrics: {
        enabled: true,
        collectors: ['prometheus'],
        exportInterval: 60000
      }
    }
  };
}

export default { ConfigurationManager, createDefaultProtocolRegistry, createDefaultConfig };

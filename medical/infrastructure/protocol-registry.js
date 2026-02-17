/**
 * Protocol Registry
 * Versioned, metadata-first protocol registration system
 * Supports dynamic protocol loading and introspection
 */

export class ProtocolRegistry {
  constructor(options = {}) {
    this.protocols = new Map();
    this.versions = new Map();
    this.metadata = new Map();
    this.activationLog = [];
    this.debug = options.debug || false;
  }

  /**
   * Register a protocol with metadata
   * Structure-only: No clinical content in registry
   */
  register(protocolId, protocolDefinition, metadata = {}) {
    if (this.protocols.has(protocolId)) {
      throw new Error(`Protocol ${protocolId} already registered`);
    }

    const version = metadata.version || '1.0.0';
    const registryEntry = {
      id: protocolId,
      name: protocolDefinition.name,
      priority: protocolDefinition.priority,
      suite: metadata.suite || 'default',
      version: version,
      triggers: protocolDefinition.triggers ? {
        primary: protocolDefinition.triggers.primary?.length || 0,
        secondary: protocolDefinition.triggers.secondary?.length || 0
      } : { primary: 0, secondary: 0 },
      phases: protocolDefinition.phases ? Object.keys(protocolDefinition.phases).length : 0,
      tags: metadata.tags || [],
      description: metadata.description || '',
      author: metadata.author || 'system',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      enabled: metadata.enabled !== false,
      deprecated: metadata.deprecated || false
    };

    this.protocols.set(protocolId, protocolDefinition);
    this.metadata.set(protocolId, registryEntry);
    this.versions.set(protocolId, [version]);

    if (this.debug) {
      console.log(`[Registry] Registered protocol: ${protocolId} v${version}`);
    }

    return registryEntry;
  }

  /**
   * Get protocol by ID
   */
  get(protocolId) {
    if (!this.protocols.has(protocolId)) {
      return null;
    }
    return {
      definition: this.protocols.get(protocolId),
      metadata: this.metadata.get(protocolId)
    };
  }

  /**
   * List all registered protocols with optional filtering
   */
  list(filters = {}) {
    const results = [];

    for (const [id, metadata] of this.metadata) {
      let matches = true;

      if (filters.suite && metadata.suite !== filters.suite) matches = false;
      if (filters.priority && metadata.priority !== filters.priority) matches = false;
      if (filters.enabled !== undefined && metadata.enabled !== filters.enabled) matches = false;
      if (filters.deprecated !== undefined && metadata.deprecated !== filters.deprecated) matches = false;
      if (filters.tag && !metadata.tags.includes(filters.tag)) matches = false;

      if (matches) {
        results.push({
          id,
          ...metadata
        });
      }
    }

    return results.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, URGENT: 1, NORMAL: 2 };
      const aPriority = priorityOrder[a.priority] || 99;
      const bPriority = priorityOrder[b.priority] || 99;
      return aPriority - bPriority;
    });
  }

  /**
   * Enable/disable protocol
   */
  setEnabled(protocolId, enabled) {
    const metadata = this.metadata.get(protocolId);
    if (!metadata) throw new Error(`Protocol ${protocolId} not found`);

    metadata.enabled = enabled;
    metadata.lastModified = new Date().toISOString();

    if (this.debug) {
      console.log(`[Registry] Protocol ${protocolId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Update protocol version
   */
  updateVersion(protocolId, newVersion) {
    const metadata = this.metadata.get(protocolId);
    if (!metadata) throw new Error(`Protocol ${protocolId} not found`);

    const versions = this.versions.get(protocolId);
    if (versions.includes(newVersion)) {
      throw new Error(`Version ${newVersion} already exists for ${protocolId}`);
    }

    versions.push(newVersion);
    metadata.version = newVersion;
    metadata.lastModified = new Date().toISOString();

    if (this.debug) {
      console.log(`[Registry] Updated ${protocolId} to v${newVersion}`);
    }
  }

  /**
   * Get protocol versions
   */
  getVersions(protocolId) {
    if (!this.protocols.has(protocolId)) {
      return null;
    }
    return {
      protocolId,
      versions: this.versions.get(protocolId),
      current: this.metadata.get(protocolId).version
    };
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const allProtocols = Array.from(this.metadata.values());
    const enabled = allProtocols.filter(p => p.enabled).length;
    const disabled = allProtocols.filter(p => !p.enabled).length;
    const deprecated = allProtocols.filter(p => p.deprecated).length;

    const suites = {};
    const priorities = {};

    allProtocols.forEach(p => {
      suites[p.suite] = (suites[p.suite] || 0) + 1;
      priorities[p.priority] = (priorities[p.priority] || 0) + 1;
    });

    return {
      totalProtocols: allProtocols.length,
      enabled,
      disabled,
      deprecated,
      suites,
      priorities,
      totalTriggers: allProtocols.reduce((sum, p) => sum + p.triggers.primary + p.triggers.secondary, 0),
      totalPhases: allProtocols.reduce((sum, p) => sum + p.phases, 0)
    };
  }

  /**
   * Export registry as JSON
   */
  export() {
    const exported = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      stats: this.getStats(),
      protocols: Array.from(this.metadata.values()).map(meta => ({
        ...meta,
        versions: this.versions.get(meta.id)
      }))
    };

    return exported;
  }

  /**
   * Log protocol activation
   */
  logActivation(protocolId, result) {
    this.activationLog.push({
      protocolId,
      timestamp: new Date().toISOString(),
      score: result.score,
      triggered: result.triggered,
      processingTime: result.processingTime
    });
  }

  /**
   * Get activation metrics
   */
  getActivationMetrics(protocolId = null) {
    const filtered = protocolId
      ? this.activationLog.filter(log => log.protocolId === protocolId)
      : this.activationLog;

    if (filtered.length === 0) return null;

    const scores = filtered.map(l => l.score);
    const avgScore = scores.reduce((a, b) => a + b) / scores.length;
    const triggered = filtered.filter(l => l.triggered).length;
    const times = filtered.map(l => l.processingTime);
    const avgTime = times.reduce((a, b) => a + b) / times.length;

    return {
      totalActivations: filtered.length,
      triggeredCount: triggered,
      triggerRate: (triggered / filtered.length * 100).toFixed(1),
      avgScore: avgScore.toFixed(2),
      avgProcessingTime: avgTime.toFixed(3),
      minTime: Math.min(...times).toFixed(3),
      maxTime: Math.max(...times).toFixed(3)
    };
  }

  /**
   * Clear activation log
   */
  clearActivationLog() {
    this.activationLog = [];
  }
}

export default ProtocolRegistry;

/**
 * Protocol Plugin Loader
 * Dynamic module loading system for protocol extensions
 * Infrastructure-only: No domain logic, pure module management
 */

export class ProtocolPluginLoader {
  constructor(options = {}) {
    this.plugins = new Map();
    this.loadedModules = new Map();
    this.searchPaths = options.searchPaths || ['./medical/clinical-intelligence', './plugins'];
    this.debug = options.debug || false;
  }

  /**
   * Register a plugin module (in-memory registration)
   * Used for bundled protocols
   */
  registerModule(moduleId, moduleExport, metadata = {}) {
    if (this.plugins.has(moduleId)) {
      throw new Error(`Plugin ${moduleId} already registered`);
    }

    const entry = {
      id: moduleId,
      type: metadata.type || 'protocol',
      version: metadata.version || '1.0.0',
      exports: moduleExport,
      loaded: true,
      loadPath: metadata.loadPath || 'memory',
      metadata
    };

    this.plugins.set(moduleId, entry);
    this.loadedModules.set(moduleId, moduleExport);

    if (this.debug) {
      console.log(`[PluginLoader] Registered module: ${moduleId} v${entry.version}`);
    }

    return entry;
  }

  /**
   * Get loaded plugin/module
   */
  get(moduleId) {
    return this.loadedModules.get(moduleId) || null;
  }

  /**
   * Check if plugin is loaded
   */
  has(moduleId) {
    return this.plugins.has(moduleId);
  }

  /**
   * List all registered plugins
   */
  list(filters = {}) {
    const results = [];

    for (const [id, entry] of this.plugins) {
      let matches = true;

      if (filters.type && entry.type !== filters.type) matches = false;
      if (filters.loaded !== undefined && entry.loaded !== filters.loaded) matches = false;

      if (matches) {
        results.push({
          id,
          type: entry.type,
          version: entry.version,
          loaded: entry.loaded,
          loadPath: entry.loadPath
        });
      }
    }

    return results;
  }

  /**
   * Get plugin metadata
   */
  getMetadata(moduleId) {
    const entry = this.plugins.get(moduleId);
    if (!entry) return null;

    return {
      id: moduleId,
      type: entry.type,
      version: entry.version,
      loaded: entry.loaded,
      loadPath: entry.loadPath,
      metadata: entry.metadata
    };
  }

  /**
   * Get all plugin metadata
   */
  getAllMetadata() {
    const all = {};
    for (const [id, entry] of this.plugins) {
      all[id] = {
        type: entry.type,
        version: entry.version,
        loaded: entry.loaded,
        loadPath: entry.loadPath
      };
    }
    return all;
  }

  /**
   * Validate plugin structure
   */
  validatePlugin(moduleId, expectedInterfaces = []) {
    const module = this.loadedModules.get(moduleId);
    if (!module) return { valid: false, error: 'Module not loaded' };

    const entry = this.plugins.get(moduleId);
    if (!entry) return { valid: false, error: 'Plugin not registered' };

    const missing = [];
    expectedInterfaces.forEach(iface => {
      if (typeof module[iface] !== 'function' && typeof module[iface] !== 'object') {
        missing.push(iface);
      }
    });

    if (missing.length > 0) {
      return { valid: false, error: `Missing interfaces: ${missing.join(', ')}` };
    }

    return { valid: true, module, metadata: entry.metadata };
  }

  /**
   * Unload plugin
   */
  unload(moduleId) {
    const entry = this.plugins.get(moduleId);
    if (!entry) throw new Error(`Plugin ${moduleId} not found`);

    this.plugins.delete(moduleId);
    this.loadedModules.delete(moduleId);

    if (this.debug) {
      console.log(`[PluginLoader] Unloaded plugin: ${moduleId}`);
    }
  }

  /**
   * Get plugin dependency tree
   */
  getDependencies(moduleId) {
    const module = this.loadedModules.get(moduleId);
    if (!module) return null;

    const deps = [];

    // Check for declared dependencies
    if (module.__dependencies) {
      deps.push(...module.__dependencies);
    }

    // Check for import statements in metadata
    const entry = this.plugins.get(moduleId);
    if (entry && entry.metadata && entry.metadata.dependencies) {
      deps.push(...entry.metadata.dependencies);
    }

    return deps;
  }

  /**
   * Export plugin registry as JSON
   */
  export() {
    const exported = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      plugins: Array.from(this.plugins.values()).map(entry => ({
        id: entry.id,
        type: entry.type,
        version: entry.version,
        loaded: entry.loaded,
        loadPath: entry.loadPath,
        dependencies: this.getDependencies(entry.id)
      }))
    };

    return exported;
  }
}

/**
 * Plugin Manager - Coordinates plugin lifecycle
 */
export class PluginManager {
  constructor(options = {}) {
    this.loader = new ProtocolPluginLoader(options);
    this.hooks = new Map();
    this.debug = options.debug || false;
  }

  /**
   * Register a plugin
   */
  register(moduleId, moduleExport, metadata = {}) {
    const entry = this.loader.registerModule(moduleId, moduleExport, metadata);
    this.emit('plugin:registered', { moduleId, metadata });
    return entry;
  }

  /**
   * Load protocol activators (dynamic)
   */
  loadProtocolActivators() {
    const activators = [];

    // Dynamically load registered activator modules
    for (const [id, module] of this.loader.loadedModules) {
      if (id.includes('protocol-activator') && module.constructor) {
        activators.push({
          id,
          activator: module,
          metadata: this.loader.getMetadata(id)
        });
      }
    }

    return activators;
  }

  /**
   * Register hook/callback
   */
  on(event, handler) {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event).push(handler);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    const handlers = this.hooks.get(event);
    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        if (this.debug) console.error(`[PluginManager] Hook error (${event}):`, e);
      }
    });
  }

  /**
   * Get plugin status
   */
  getStatus() {
    const allPlugins = this.loader.list();
    return {
      totalPlugins: allPlugins.length,
      loadedPlugins: allPlugins.filter(p => p.loaded).length,
      unloadedPlugins: allPlugins.filter(p => !p.loaded).length,
      plugins: allPlugins
    };
  }
}

export default { ProtocolPluginLoader, PluginManager };

/**
 * Phase 4.4: Plugin Marketplace
 * Versioning, Dependencies, Hot-Swap Capability, Catalog Management
 * Enables dynamic clinical protocol distribution across federation
 */

/**
 * Plugin Metadata and Version Management
 */
export class PluginVersion {
  constructor(name, version, metadata = {}) {
    this.name = name;
    this.version = version;
    this.semver = this._parseSemver(version);
    this.releaseDate = metadata.releaseDate || Date.now();
    this.author = metadata.author || 'unknown';
    this.description = metadata.description || '';
    this.capabilities = metadata.capabilities || [];
    this.dependencies = metadata.dependencies || {};
    this.breaking = metadata.breaking || false;
    this.deprecated = metadata.deprecated || false;
    this.signature = metadata.signature || null;
    this.size = metadata.size || 0;
  }

  /**
   * Parse semantic version
   */
  _parseSemver(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
    if (!match) throw new Error(`Invalid semver: ${version}`);

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4] || ''
    };
  }

  /**
   * Check if this version satisfies a constraint
   */
  satisfies(constraint) {
    if (constraint === '*') return true;
    if (constraint === 'latest') return true;

    // Handle ^1.2.3 (compatible with 1.x.x)
    if (constraint.startsWith('^')) {
      const required = new PluginVersion('temp', constraint.substring(1));
      return this.semver.major === required.semver.major &&
        (this.semver.minor > required.semver.minor ||
         (this.semver.minor === required.semver.minor &&
          this.semver.patch >= required.semver.patch));
    }

    // Handle ~1.2.3 (compatible with 1.2.x)
    if (constraint.startsWith('~')) {
      const required = new PluginVersion('temp', constraint.substring(1));
      return this.semver.major === required.semver.major &&
        this.semver.minor === required.semver.minor &&
        this.semver.patch >= required.semver.patch;
    }

    // Handle exact version
    return this.version === constraint;
  }

  /**
   * Compare versions
   */
  compareTo(other) {
    if (this.semver.major !== other.semver.major)
      return this.semver.major - other.semver.major;
    if (this.semver.minor !== other.semver.minor)
      return this.semver.minor - other.semver.minor;
    if (this.semver.patch !== other.semver.patch)
      return this.semver.patch - other.semver.patch;
    return 0;
  }
}

/**
 * Plugin Catalog Entry
 * Represents a plugin with all its versions
 */
export class PluginCatalogEntry {
  constructor(name, metadata = {}) {
    this.name = name;
    this.versions = new Map(); // version -> PluginVersion
    this.latestVersion = null;
    this.description = metadata.description || '';
    this.author = metadata.author || 'unknown';
    this.category = metadata.category || 'general';
    this.published = metadata.published || Date.now();
    this.downloads = 0;
    this.rating = 0;
    this.reviews = [];
  }

  /**
   * Add version to catalog
   */
  addVersion(pluginVersion) {
    this.versions.set(pluginVersion.version, pluginVersion);

    // Update latest
    if (!this.latestVersion || pluginVersion.compareTo(this.latestVersion) > 0) {
      this.latestVersion = pluginVersion;
    }

    return pluginVersion;
  }

  /**
   * Get version
   */
  getVersion(constraint) {
    if (!constraint || constraint === 'latest') {
      return this.latestVersion;
    }

    // Try exact match
    if (this.versions.has(constraint)) {
      return this.versions.get(constraint);
    }

    // Find matching version
    for (const version of Array.from(this.versions.values()).sort((a, b) => b.compareTo(a))) {
      if (version.satisfies(constraint)) {
        return version;
      }
    }

    return null;
  }

  /**
   * Get all versions sorted
   */
  getAllVersions(sortOrder = 'desc') {
    const sorted = Array.from(this.versions.values());
    if (sortOrder === 'desc') {
      sorted.sort((a, b) => b.compareTo(a));
    } else {
      sorted.sort((a, b) => a.compareTo(b));
    }
    return sorted;
  }

  /**
   * Record download
   */
  recordDownload() {
    this.downloads++;
    return this.downloads;
  }

  /**
   * Add review
   */
  addReview(rating, comment = '') {
    this.reviews.push({
      rating,
      comment,
      timestamp: Date.now()
    });

    // Update average rating
    const avg = this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length;
    this.rating = parseFloat(avg.toFixed(2));
  }
}

/**
 * Plugin Marketplace
 * Central catalog for plugin discovery and distribution
 */
export class PluginMarketplace {
  constructor(options = {}) {
    this.catalog = new Map(); // pluginName -> PluginCatalogEntry
    this.searchIndex = new Map(); // capability -> [plugins]
    this.downloaded = new Map(); // identifier -> PluginVersion
    this.maxCatalogSize = options.maxCatalogSize || 10000;
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Publish plugin version
   */
  publishPlugin(name, version, metadata = {}) {
    // Create or get catalog entry
    if (!this.catalog.has(name)) {
      this.catalog.set(name, new PluginCatalogEntry(name, metadata));
    }

    const entry = this.catalog.get(name);
    const pluginVersion = new PluginVersion(name, version, metadata);
    entry.addVersion(pluginVersion);

    // Update search index
    if (metadata.capabilities) {
      metadata.capabilities.forEach(cap => {
        if (!this.searchIndex.has(cap)) {
          this.searchIndex.set(cap, []);
        }
        const plugins = this.searchIndex.get(cap);
        if (!plugins.includes(name)) {
          plugins.push(name);
        }
      });
    }

    if (this.debug) {
      console.log(`[Marketplace] Published ${name}@${version}`);
    }

    this._emitPublish(name, version, metadata);
    return pluginVersion;
  }

  /**
   * Find plugins by capability
   */
  findByCapability(capability) {
    const pluginNames = this.searchIndex.get(capability) || [];
    return pluginNames.map(name => this.catalog.get(name)).filter(p => p !== null);
  }

  /**
   * Find plugins by category
   */
  findByCategory(category) {
    const plugins = [];
    for (const entry of this.catalog.values()) {
      if (entry.category === category) {
        plugins.push(entry);
      }
    }
    return plugins;
  }

  /**
   * Search marketplace
   */
  search(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const entry of this.catalog.values()) {
      if (entry.name.toLowerCase().includes(queryLower) ||
          entry.description.toLowerCase().includes(queryLower)) {
        results.push(entry);
      }
    }

    return results.sort((a, b) => b.downloads - a.downloads);
  }

  /**
   * Download plugin version
   */
  downloadPlugin(name, constraint = 'latest') {
    const entry = this.catalog.get(name);
    if (!entry) {
      return { success: false, error: 'PLUGIN_NOT_FOUND' };
    }

    const version = entry.getVersion(constraint);
    if (!version) {
      return { success: false, error: 'VERSION_NOT_FOUND' };
    }

    entry.recordDownload();
    const identifier = `${name}@${version.version}`;
    this.downloaded.set(identifier, version);

    if (this.debug) {
      console.log(`[Marketplace] Downloaded ${identifier}`);
    }

    this._emitDownload(name, version.version);
    return { success: true, plugin: version };
  }

  /**
   * Get catalog entry
   */
  getCatalogEntry(name) {
    return this.catalog.get(name) || null;
  }

  /**
   * Get plugin version
   */
  getPlugin(name, constraint = 'latest') {
    const entry = this.catalog.get(name);
    if (!entry) return null;
    return entry.getVersion(constraint);
  }

  /**
   * List all plugins
   */
  listPlugins(filter = {}) {
    let plugins = Array.from(this.catalog.values());

    if (filter.category) {
      plugins = plugins.filter(p => p.category === filter.category);
    }

    if (filter.minRating) {
      plugins = plugins.filter(p => p.rating >= filter.minRating);
    }

    if (filter.sortBy === 'downloads') {
      plugins.sort((a, b) => b.downloads - a.downloads);
    } else if (filter.sortBy === 'rating') {
      plugins.sort((a, b) => b.rating - a.rating);
    } else if (filter.sortBy === 'recent') {
      plugins.sort((a, b) => b.published - a.published);
    }

    return plugins;
  }

  /**
   * Register event handler
   */
  onEvent(handler) {
    this.handlers.push(handler);
  }

  /**
   * Emit publish event
   */
  _emitPublish(name, version, metadata) {
    this.handlers.forEach(handler => {
      try {
        handler({ event: 'PUBLISH', name, version, timestamp: Date.now() });
      } catch (error) {
        console.error(`[Marketplace] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Emit download event
   */
  _emitDownload(name, version) {
    this.handlers.forEach(handler => {
      try {
        handler({ event: 'DOWNLOAD', name, version, timestamp: Date.now() });
      } catch (error) {
        console.error(`[Marketplace] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Get marketplace statistics
   */
  getStats() {
    let totalDownloads = 0;
    let totalVersions = 0;
    const avgVersionsPerPlugin = this.catalog.size > 0
      ? Array.from(this.catalog.values()).reduce((sum, p) => sum + p.versions.size, 0) / this.catalog.size
      : 0;

    for (const entry of this.catalog.values()) {
      totalDownloads += entry.downloads;
      totalVersions += entry.versions.size;
    }

    const avgRating = this.catalog.size > 0
      ? Array.from(this.catalog.values()).reduce((sum, p) => sum + p.rating, 0) / this.catalog.size
      : 0;

    return {
      totalPlugins: this.catalog.size,
      totalVersions,
      totalDownloads,
      avgVersionsPerPlugin: avgVersionsPerPlugin.toFixed(2),
      avgRating: avgRating.toFixed(2),
      categories: Array.from(new Set(Array.from(this.catalog.values()).map(p => p.category))),
      capabilities: Array.from(this.searchIndex.keys())
    };
  }
}

/**
 * Dependency Resolver
 * Resolves plugin dependency trees and version constraints
 */
export class DependencyResolver {
  constructor(options = {}) {
    this.marketplace = options.marketplace || new PluginMarketplace();
    this.debug = options.debug || false;
  }

  /**
   * Resolve dependencies for plugin
   */
  resolveDepencies(pluginName, pluginVersion) {
    const plugin = this.marketplace.getPlugin(pluginName, pluginVersion);
    if (!plugin) {
      return { success: false, error: 'PLUGIN_NOT_FOUND', resolved: [] };
    }

    try {
      const resolved = this._resolveDependencyTree(plugin, new Set());
      return { success: true, resolved };
    } catch (error) {
      return { success: false, error: error.message, resolved: [] };
    }
  }

  /**
   * Recursively resolve dependency tree
   */
  _resolveDependencyTree(plugin, visited = new Set()) {
    const identifier = `${plugin.name}@${plugin.version}`;

    if (visited.has(identifier)) {
      return []; // Already processed
    }

    visited.add(identifier);
    const resolved = [{ name: plugin.name, version: plugin.version, plugin }];

    // Resolve dependencies
    for (const [depName, depConstraint] of Object.entries(plugin.dependencies)) {
      const depPlugin = this.marketplace.getPlugin(depName, depConstraint);
      if (!depPlugin) {
        throw new Error(`Unresolvable dependency: ${depName}@${depConstraint}`);
      }

      const subDeps = this._resolveDependencyTree(depPlugin, visited);
      resolved.push(...subDeps);
    }

    return resolved;
  }

  /**
   * Check if dependencies are satisfied
   */
  canInstall(pluginName, pluginVersion, installedPlugins = {}) {
    const plugin = this.marketplace.getPlugin(pluginName, pluginVersion);
    if (!plugin) return { canInstall: false, missing: [] };

    const missing = [];

    for (const [depName, depConstraint] of Object.entries(plugin.dependencies)) {
      const installedVersion = installedPlugins[depName];

      if (!installedVersion) {
        // Try to find compatible version
        const available = this.marketplace.getPlugin(depName, depConstraint);
        if (!available) {
          missing.push({ name: depName, constraint: depConstraint });
        }
      } else {
        // Check if installed version satisfies constraint
        const depPlugin = new PluginVersion('temp', installedVersion);
        const requiredPlugin = this.marketplace.getPlugin(depName, depConstraint);

        if (!requiredPlugin || !installedVersion.match(new RegExp(depConstraint))) {
          missing.push({ name: depName, constraint: depConstraint, installed: installedVersion });
        }
      }
    }

    return {
      canInstall: missing.length === 0,
      missing
    };
  }
}

/**
 * Hot-Swap Plugin Loader
 * Dynamically loads and unloads plugins without restart
 */
export class HotSwapLoader {
  constructor(options = {}) {
    this.loaded = new Map(); // pluginId -> { plugin, exports, hotswapped, timestamp }
    this.marketplace = options.marketplace || new PluginMarketplace();
    this.resolver = new DependencyResolver({ marketplace: this.marketplace });
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Load plugin
   */
  loadPlugin(pluginName, pluginVersion, pluginExports = {}) {
    const identifier = `${pluginName}@${pluginVersion}`;

    // Check dependencies
    const canInstall = this.resolver.canInstall(pluginName, pluginVersion, this._getInstalledMap());
    if (!canInstall.canInstall) {
      return { success: false, error: 'MISSING_DEPENDENCIES', missing: canInstall.missing };
    }

    const plugin = this.marketplace.getPlugin(pluginName, pluginVersion);
    if (!plugin) {
      return { success: false, error: 'PLUGIN_NOT_FOUND' };
    }

    // Check for existing version
    if (this.loaded.has(identifier)) {
      return { success: false, error: 'ALREADY_LOADED' };
    }

    // Load with provided exports
    this.loaded.set(identifier, {
      name: pluginName,
      version: pluginVersion,
      plugin,
      exports: pluginExports,
      loaded: Date.now(),
      hotswapped: 0
    });

    if (this.debug) {
      console.log(`[HotSwap] Loaded ${identifier}`);
    }

    this._emitLoad(pluginName, pluginVersion);
    return { success: true, plugin };
  }

  /**
   * Hot-swap plugin to new version
   */
  hotswap(pluginName, fromVersion, toVersion) {
    const fromId = `${pluginName}@${fromVersion}`;
    const toId = `${pluginName}@${toVersion}`;

    if (!this.loaded.has(fromId)) {
      return { success: false, error: 'PLUGIN_NOT_LOADED' };
    }

    const newPlugin = this.marketplace.getPlugin(pluginName, toVersion);
    if (!newPlugin) {
      return { success: false, error: 'TARGET_VERSION_NOT_FOUND' };
    }

    // Unload old, load new
    const oldEntry = this.loaded.get(fromId);
    this.loaded.delete(fromId);

    this.loaded.set(toId, {
      name: pluginName,
      version: toVersion,
      plugin: newPlugin,
      exports: oldEntry.exports,
      loaded: Date.now(),
      hotswapped: oldEntry.hotswapped + 1
    });

    if (this.debug) {
      console.log(`[HotSwap] Swapped ${pluginName}: ${fromVersion} → ${toVersion}`);
    }

    this._emitHotswap(pluginName, fromVersion, toVersion);
    return { success: true, plugin: newPlugin, hotswaps: oldEntry.hotswapped + 1 };
  }

  /**
   * Unload plugin
   */
  unloadPlugin(pluginName, pluginVersion) {
    const identifier = `${pluginName}@${pluginVersion}`;

    if (!this.loaded.has(identifier)) {
      return { success: false, error: 'PLUGIN_NOT_LOADED' };
    }

    this.loaded.delete(identifier);

    if (this.debug) {
      console.log(`[HotSwap] Unloaded ${identifier}`);
    }

    this._emitUnload(pluginName, pluginVersion);
    return { success: true };
  }

  /**
   * Get loaded plugin
   */
  getLoaded(pluginName, pluginVersion = null) {
    if (pluginVersion) {
      const id = `${pluginName}@${pluginVersion}`;
      return this.loaded.get(id) || null;
    }

    // Find latest version
    let latest = null;
    for (const [key, entry] of this.loaded) {
      if (entry.name === pluginName) {
        if (!latest || entry.version > latest.version) {
          latest = entry;
        }
      }
    }
    return latest;
  }

  /**
   * List loaded plugins
   */
  listLoaded() {
    const plugins = [];
    for (const entry of this.loaded.values()) {
      plugins.push({
        name: entry.name,
        version: entry.version,
        loaded: entry.loaded,
        hotswaps: entry.hotswapped
      });
    }
    return plugins;
  }

  /**
   * Get installed map for dependency checking
   */
  _getInstalledMap() {
    const installed = {};
    for (const entry of this.loaded.values()) {
      installed[entry.name] = entry.version;
    }
    return installed;
  }

  /**
   * Register event handler
   */
  onEvent(handler) {
    this.handlers.push(handler);
  }

  /**
   * Emit events
   */
  _emitLoad(name, version) {
    this._emit({ event: 'LOAD', name, version });
  }

  _emitUnload(name, version) {
    this._emit({ event: 'UNLOAD', name, version });
  }

  _emitHotswap(name, from, to) {
    this._emit({ event: 'HOTSWAP', name, from, to });
  }

  _emit(event) {
    this.handlers.forEach(handler => {
      try {
        handler({ ...event, timestamp: Date.now() });
      } catch (error) {
        console.error(`[HotSwap] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    const entries = Array.from(this.loaded.values());
    const totalHotswaps = entries.reduce((sum, e) => sum + e.hotswapped, 0);

    return {
      loadedPlugins: this.loaded.size,
      plugins: entries.map(e => ({ name: e.name, version: e.version, hotswaps: e.hotswapped })),
      totalHotswaps,
      avgHotswapsPerPlugin: entries.length > 0 ? (totalHotswaps / entries.length).toFixed(2) : 0
    };
  }
}

export default {
  PluginVersion,
  PluginCatalogEntry,
  PluginMarketplace,
  DependencyResolver,
  HotSwapLoader
};

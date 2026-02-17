/**
 * Plugin Manager - Extensibility Layer
 *
 * Provides a plug-in architecture for extending the medical module
 * without modifying core code. Supports:
 * - Dynamic plugin discovery
 * - Lifecycle management (init, execute, cleanup)
 * - Dependency resolution
 * - Version compatibility checking
 * - Plugin isolation and error handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PluginManager {
  constructor(options = {}) {
    this.pluginsDir = options.pluginsDir || path.join(path.dirname(__dirname), 'plugins');
    this.plugins = new Map();
    this.hooks = new Map();
    this.verbose = options.verbose || false;
  }

  /**
   * Discover and load all plugins from plugins directory
   */
  async discoverPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      if (this.verbose) {
        console.log(`Plugins directory not found: ${this.pluginsDir}`);
      }
      return [];
    }

    const files = fs.readdirSync(this.pluginsDir);
    const pluginFiles = files.filter(f =>
      f.endsWith('.js') && !f.startsWith('_') && f !== 'README.md'
    );

    if (this.verbose) {
      console.log(`Discovered ${pluginFiles.length} plugin(s): ${pluginFiles.join(', ')}`);
    }

    const discovered = [];
    for (const file of pluginFiles) {
      try {
        const pluginPath = path.join(this.pluginsDir, file);
        const plugin = await import(`file://${pluginPath}`);

        if (!this._validatePlugin(plugin.default || plugin)) {
          if (this.verbose) {
            console.warn(`Invalid plugin structure: ${file}`);
          }
          continue;
        }

        discovered.push({
          file,
          path: pluginPath,
          module: plugin.default || plugin
        });
      } catch (error) {
        if (this.verbose) {
          console.error(`Failed to load plugin ${file}: ${error.message}`);
        }
      }
    }

    return discovered;
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin) {
    const metadata = plugin.metadata || {};
    const name = metadata.name || 'unknown';

    if (this.plugins.has(name)) {
      throw new Error(`Plugin already registered: ${name}`);
    }

    // Check version compatibility
    if (metadata.requiresModuleVersion) {
      const compatible = this._checkVersionCompatibility(
        '1.0.0',
        metadata.requiresModuleVersion
      );

      if (!compatible) {
        throw new Error(
          `Plugin ${name} requires module version ${metadata.requiresModuleVersion}, but current is 1.0.0`
        );
      }
    }

    // Initialize plugin
    if (typeof plugin.initialize === 'function') {
      try {
        await plugin.initialize();
        if (this.verbose) {
          console.log(`✓ Plugin initialized: ${name}`);
        }
      } catch (error) {
        throw new Error(`Plugin ${name} initialization failed: ${error.message}`);
      }
    }

    // Register hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({
          plugin: name,
          handler
        });

        if (this.verbose) {
          console.log(`  Registered hook: ${hookName}`);
        }
      });
    }

    this.plugins.set(name, plugin);

    if (this.verbose) {
      console.log(`✅ Plugin registered: ${name} v${metadata.version || '0.0.0'}`);
    }

    return { success: true, name };
  }

  /**
   * Execute a hook (call all registered handlers)
   */
  async executeHook(hookName, data) {
    if (!this.hooks.has(hookName)) {
      return data; // No handlers, return data unchanged
    }

    const handlers = this.hooks.get(hookName);
    let result = data;

    for (const { plugin, handler } of handlers) {
      try {
        if (this.verbose) {
          console.log(`  Executing hook: ${hookName} (plugin: ${plugin})`);
        }

        result = await handler(result);
      } catch (error) {
        console.error(`Hook ${hookName} failed in plugin ${plugin}: ${error.message}`);
        // Continue with other handlers
      }
    }

    return result;
  }

  /**
   * Get plugin by name
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /**
   * List all registered plugins
   */
  listPlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.metadata?.version || '0.0.0',
      description: plugin.metadata?.description || 'No description',
      hooks: plugin.hooks ? Object.keys(plugin.hooks) : []
    }));
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    // Cleanup
    if (typeof plugin.cleanup === 'function') {
      try {
        await plugin.cleanup();
      } catch (error) {
        console.error(`Plugin ${name} cleanup failed: ${error.message}`);
      }
    }

    // Remove hooks
    for (const [hookName, handlers] of this.hooks.entries()) {
      this.hooks.set(
        hookName,
        handlers.filter(h => h.plugin !== name)
      );
    }

    this.plugins.delete(name);

    if (this.verbose) {
      console.log(`✓ Plugin unregistered: ${name}`);
    }
  }

  /**
   * Validate plugin structure
   */
  _validatePlugin(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    if (!plugin.metadata || !plugin.metadata.name) {
      return false;
    }

    // Must have either hooks or execute method
    if (!plugin.hooks && typeof plugin.execute !== 'function') {
      return false;
    }

    return true;
  }

  /**
   * Check version compatibility (simple semver)
   */
  _checkVersionCompatibility(current, required) {
    const [cMajor, cMinor] = current.split('.').map(Number);
    const [rMajor, rMinor] = required.split('.').map(Number);

    // Major version must match
    if (cMajor !== rMajor) {
      return false;
    }

    // Minor version must be >= required
    if (cMinor < rMinor) {
      return false;
    }

    return true;
  }
}

/**
 * Available Hooks:
 *
 * pre-ingestion     - Before data enters the pipeline
 * post-ingestion    - After ingestion agent completes
 * pre-triage        - Before triage/classification
 * post-triage       - After classification completes
 * pre-summarization - Before summarization
 * post-summarization- After summarization completes
 * pre-risk-scoring  - Before risk scoring
 * post-risk-scoring - After risk scoring completes
 * pre-output        - Before final output formatting
 * post-output       - After pipeline completes
 * on-error          - When any agent errors
 * on-validation-fail- When validation fails
 */

/**
 * Plugin Interface Example:
 *
 * export default {
 *   metadata: {
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     description: 'My awesome plugin',
 *     author: 'Your Name',
 *     requiresModuleVersion: '1.0.0'
 *   },
 *
 *   async initialize() {
 *     // Setup code
 *   },
 *
 *   hooks: {
 *     'post-triage': async (data) => {
 *       // Modify or augment data
 *       return data;
 *     },
 *
 *     'post-output': async (data) => {
 *       // Process final output
 *       return data;
 *     }
 *   },
 *
 *   async execute(context) {
 *     // Direct execution method (optional)
 *     return result;
 *   },
 *
 *   async cleanup() {
 *     // Teardown code
 *   }
 * }
 */

/**
 * Factory function
 */
export function createPluginManager(options) {
  return new PluginManager(options);
}

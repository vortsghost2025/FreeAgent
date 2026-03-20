/**
 * COMMAND PALETTE
 * Quick access command system with fuzzy search, keyboard shortcuts, and history
 * Part of Kilo Code YOLO productivity system
 */

import { EventEmitter } from 'events';

/**
 * Fuzzy Matcher - performs fuzzy string matching
 */
class FuzzyMatcher {
  /**
   * Calculate fuzzy match score
   * @param {string} query - Search query
   * @param {string} target - Target string
   * @returns {Object} Match result with score and indices
   */
  static match(query, target) {
    if (!query) return { matches: true, score: 0, indices: [] };
    
    query = query.toLowerCase();
    target = target.toLowerCase();
    
    let queryIndex = 0;
    let targetIndex = 0;
    const indices = [];
    let score = 0;
    let consecutiveBonus = 0;
    let prevMatchIndex = -2;
    
    while (queryIndex < query.length && targetIndex < target.length) {
      if (query[queryIndex] === target[targetIndex]) {
        indices.push(targetIndex);
        
        // Base score
        score += 1;
        
        // Bonus for consecutive matches
        if (targetIndex === prevMatchIndex + 1) {
          consecutiveBonus += 5;
          score += consecutiveBonus;
        } else {
          consecutiveBonus = 0;
        }
        
        // Bonus for matching at start
        if (targetIndex === 0) {
          score += 10;
        }
        
        // Bonus for matching after separator
        if (targetIndex > 0 && /[-_\s/]/.test(target[targetIndex - 1])) {
          score += 8;
        }
        
        // Bonus for camelCase match
        if (targetIndex > 0 && target[targetIndex] === target[targetIndex].toUpperCase()) {
          score += 5;
        }
        
        prevMatchIndex = targetIndex;
        queryIndex++;
      }
      targetIndex++;
    }
    
    const matches = queryIndex === query.length;
    return { matches, score: matches ? score : 0, indices };
  }

  /**
   * Sort results by score
   * @param {Array} results - Array of {item, score}
   * @returns {Array} Sorted results
   */
  static sort(results) {
    return results.sort((a, b) => b.score - a.score);
  }
}

/**
 * Command Registry - stores and manages commands
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.aliasMap = new Map();
  }

  /**
   * Register a command
   * @param {Object} command - Command definition
   */
  register(command) {
    const { id, alias, ...rest } = command;
    this.commands.set(id, { id, ...rest });
    
    if (alias) {
      this.aliasMap.set(alias, id);
    }
  }

  /**
   * Unregister a command
   * @param {string} id - Command ID
   */
  unregister(id) {
    const command = this.commands.get(id);
    if (command && command.alias) {
      this.aliasMap.delete(command.alias);
    }
    this.commands.delete(id);
  }

  /**
   * Get command by ID
   * @param {string} id - Command ID
   * @returns {Object|null}
   */
  get(id) {
    const resolvedId = this.aliasMap.get(id) || id;
    return this.commands.get(resolvedId) || null;
  }

  /**
   * Get all commands
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.commands.values());
  }

  /**
   * Search commands with fuzzy matching
   * @param {string} query - Search query
   * @returns {Array} Matched commands with scores
   */
  search(query) {
    const results = [];
    
    for (const command of this.commands.values()) {
      // Search in name
      const nameMatch = FuzzyMatcher.match(query, command.name || '');
      // Search in description
      const descMatch = FuzzyMatcher.match(query, command.description || '');
      // Search in tags
      let tagMatch = { matches: false, score: 0 };
      if (command.tags) {
        for (const tag of command.tags) {
          const m = FuzzyMatcher.match(query, tag);
          if (m.matches) {
            tagMatch = { matches: true, score: m.score + 5 }; // Bonus for tags
            break;
          }
        }
      }
      
      const bestScore = Math.max(nameMatch.score, descMatch.score, tagMatch.score);
      if (bestScore > 0) {
        results.push({
          command,
          score: bestScore,
          matchType: nameMatch.score >= bestScore ? 'name' : 
                    tagMatch.score >= bestScore ? 'tag' : 'description'
        });
      }
    }
    
    return FuzzyMatcher.sort(results);
  }
}

/**
 * Command History - tracks command execution history
 */
class CommandHistory {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.history = [];
    this.frequencyMap = new Map();
  }

  /**
   * Add command to history
   * @param {string} commandId - Command ID
   */
  add(commandId) {
    // Remove if already exists (to move to end)
    const existingIndex = this.history.indexOf(commandId);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }
    
    // Add to end
    this.history.push(commandId);
    
    // Trim if needed
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
    
    // Update frequency
    const count = this.frequencyMap.get(commandId) || 0;
    this.frequencyMap.set(commandId, count + 1);
  }

  /**
   * Get recent history
   * @param {number} limit - Number of items
   * @returns {Array}
   */
  getRecent(limit = 10) {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Get most frequently used commands
   * @param {number} limit - Number of items
   * @returns {Array}
   */
  getFrequent(limit = 10) {
    const sorted = Array.from(this.frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    return sorted;
  }

  /**
   * Clear history
   */
  clear() {
    this.history = [];
    this.frequencyMap.clear();
  }
}

/**
 * Keyboard Shortcut Manager
 */
class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.sequenceMaps = new Map();
  }

  /**
   * Register a keyboard shortcut
   * @param {string} keys - Key combination (e.g., 'Ctrl+K')
   * @param {string} commandId - Command ID to execute
   * @param {Object} options - Additional options
   */
  register(keys, commandId, options = {}) {
    const normalizedKeys = this.normalizeKeys(keys);
    this.shortcuts.set(normalizedKeys, { commandId, ...options });
  }

  /**
   * Unregister a shortcut
   * @param {string} keys - Key combination
   */
  unregister(keys) {
    const normalizedKeys = this.normalizeKeys(keys);
    this.shortcuts.delete(normalizedKeys);
  }

  /**
   * Find command for key event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {Object|null}
   */
  findCommand(event) {
    const keys = this.getEventKeys(event);
    return this.shortcuts.get(keys) || null;
  }

  /**
   * Get all registered shortcuts
   * @returns {Map}
   */
  getAll() {
    return new Map(this.shortcuts);
  }

  /**
   * Normalize key combination
   * @param {string} keys - Key combination
   * @returns {string}
   */
  normalizeKeys(keys) {
    return keys
      .toLowerCase()
      .replace(/ctrl/gi, 'ctrl')
      .replace(/alt/gi, 'alt')
      .replace(/shift/gi, 'shift')
      .replace(/\s+/g, '')
      .split('+')
      .sort()
      .join('+');
  }

  /**
   * Get keys from keyboard event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string}
   */
  getEventKeys(event) {
    const keys = [];
    if (event.ctrlKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    if (event.key && !['Control', 'Alt', 'Shift'].includes(event.key)) {
      keys.push(event.key.toLowerCase());
    }
    return keys.sort().join('+');
  }
}

/**
 * Main Command Palette
 */
export class CommandPalette extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = new CommandRegistry();
    this.history = new CommandHistory({ maxSize: options.historySize || 100 });
    this.shortcuts = new ShortcutManager();
    this.config = {
      fuzzyThreshold: options.fuzzyThreshold || 0.5,
      maxResults: options.maxResults || 10,
      ...options
    };
    
    // Bind keyboard handler
    this._boundKeyHandler = this._handleKeyDown.bind(this);
  }

  /**
   * Initialize command palette (attach keyboard listeners)
   * @param {HTMLElement} element - Target element (default: window)
   */
  initialize(element = null) {
    const target = element || (typeof window !== 'undefined' ? window : null);
    if (target) {
      target.addEventListener('keydown', this._boundKeyHandler);
    }
  }

  /**
   * Destroy command palette (remove keyboard listeners)
   * @param {HTMLElement} element - Target element
   */
  destroy(element = null) {
    const target = element || (typeof window !== 'undefined' ? window : null);
    if (target) {
      target.removeEventListener('keydown', this._boundKeyHandler);
    }
  }

  /**
   * Register a command
   * @param {Object} command - Command definition
   */
  registerCommand(command) {
    this.registry.register(command);
    this.emit('command:registered', command);
  }

  /**
   * Unregister a command
   * @param {string} id - Command ID
   */
  unregisterCommand(id) {
    this.registry.unregister(id);
    this.emit('command:unregistered', { id });
  }

  /**
   * Execute a command
   * @param {string} commandId - Command ID
   * @param {Object} context - Execution context
   * @returns {Promise}
   */
  async execute(commandId, context = {}) {
    const command = this.registry.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }
    
    this.history.add(commandId);
    this.emit('command:executed', { command, context });
    
    if (command.handler) {
      return command.handler(context);
    }
    
    return null;
  }

  /**
   * Search commands
   * @param {string} query - Search query
   * @returns {Array}
   */
  search(query) {
    if (!query) {
      // Return recent commands if no query
      return this.history.getRecent(this.config.maxResults).map(id => ({
        command: this.registry.get(id),
        score: 0,
        matchType: 'recent'
      })).filter(r => r.command);
    }
    
    const results = this.registry.search(query);
    return results
      .slice(0, this.config.maxResults)
      .map(r => ({
        command: r.command,
        score: r.score,
        matchType: r.matchType
      }));
  }

  /**
   * Register keyboard shortcut
   * @param {string} keys - Key combination
   * @param {string} commandId - Command ID
   * @param {Object} options - Additional options
   */
  registerShortcut(keys, commandId, options = {}) {
    this.shortcuts.register(keys, commandId, options);
  }

  /**
   * Unregister keyboard shortcut
   * @param {string} keys - Key combination
   */
  unregisterShortcut(keys) {
    this.shortcuts.unregister(keys);
  }

  /**
   * Get command history
   * @param {number} limit - Number of items
   * @returns {Array}
   */
  getHistory(limit = 10) {
    return this.history.getRecent(limit);
  }

  /**
   * Get frequently used commands
   * @param {number} limit - Number of items
   * @returns {Array}
   */
  getFrequentCommands(limit = 10) {
    return this.history.getFrequent(limit);
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  _handleKeyDown(event) {
    // Check for Ctrl+K or Cmd+K to open palette
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.emit('palette:open');
      return;
    }
    
    // Check for Escape to close
    if (event.key === 'Escape') {
      this.emit('palette:close');
      return;
    }
    
    // Check for registered shortcuts
    const shortcut = this.shortcuts.findCommand(event);
    if (shortcut) {
      event.preventDefault();
      this.execute(shortcut.commandId);
      this.emit('shortcut:triggered', { keys: event.key, commandId: shortcut.commandId });
    }
  }

  /**
   * Get all registered commands
   * @returns {Array}
   */
  getCommands() {
    return this.registry.getAll();
  }

  /**
   * Get all shortcuts
   * @returns {Map}
   */
  getShortcuts() {
    return this.shortcuts.getAll();
  }

  /**
   * Get palette status
   * @returns {Object}
   */
  getStatus() {
    return {
      commands: this.registry.commands.size,
      shortcuts: this.shortcuts.shortcuts.size,
      history: this.history.history.length,
      timestamp: Date.now()
    };
  }
}

// Default singleton instance
let defaultPalette = null;

/**
 * Get default command palette instance
 * @returns {CommandPalette}
 */
export function getCommandPalette() {
  if (!defaultPalette) {
    defaultPalette = new CommandPalette();
  }
  return defaultPalette;
}

/**
 * Create new command palette instance
 * @param {Object} options - Palette options
 * @returns {CommandPalette}
 */
export function createCommandPalette(options) {
  return new CommandPalette(options);
}

export default CommandPalette;
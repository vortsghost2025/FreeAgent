/**
 * Context Slice Manager - Smart Context Management for FreeAgent Cockpit
 * 
 * Creates modular "slices" of context that can be loaded/unloaded dynamically
 * to optimize token usage while maintaining conversation context.
 * 
 * Features:
 * - Modular context slices (session, project, task, system, memory)
 * - Dynamic loading/unloading of context slices
 * - Configurable max context tokens (default: 100k for Claude, 32k for Gemini)
 * - LRU eviction when context exceeds limits
 * - Integration with iteration governor for safety
 * 
 * Methods:
 * - createSlice(): Create a new context slice
 * - loadSlice(): Load a slice into active context
 * - unloadSlice(): Unload a slice from active context
 * - getActiveSlices(): Get all currently active slices
 * - optimizeContext(): Optimize context to fit within token limits
 * - getContextSummary(): Get summary of all slices and their states
 */

const SliceTemplates = require('./sliceTemplates');

class ContextSliceManager {
  constructor(options = {}) {
    // Token limits per model
    this.maxTokens = {
      claude: options.maxTokens?.claude || 100000,  // 100k for Claude
      gemini: options.maxTokens?.gemini || 32000,    // 32k for Gemini
      local: options.maxTokens?.local || 8192,       // 8k for local models
      default: options.maxTokens?.default || 32000
    };

    // Current model being used
    this.currentModel = options.defaultModel || 'claude';

    // Slice storage - all slices (loaded and unloaded)
    this.slices = new Map();

    // Active slices - currently loaded into context
    this.activeSlices = new Map();

    // LRU tracking for eviction
    this.lruOrder = [];

    // Token tracking
    this.currentTokenCount = 0;

    // Eviction callbacks
    this.onSliceEvicted = options.onSliceEvicted || null;
    this.onSliceLoaded = options.onSliceLoaded || null;
    this.onContextOptimized = options.onContextOptimized || null;

    // Logger
    this.logger = options.logger || console;

    // Slice priority weights (higher = more important, less likely to evict)
    this.priorityWeights = {
      system: 100,
      session: 80,
      task: 60,
      project: 40,
      memory: 20
    };

    // Initialize default slices
    this._initializeDefaultSlices();
  }

  /**
   * Initialize default slice templates
   * @private
   */
  _initializeDefaultSlices() {
    // Create slices from templates
    const templates = SliceTemplates.getAllTemplates();
    for (const [type, template] of Object.entries(templates)) {
      this.slices.set(type, {
        id: type,
        type,
        name: template.name,
        description: template.description,
        content: '',
        tokens: 0,
        priority: this.priorityWeights[type] || 50,
        loaded: false,
        lastAccessed: Date.now(),
        metadata: template.metadata || {}
      });
    }
    this.logger.log('[ContextSliceManager] Default slices initialized');
  }

  /**
   * Set the current model (affects token limits)
   * @param {string} model - Model identifier ('claude', 'gemini', 'local')
   */
  setModel(model) {
    this.currentModel = model;
    this.logger.log(`[ContextSliceManager] Model set to: ${model}`);
  }

  /**
   * Get max tokens for current model
   * @returns {number} - Max token count
   */
  getMaxTokens() {
    return this.maxTokens[this.currentModel] || this.maxTokens.default;
  }

  /**
   * Estimate token count for text (rough approximation: ~4 chars per token)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} - Estimated token count
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    // Rough approximation: 4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Create a new context slice
   * @param {string} type - Slice type ('session', 'project', 'task', 'system', 'memory', or custom)
   * @param {string} name - Slice name
   * @param {string} content - Slice content
   * @param {object} options - Additional options (metadata, priority)
   * @returns {object} - Created slice
   */
  createSlice(type, name, content, options = {}) {
    const id = options.id || `${type}_${Date.now()}`;
    const tokens = this.estimateTokens(content);
    
    const slice = {
      id,
      type,
      name: name || type,
      description: options.description || '',
      content,
      tokens,
      priority: options.priority || this.priorityWeights[type] || 50,
      loaded: false,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      metadata: options.metadata || {}
    };

    this.slices.set(id, slice);
    this.logger.log(`[ContextSliceManager] Created slice: ${id} (${type}, ~${tokens} tokens)`);

    return slice;
  }

  /**
   * Load a slice into active context
   * @param {string} sliceId - Slice ID to load
   * @param {boolean} force - Force load even if over limit
   * @returns {object} - Result with success status and token count
   */
  loadSlice(sliceId, force = false) {
    const slice = this.slices.get(sliceId);
    if (!slice) {
      return { success: false, reason: 'Slice not found', sliceId };
    }

    if (slice.loaded) {
      // Update last accessed time
      slice.lastAccessed = Date.now();
      this._updateLRU(sliceId);
      return { success: true, reason: 'Already loaded', sliceId, tokens: this.currentTokenCount };
    }

    // Check if we need to make room
    const newTokenCount = this.currentTokenCount + slice.tokens;
    const maxTokens = this.getMaxTokens();

    if (!force && newTokenCount > maxTokens) {
      // Try to optimize context first
      const optimizeResult = this.optimizeContext(slice.tokens);
      if (!optimizeResult.success) {
        return { 
          success: false, 
          reason: 'Token limit exceeded and cannot optimize enough', 
          sliceId,
          currentTokens: this.currentTokenCount,
          needed: slice.tokens,
          available: maxTokens - this.currentTokenCount
        };
      }
    }

    // Load the slice
    slice.loaded = true;
    slice.lastAccessed = Date.now();
    this.activeSlices.set(sliceId, slice);
    this.currentTokenCount += slice.tokens;
    this._updateLRU(sliceId);

    this.logger.log(`[ContextSliceManager] Loaded slice: ${sliceId} (~${slice.tokens} tokens, total: ${this.currentTokenCount})`);

    if (this.onSliceLoaded) {
      this.onSliceLoaded(slice);
    }

    return { 
      success: true, 
      sliceId, 
      tokens: this.currentTokenCount,
      slice 
    };
  }

  /**
   * Unload a slice from active context
   * @param {string} sliceId - Slice ID to unload
   * @returns {object} - Result with success status
   */
  unloadSlice(sliceId) {
    const slice = this.slices.get(sliceId);
    if (!slice) {
      return { success: false, reason: 'Slice not found', sliceId };
    }

    if (!slice.loaded) {
      return { success: true, reason: 'Already unloaded', sliceId };
    }

    // Unload the slice
    slice.loaded = false;
    this.activeSlices.delete(sliceId);
    this.currentTokenCount -= slice.tokens;

    // Remove from LRU
    const lruIndex = this.lruOrder.indexOf(sliceId);
    if (lruIndex > -1) {
      this.lruOrder.splice(lruIndex, 1);
    }

    this.logger.log(`[ContextSliceManager] Unloaded slice: ${sliceId} (~${slice.tokens} tokens, total: ${this.currentTokenCount})`);

    return { 
      success: true, 
      sliceId, 
      tokens: this.currentTokenCount,
      freed: slice.tokens
    };
  }

  /**
   * Get all currently active slices
   * @returns {Array} - Array of active slice objects
   */
  getActiveSlices() {
    return Array.from(this.activeSlices.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all slices (loaded and unloaded)
   * @returns {Array} - Array of all slice objects
   */
  getAllSlices() {
    return Array.from(this.slices.values());
  }

  /**
   * Update slice content
   * @param {string} sliceId - Slice ID
   * @param {string} newContent - New content
   * @returns {object} - Result
   */
  updateSliceContent(sliceId, newContent) {
    const slice = this.slices.get(sliceId);
    if (!slice) {
      return { success: false, reason: 'Slice not found' };
    }

    const oldTokens = slice.tokens;
    const newTokens = this.estimateTokens(newContent);
    const tokenDiff = newTokens - oldTokens;

    // If loaded, update token count
    if (slice.loaded) {
      const newTotal = this.currentTokenCount + tokenDiff;
      if (newTotal > this.getMaxTokens()) {
        return { 
          success: false, 
          reason: 'Token limit would be exceeded',
          current: this.currentTokenCount,
          needed: tokenDiff,
          available: this.getMaxTokens() - this.currentTokenCount
        };
      }
      this.currentTokenCount = newTotal;
    }

    slice.content = newContent;
    slice.tokens = newTokens;
    slice.lastAccessed = Date.now();

    this.logger.log(`[ContextSliceManager] Updated slice: ${sliceId} (${oldTokens} → ${newTokens} tokens)`);

    return { success: true, sliceId, oldTokens, newTokens };
  }

  /**
   * Optimize context to fit within token limits
   * @param {number} neededTokens - Additional tokens needed (optional)
   * @returns {object} - Result with optimization details
   */
  optimizeContext(neededTokens = 0) {
    const maxTokens = this.getMaxTokens();
    const targetTokens = maxTokens - neededTokens;
    
    if (this.currentTokenCount <= targetTokens) {
      return { 
        success: true, 
        reason: 'No optimization needed',
        freed: 0,
        currentTokens: this.currentTokenCount
      };
    }

    const tokensToFree = this.currentTokenCount - targetTokens;
    let freedTokens = 0;
    const evictedSlices = [];

    // Sort active slices by priority (lowest first) for eviction
    const sortedActive = Array.from(this.activeSlices.values())
      .sort((a, b) => a.priority - b.priority);

    for (const slice of sortedActive) {
      if (freedTokens >= tokensToFree) break;

      // Don't evict system slices
      if (slice.type === 'system') continue;

      const result = this.unloadSlice(slice.id);
      if (result.success) {
        freedTokens += result.freed;
        evictedSlices.push(slice.id);
      }
    }

    const finalTokenCount = this.currentTokenCount;
    const optimizationSuccess = finalTokenCount <= targetTokens;

    this.logger.log(`[ContextSliceManager] Context optimization: ${evictedSlices.length} slices evicted, ${freedTokens} tokens freed, ${finalTokenCount} remaining`);

    if (this.onContextOptimized) {
      this.onContextOptimized({
        evictedSlices,
        freedTokens,
        currentTokens: finalTokenCount,
        targetTokens,
        success: optimizationSuccess
      });
    }

    return {
      success: optimizationSuccess,
      freed: freedTokens,
      evicted: evictedSlices,
      currentTokens: finalTokenCount,
      targetTokens,
      reason: optimizationSuccess ? 'Optimization successful' : 'Could not free enough tokens'
    };
  }

  /**
   * Get context summary for all slices and their states
   * @returns {object} - Summary object
   */
  getContextSummary() {
    const maxTokens = this.getMaxTokens();
    const slicesByType = {};
    
    for (const slice of this.slices.values()) {
      if (!slicesByType[slice.type]) {
        slicesByType[slice.type] = [];
      }
      slicesByType[slice.type].push({
        id: slice.id,
        name: slice.name,
        loaded: slice.loaded,
        tokens: slice.tokens,
        priority: slice.priority,
        lastAccessed: slice.lastAccessed
      });
    }

    return {
      currentModel: this.currentModel,
      maxTokens,
      currentTokens: this.currentTokenCount,
      usagePercentage: Math.round((this.currentTokenCount / maxTokens) * 100),
      activeCount: this.activeSlices.size,
      totalCount: this.slices.size,
      slicesByType,
      lruOrder: [...this.lruOrder]
    };
  }

  /**
   * Build enriched context from active slices
   * @param {object} options - Build options
   * @returns {object} - Built context with messages and system prompt
   */
  buildContext(options = {}) {
    const { includeTypes = ['system', 'session', 'task', 'memory'], systemPrefix = '', userMessage = '' } = options;
    
    const contextParts = [];
    let systemContent = systemPrefix;
    let messages = [];

    // Get active slices sorted by priority
    const activeSorted = this.getActiveSlices()
      .filter(s => includeTypes.includes(s.type));

    // Build system content from slices
    for (const slice of activeSorted) {
      if (slice.type === 'system' && slice.content) {
        systemContent += (systemContent ? '\n\n' : '') + slice.content;
      } else if (slice.content) {
        contextParts.push({
          type: slice.type,
          content: slice.content
        });
      }
    }

    // Build messages array
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    // Add context as additional context (appended to user message)
    if (contextParts.length > 0 && userMessage) {
      const contextText = contextParts
        .map(c => `[${c.type.toUpperCase()}]: ${c.content}`)
        .join('\n\n');
      
      messages[0].content += `\n\n--- Context ---\n${contextText}`;
    }

    return {
      system: systemContent,
      messages,
      tokenCount: this.currentTokenCount,
      slicesUsed: activeSorted.map(s => s.id)
    };
  }

  /**
   * Update LRU order
   * @private
   */
  _updateLRU(sliceId) {
    const index = this.lruOrder.indexOf(sliceId);
    if (index > -1) {
      this.lruOrder.splice(index, 1);
    }
    this.lruOrder.push(sliceId);
  }

  /**
   * Get slice by ID
   * @param {string} sliceId - Slice ID
   * @returns {object|null} - Slice or null
   */
  getSlice(sliceId) {
    return this.slices.get(sliceId) || null;
  }

  /**
   * Delete a slice
   * @param {string} sliceId - Slice ID
   * @returns {boolean} - Success
   */
  deleteSlice(sliceId) {
    const slice = this.slices.get(sliceId);
    if (!slice) return false;

    // Unload if loaded
    if (slice.loaded) {
      this.unloadSlice(sliceId);
    }

    this.slices.delete(sliceId);
    this.logger.log(`[ContextSliceManager] Deleted slice: ${sliceId}`);
    return true;
  }

  /**
   * Reset all slices
   */
  reset() {
    this.activeSlices.clear();
    this.currentTokenCount = 0;
    this.lruOrder = [];
    this._initializeDefaultSlices();
    this.logger.log('[ContextSliceManager] Reset complete');
  }

  /**
   * Get memory slice content for a given query
   * @param {string} query - Query to search memories for
   * @param {Array} memories - Array of memory objects with content and metadata
   * @param {number} maxTokens - Max tokens to use for memories
   * @returns {string} - Formatted memory content
   */
  formatMemoriesForContext(query, memories, maxTokens = 5000) {
    if (!memories || memories.length === 0) {
      return '';
    }

    let result = 'Relevant memories:\n';
    let currentTokens = 0;

    for (const memory of memories) {
      const memoryTokens = this.estimateTokens(memory.content);
      if (currentTokens + memoryTokens > maxTokens) break;
      
      result += `- ${memory.content}`;
      if (memory.metadata?.sessionId) {
        result += ` (from session: ${memory.metadata.sessionId})`;
      }
      result += '\n';
      currentTokens += memoryTokens;
    }

    return result;
  }
}

module.exports = ContextSliceManager;

/**
 * Create a new ContextSliceManager instance
 * @param {object} options - Configuration options
 * @returns {ContextSliceManager}
 */
function createContextSliceManager(options) {
  return new ContextSliceManager(options);
}

module.exports.createContextSliceManager = createContextSliceManager;

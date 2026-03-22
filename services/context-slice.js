/**
 * Context Slice Environment
 * Provides smart context management without passing full windows to models
 */

const { getCoordinator } = require('./agent-coordinator');

class ContextSlice {
  constructor() {
    this.coordinator = getCoordinator();
    this.contextRegistry = new Map();
    this.maxContextSize = 50000; // 50K tokens max
    this.sliceStrategies = {
      'summary_only': 'Just provide overview',
      'relevant_chunks': 'Key sections relevant to current task',
      'optimized': 'Include only most relevant context'
    };
  }

  /**
   * Store context for an agent
   */
  async registerContext(agentId, context) {
    const contextId = this.generateContextId();

    // Store in registry
    this.contextRegistry.set(contextId, {
      agentId,
      context,
      registeredAt: Date.now(),
      accessCount: 0
    });

    // Log to coordinator
    await this.coordinator.updateContext(agentId, {
      current_operation: 'context_registered',
      context_id: contextId,
      context_size: JSON.stringify(context).length
    });

    return contextId;
  }

  /**
   * Get context for an agent
   */
  async getContext(agentId, contextId, strategy = 'relevant_chunks') {
    const contextData = this.contextRegistry.get(contextId);
    if (!contextData) {
      throw new Error('Context not found');
    }

    contextData.accessCount++;

    // Apply slicing strategy
    const slicedContext = this.applySlicingStrategy(contextData.context, strategy);

    // Update access
    await this.coordinator.updateContext(agentId, {
      current_operation: 'context_retrieved',
      context_id: contextId,
      strategy_used: strategy,
      original_size: contextData.context.length,
      sliced_size: slicedContext.length
    });

    return slicedContext;
  }

  /**
   * Update context with new information
   */
  async updateContext(agentId, contextId, updates) {
    const contextData = this.contextRegistry.get(contextId);
    if (!contextData) {
      throw new Error('Context not found');
    }

    // Merge updates with existing context
    const mergedContext = this.mergeContext(contextData.context, updates);

    // Update registry
    this.contextRegistry.set(contextId, {
      ...contextData,
      context: mergedContext,
      lastUpdated: Date.now()
    });

    await this.coordinator.updateContext(agentId, {
      current_operation: 'context_updated',
      context_id: contextId,
      updates_count: updates.length
    });

    return { success: true };
  }

  /**
   * Apply slicing strategy
   */
  applySlicingStrategy(fullContext, strategy) {
    switch (strategy) {
      case 'summary_only':
        return this.summarizeContext(fullContext);
      case 'relevant_chunks':
        return this.extractRelevantChunks(fullContext);
      case 'optimized':
        return this.optimizeContext(fullContext);
      default:
        return fullContext; // No slicing
    }
  }

  summarizeContext(context) {
    const summary = {
      total_sections: 0,
      sections: []
    };

    // Split context into sections
    const lines = context.split('\n');
    let currentSection = [];
    let sectionTitle = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for section headers
      if (trimmedLine.match(/^#+\s+/) || trimmedLine.match(/^##\s+/)) {
        if (sectionTitle) {
          summary.sections.push({
            title: sectionTitle,
            content: currentSection.join('\n')
          });
        }
        sectionTitle = trimmedLine;
        currentSection = [];
      } else {
        currentSection.push(trimmedLine);
      }
    }

    return summary;
  }

  extractRelevantChunks(context) {
    // Identify task-relevant sections
    const relevantKeywords = ['task', 'objective', 'constraint', 'requirement', 'file'];
    const chunks = [];

    const lines = context.split('\n');
    let currentChunk = [];
    let currentTopic = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for topic markers
      if (trimmedLine.match(/^[A-Z]+:\s+/)) {
        // End chunk if new topic and non-empty
        if (currentTopic && currentChunk.length > 0) {
          chunks.push({
            topic: currentTopic,
            lines: currentChunk
          });
          currentChunk = [];
          currentTopic = '';
        }

        currentTopic = trimmedLine;
        currentChunk = [];
      } else if (currentTopic) {
        // Check if line is relevant
        const isRelevant = relevantKeywords.some(keyword =>
          trimmedLine.toLowerCase().includes(keyword));

        if (isRelevant || currentChunk.length > 0) {
          currentChunk.push(trimmedLine);
        }
      }
    }

    return chunks;
  }

  optimizeContext(context) {
    // Remove redundant information while preserving structure
    const lines = context.split('\n');
    const optimizedLines = [];

    let lastLine = '';
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Skip immediate duplicates
      if (line.trim() === lastLine) continue;

      optimizedLines.push(line);
      lastLine = line.trim();
    }

    return optimizedLines.join('\n');
  }

  mergeContext(existingContext, updates) {
    // Smart merge of updates into existing context
    const merged = { ...existingContext, ...updates };

    // Optimize size if needed
    if (JSON.stringify(merged).length > this.maxContextSize) {
      const optimized = this.summarizeContext(merged);
      // In real implementation, this would send only the optimized version
    }

    return merged;
  }

  generateContextId() {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateIterationId() {
    return `iter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getUsageStats() {
    return {
      total_contexts: this.contextRegistry.size,
      total_access: Array.from(this.contextRegistry.entries())
        .reduce((sum, [id, data]) => sum + (data.accessCount), 0),
      total_storage: this.contextRegistry.size,
      strategy_usage: {
        summary_only: 0,
        relevant_chunks: 0,
        optimized: 0
      }
    };
  }
}

module.exports = { ContextSlice, getSlice: () => new ContextSlice() };
/**
 * TOKEN-MINIMIZING PROMPT TEMPLATE
 * Reduces token usage by compressing context and using efficient templates
 */

class PromptOptimizer {
  constructor() {
    this.tokenEstimator = {
      // Rough estimate: 1 token ≈ 4 characters for English text
      estimateTokens: (text) => Math.ceil((text || '').length / 4)
    };
    
    // Predefined role-based system prompts to avoid repetition
    this.systemPrompts = {
      ingestion: "INGEST RAW INPUT ONLY. NO ANALYSIS. EXTRACT STRUCTURE.",
      triage: "CLASSIFY INPUT TYPE. OUTPUT FORMAT: {type, confidence}.",
      summarization: "SUMMARIZE KEY FIELDS ONLY. USE STRUCTURED FORMAT.",
      risk: "SCORE DATA QUALITY. OUTPUT: {score, reasons}.",
      output: "FORMAT RESPONSE. FOLLOW SPEC. NO EXTRA TEXT."
    };
  }

  /**
   * Create optimized prompt with minimal context
   */
  createOptimizedPrompt(role, content, options = {}) {
    const {
      maxContextLength = 2000,
      includeHistory = false,
      historySummary = null,
      customInstructions = ""
    } = options;

    // Get base system prompt for role
    let systemPrompt = this.systemPrompts[role] || "PROCESS REQUEST. FOLLOW INSTRUCTIONS.";

    // Add custom instructions if provided
    if (customInstructions) {
      systemPrompt += ` ${customInstructions}`;
    }

    // Prepare content with length control
    let processedContent = this.truncateToTokenLimit(content, maxContextLength);

    // If including history, summarize it instead of including full text
    let fullPrompt = '';
    if (includeHistory && historySummary) {
      fullPrompt = `PREVIOUS CONTEXT: ${historySummary}\n\nCURRENT TASK: ${processedContent}`;
    } else {
      fullPrompt = processedContent;
    }

    return {
      system: systemPrompt,
      user: fullPrompt,
      estimatedTokens: this.tokenEstimator.estimateTokens(systemPrompt) + 
                       this.tokenEstimator.estimateTokens(fullPrompt)
    };
  }

  /**
   * Truncate content to fit token budget
   */
  truncateToTokenLimit(content, maxChars = 2000) {
    if (!content || typeof content !== 'string') return content || '';

    if (content.length <= maxChars) {
      return content;
    }

    // Try to truncate at sentence boundary if possible
    const sentences = content.split(/(?<=[.!?])\s+/);
    let accumulated = '';
    
    for (const sentence of sentences) {
      if ((accumulated + sentence).length > maxChars - 50) { // Leave buffer
        break;
      }
      accumulated += sentence + ' ';
    }

    if (accumulated) {
      return accumulated.trim() + ' [CONTENT TRUNCATED]';
    }

    // If no good sentence boundary, hard truncate
    return content.substring(0, maxChars - 17) + ' [CONTENT TRUNCATED]';
  }

  /**
   * Compress data structures to essential fields only
   */
  compressDataStructure(data, role) {
    if (!data) return data;

    switch (role) {
      case 'ingestion':
        // Keep only essential fields
        return {
          content: data.content?.substring(0, 1000), // Limit content size
          type: data.type,
          metadata: {
            source: data.metadata?.source,
            timestamp: data.metadata?.timestamp
          }
        };

      case 'triage':
        // Focus on classification-relevant data
        return {
          content: data.content?.substring(0, 500),
          keywords: data.keywords?.slice(0, 10), // Limit keyword list
          source: data.source
        };

      case 'summarization':
        // Keep only fields that need summarization
        return {
          content: data.content?.substring(0, 1500),
          fields: data.fields?.slice(0, 5), // Limit fields to process
          format: data.format
        };

      case 'risk':
        // Focus on quality indicators
        return {
          completeness: data.completeness,
          format_valid: data.format_valid,
          required_fields: data.required_fields?.slice(0, 10)
        };

      default:
        // For other roles, remove large nested objects
        return this.removeLargeFields(data);
    }
  }

  /**
   * Remove large fields that are likely to consume many tokens
   */
  removeLargeFields(obj, sizeThreshold = 500) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 10).map(item => this.removeLargeFields(item, sizeThreshold));
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > sizeThreshold) {
        // Truncate long strings
        result[key] = value.substring(0, sizeThreshold) + ' [TRUNCATED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = this.removeLargeFields(value, sizeThreshold);
      } else {
        // Keep primitive values or small strings
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Generate a summary of conversation history to reduce token usage
   */
  generateHistorySummary(history, maxLength = 300) {
    if (!history || !Array.isArray(history)) return null;

    // Extract key decisions and outcomes
    const summaryPoints = [];
    
    for (const item of history) {
      if (item.role && item.content) {
        let summary = '';
        if (item.role === 'system') {
          summary = `[SYS: ${item.content.substring(0, 100)}]`;
        } else if (item.role === 'assistant') {
          // Extract key outputs from assistant
          summary = `[RESP: ${item.content.substring(0, 100)}]`;
        } else {
          summary = `[INPUT: ${item.content.substring(0, 100)}]`;
        }
        
        summaryPoints.push(summary);
      }
    }

    const combined = summaryPoints.join(' ');
    return combined.length > maxLength 
      ? combined.substring(0, maxLength) + ' [HISTORY SUMMARIZED]' 
      : combined;
  }

  /**
   * Optimize a full conversation for token efficiency
   */
  optimizeConversation(conversation, role, options = {}) {
    const {
      maxTotalTokens = 4000,
      preserveRecentCount = 3
    } = options;

    if (!conversation || !Array.isArray(conversation)) {
      return conversation;
    }

    // Separate recent messages that should be preserved
    const recentMessages = conversation.slice(-preserveRecentCount);
    const earlierMessages = conversation.slice(0, -preserveRecentCount);

    // Generate summary of earlier messages instead of full content
    const summary = this.generateHistorySummary(earlierMessages);

    // Create new conversation with summary
    const optimizedConversation = [];

    if (summary) {
      optimizedConversation.push({
        role: 'system',
        content: `CONTEXT SUMMARY: ${summary}`
      });
    }

    // Add recent messages as-is
    optimizedConversation.push(...recentMessages);

    // Further compress if still over limit
    const totalEstimatedTokens = optimizedConversation.reduce(
      (sum, msg) => sum + this.tokenEstimator.estimateTokens(msg.content), 
      0
    );

    if (totalEstimatedTokens > maxTotalTokens) {
      // Truncate individual messages
      return optimizedConversation.map(msg => ({
        ...msg,
        content: this.truncateToTokenLimit(msg.content, Math.floor(maxTotalTokens / optimizedConversation.length))
      }));
    }

    return optimizedConversation;
  }
}

export default PromptOptimizer;
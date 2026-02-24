import { createProvider } from './providers/index.js';
import { ToolExecutor } from './tools/index.js';

export class CodingAgent {
  constructor(config = {}) {
    this.provider = createProvider(config.provider || 'ollama', config);
    this.executor = new ToolExecutor({
      workingDir: config.workingDir || process.cwd(),
      requiresApproval: config.requiresApproval ?? true,
      onQuestion: config.onQuestion
    });
    this.maxIterations = config.maxIterations || 20;
    this.conversationHistory = [];
    this.onToolCall = config.onToolCall || null;
    this.onResponse = config.onResponse || null;
  }

  /**
   * Process a message and handle tool calls iteratively
   * @param {string} message - User message
   * @yields {object} - Response chunks and tool results
   */
  async *process(message) {
    this.conversationHistory.push({ role: 'user', content: message });
    
    let iteration = 0;
    
    while (iteration < this.maxIterations) {
      iteration++;
      
      // Get response from LLM
      let response = '';
      
      for await (const chunk of this.provider.chatWithHistory(this.conversationHistory)) {
        response += chunk;
        if (this.onResponse) {
          this.onResponse(chunk);
        }
        yield { type: 'chunk', content: chunk };
      }
      
      // Add response to history
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // Check for tool calls
      if (!this.executor.hasTools(response)) {
        // No tools, we're done
        yield { type: 'complete', content: response };
        return;
      }
      
      // Execute tools
      const toolResults = [];
      
      for await (const { tool, params, result } of this.executor.parseAndExecute(response)) {
        if (this.onToolCall) {
          this.onToolCall(tool, params, result);
        }
        
        yield { type: 'tool', tool, params, result };
        
        if (result.requiresApproval) {
          // Pause for approval
          yield { type: 'approval_required', tool, params };
          return;
        }
        
        if (result.requiresInput) {
          // Pause for user input
          yield { type: 'input_required', question: result.question };
          return;
        }
        
        toolResults.push({ tool, params, result });
      }
      
      // Add tool results to conversation
      const toolResultMessage = this.formatToolResults(toolResults);
      this.conversationHistory.push({ role: 'user', content: toolResultMessage });
    }
    
    yield { type: 'max_iterations', message: 'Maximum iterations reached' };
  }

  /**
   * Format tool results for the LLM
   */
  formatToolResults(results) {
    const parts = results.map(({ tool, params, result }) => {
      if (result.success) {
        return `Tool ${tool} executed successfully:\n${result.output || 'No output'}`;
      } else {
        return `Tool ${tool} failed: ${result.error}`;
      }
    });
    
    return `Tool results:\n\n${parts.join('\n\n')}`;
  }

  /**
   * Continue after approval or input
   */
  async *continue(approved, input) {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    
    if (approved) {
      // Mark as approved and continue
      lastMessage.approved = true;
    } else if (input) {
      // Add user input and continue
      this.conversationHistory.push({ role: 'user', content: input });
    }
    
    // Continue processing
    yield* this.process('');
  }

  /**
   * Reset conversation history
   */
  reset() {
    this.conversationHistory = [];
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    return this.provider.isAvailable();
  }

  /**
   * List available models
   */
  async listModels() {
    return this.provider.listModels();
  }
}
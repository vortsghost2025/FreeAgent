import { fileURLToPath } from 'url';
import path from 'path';
console.log("Loaded local-agent-interface.js FROM:", fileURLToPath(import.meta.url));

/**
 * LOCAL AGENT INTERFACE - Self-Routing Federation
 *
 * Defines clean interfaces for local model endpoints
 * All agents share these schemas - no rewriting when swapping models
 */

export const AgentMessageSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    from: { type: 'string' }, // agent_id
    to: { type: 'string' }, // 'all' or specific agent_id
    content: { type: 'string' },
    metadata: { type: 'object' },
    timestamp: { type: 'string' }
  }
};

export const AgentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    content: { type: 'string' },
    metadata: { type: 'object' }
  }
};

export const AgentStateSchema = {
  type: 'object',
  properties: {
    agent_id: { type: 'string' },
    role: { type: 'string' },
    state: { type: 'object' },
    memory: { type: 'array' },
    last_updated: { type: 'string' }
  }
};

export const ToolCallSchema = {
  type: 'object',
  properties: {
    tool: { type: 'string' },
    parameters: { type: 'object' },
    result: { type: 'any' }
  }
};

export const MemoryEntrySchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    data: { type: 'any' },
    timestamp: { type: 'string' },
    agent_id: { type: 'string' }
  }
};

export const TaskRoutingSchema = {
  type: 'object',
  properties: {
    decision: { type: 'string' }, // 'local_model' or 'paid_fallback'
    cost: { type: 'number' },
    confidence: { type: 'number' },
    model_used: { type: 'string' }
  }
};

export const ProviderConfigSchema = {
  type: 'object',
  properties: {
    provider: { type: 'string' },
    model: { type: 'string' },
    endpoint: { type: 'string' },
    api_key: { type: 'string' },
    enabled: { type: 'boolean' }
  }
};

export const AgentRoles = {
  CODE_GENERATION: 'code_generation',
  DATA_ENGINEERING: 'data_engineering',
  CLINICAL_ANALYSIS: 'clinical_analysis',
  TESTING: 'testing',
  SECURITY: 'security',
  API_INTEGRATION: 'api_integration',
  DATABASE: 'database',
  DEVOPS: 'devops'
};

export const ToolNames = {
  READ_FILE: 'read_file',
  WRITE_FILE: 'write_file',
  SEARCH_FILES: 'search_files',
  EXECUTE_COMMAND: 'execute_command',
  ASK_FOLLOWUP: 'ask_followup_question'
};

/**
 * Local Model Endpoint
 * Interface for zero-cost local model providers
 */
export class LocalModelEndpoint {
  constructor() {
    this.model = null;
    this.enabled = true;
  }

  async generate(prompt, options = {}) {
    throw new Error('LocalModelEndpoint.generate() must be implemented');
  }

  async healthCheck() {
    throw new Error('LocalModelEndpoint.healthCheck() must be implemented');
  }

  getModelInfo() {
    return {
      model: this.model,
      enabled: this.enabled,
      type: 'local'
    };
  }
}

/**
 * Standard Agent
 * Base class for all specialized agents
 */
export class StandardAgent {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.description = config.description;
    this.model = config.model;
    this.tools = config.tools || [];
    this.memoryPath = config.memoryPath;
    this.state = {};
    this.memory = [];
    this.lastUpdated = null;
  }

  async init(memoryEngine) {
    const data = await memoryEngine.loadAgentMemory(this.memoryPath);
    this.state = data.state || {};
    this.memory = data.recent_messages || [];
    this.lastUpdated = data.last_updated || null;
    console.log(`[${this.name}] Initialized`);
  }

  async handleMessage(message, provider) {
    const prompt = this.buildPrompt(message);
    console.log(`[${this.name}] Processing message`);

    try {
      const response = await provider.generate({
        prompt,
        model: this.model
      });

      const agentResponse = {
        agent: this.name,
        content: response.text || response,
        timestamp: Date.now()
      };

      await this.storeMemory(message, agentResponse);
      return agentResponse;
    } catch (error) {
      console.error(`[${this.name}] Generation failed:`, error);
      return {
        agent: this.name,
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      };
    }
  }

  buildPrompt(message) {
    return (
      "Agent: " + this.name + "\n" +
      "Role: " + this.role + "\n" +
      "Description: " + this.description + "\n" +
      "User message: " + message.content + "\n" +
      "Respond as " + this.role + " agent."
    );
  }

  async handleToolCall(toolName, params) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return { error: "Tool not found: " + toolName };
    }
    return await tool.execute(params);
  }

  async updateState(newState, memoryEngine) {
    this.state = { ...this.state, ...newState };
    await memoryEngine.saveAgentState(this.memoryPath, this.state);
    console.log(`[${this.name}] State updated:`, newState);
  }

  async storeMemory(userMessage, agentResponse) {
    this.memory.push({
      user: userMessage.content,
      agent: agentResponse.content,
      timestamp: Date.now()
    });
  }
}

/**
 * Memory Store
 * Interface for persistent memory storage
 */
export class MemoryStore {
  async store(entry) {
    throw new Error('MemoryStore.store() must be implemented');
  }

  async query(query, options = {}) {
    throw new Error('MemoryStore.query() must be implemented');
  }

  async get(id) {
    throw new Error('MemoryStore.get() must be implemented');
  }

  async delete(id) {
    throw new Error('MemoryStore.delete() must be implemented');
  }

  async clear() {
    throw new Error('MemoryStore.clear() must be implemented');
  }
}

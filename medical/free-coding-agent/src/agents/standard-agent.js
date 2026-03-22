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

  async handleMessage(message, provider, options = {}) {
    const prompt = this.buildPrompt(message);
    console.log(`[${this.name}] Processing message`);

    // Use provided model from options, or fall back to agent's default model
    const modelToUse = options.model || this.model;
    console.log(`[${this.name}] Using model: ${modelToUse}`);

    try {
      const response = await provider.generate({
        prompt,
        model: modelToUse,
      });

      const agentResponse = {
        agent: this.name,
        content: response.text || response,
        timestamp: Date.now(),
      };

      await this.storeMemory(message, agentResponse);
      return agentResponse;
    } catch (error) {
      console.error(`[${this.name}] Generation failed:`, error);
      return {
        agent: this.name,
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
    }
  }

  buildPrompt(message) {
    // DEBUG: Log message type and value to diagnose undefined issue
    console.log(`[${this.name}] DEBUG buildPrompt - message type: ${typeof message}, value: ${JSON.stringify(message)}`);
    
    // Handle both string and object message formats
    // Also handle undefined/null and objects with content/text properties
    let messageContent;
    if (message === undefined || message === null) {
      messageContent = '[no message]';
      console.warn(`[${this.name}] WARNING: message is ${message}`);
    } else if (typeof message === 'string') {
      messageContent = message;
    } else if (message.content) {
      messageContent = message.content;
    } else if (message.text) {
      messageContent = message.text;
    } else {
      messageContent = JSON.stringify(message);
    }
    
    return (
      "Agent: " +
      this.name +
      "\n" +
      "Role: " +
      this.role +
      "\n" +
      "Description: " +
      this.description +
      "\n" +
      "User message: " +
      messageContent +
      "\n" +
      "IMPORTANT: Respond in natural language (plain English), NOT in JSON, code blocks, or structured formats. Just give a helpful, conversational response." +
      "\n" +
      "Respond as " +
      this.role +
      " agent."
    );
  }

  async handleToolCall(toolName, params) {
    const tool = this.tools.find((t) => t.name === toolName);
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
    // Handle both string and object message formats
    const userContent = typeof userMessage === 'string' ? userMessage : (userMessage?.content || String(userMessage));
    const agentContent = typeof agentResponse === 'string' ? agentResponse : (agentResponse?.content || String(agentResponse));
    
    this.memory.push({
      user: userContent,
      agent: agentContent,
      timestamp: Date.now(),
    });
  }
}

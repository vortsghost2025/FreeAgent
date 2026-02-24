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
        model: this.model,
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
      message.content +
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
    this.memory.push({
      user: userMessage.content,
      agent: agentResponse.content,
      timestamp: Date.now(),
    });
  }
}

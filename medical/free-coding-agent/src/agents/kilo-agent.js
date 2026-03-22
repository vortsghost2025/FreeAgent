/*
  File: kilo-agent.js
  Description: Kilo Master Agent - Orchestration and coordination agent
  Role: Master coordinator for the Claw Federation
*/

export class KiloAgent {
  constructor(config = {}) {
    this.name = 'kilo';
    this.role = 'master_orchestrator';
    this.description = 'Master orchestration agent for the Claw Federation';
    this.model = config.model || null;
    this.capabilities = [
      'agent_coordination',
      'system_orchestration', 
      'task_distribution',
      'performance_monitoring',
      'error_handling'
    ];
    this.config = {
      maxParallelTasks: config.maxParallelTasks || 10,
      timeout: config.timeout || 30000,
      autoRecovery: config.autoRecovery || true
    };
    this.state = {};
    this.memory = [];
    this.lastUpdated = null;
    this.memoryPath = 'kilo'; // Use standard agent memory location
  }

  async init(memoryEngine) {
    try {
      const data = await memoryEngine.loadAgentMemory(this.memoryPath);
      this.state = data.state || {};
      // Limit memory to prevent command line overflow
      this.memory = (data.recent_messages || []).slice(-10); // Only keep last 10 messages
      this.lastUpdated = data.last_updated || null;
      console.log(`[${this.name}] Initialized with ${this.memory.length} recent messages`);
    } catch (error) {
      console.log(`[${this.name}] Initialized with defaults`);
      this.state = {};
      this.memory = [];
      this.lastUpdated = new Date().toISOString();
    }
  }

  async handleMessage(message, provider, options = {}) {
    console.log(`[${this.name}] Processing message`);
    
    const prompt = `You are Kilo, the master orchestration agent. ${message}`;
    
    try {
      const response = await provider.generate(prompt, {
        model: options.model || this.model || 'llama3.1:8b',
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Update memory
      this.memory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      
      this.memory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });
      
      // Keep only recent memory
      if (this.memory.length > 50) {
        this.memory = this.memory.slice(-50);
      }
      
      this.lastUpdated = new Date().toISOString();
      
      return response;
      
    } catch (error) {
      console.error(`[${this.name}] Error processing message:`, error.message);
      return `Error: ${error.message}`;
    }
  }

  buildPrompt(message) {
    return `You are Kilo, the master orchestration agent for the Claw Federation. 

Context:
${this.description}

Capabilities:
${this.capabilities.join(', ')}

Task: ${message}

Provide a coordinated response.`;
  }

  async processTask(task) {
    console.log(`[KiloAgent] Processing task: ${task.id}`);
    
    // Coordinate with other agents
    const result = {
      agent: this.name,
      taskId: task.id,
      status: 'completed',
      result: `Task ${task.id} coordinated successfully`,
      timestamp: new Date().toISOString()
    };
    
    return result;
  }

  async coordinateAgents(agents, task) {
    console.log(`[KiloAgent] Coordinating ${agents.length} agents for task`);
    
    // Simple coordination logic
    const results = await Promise.all(
      agents.map(agent => agent.processTask(task))
    );
    
    return {
      coordinator: this.name,
      coordinatedAgents: agents.map(a => a.name),
      results: results,
      summary: `Coordinated ${agents.length} agents successfully`
    };
  }

  getStatus() {
    return {
      name: this.name,
      role: this.role,
      status: 'active',
      capabilities: this.capabilities,
      config: this.config
    };
  }
}

// Export singleton instance
export const kiloAgent = new KiloAgent();
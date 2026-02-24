/*
  File: simple-ensemble.js
  Description: Simple ensemble coordinator using StandardAgent class.
  Integrates: agent-registry, memory-engine, task-router, Ollama endpoint.
*/

import { loadAgents } from "./agent-registry.js";
import { MemoryEngine } from "./memory-engine.js";
import { TaskRouter } from "./task-router.js";
import { OllamaEndpoint } from "./providers/ollama-endpoint.js";

export class SimpleEnsemble {
  constructor(config = {}) {
    // Configuration
    this.config = {
      model: config.model || null,
      ollamaEndpoint: config.ollamaEndpoint || "http://localhost:11434/api/generate",
      memoryPath: config.memoryPath || "./free-coding-agent/memory"
    };

    // Initialize components
    this.memory = new MemoryEngine(this.config.memoryPath);

    // Load all 8 agents (async to detect model)
    this.agentsPromise = loadAgents();

    console.log(`[SimpleEnsemble] Initializing (will auto-detect model...)`);
  }

  /**
   * Initialize all agents with memory
   */
  async initialize() {
    console.log("[SimpleEnsemble] Loading agents...");

    // Wait for agents to load and get detected model
    this.agents = await this.agentsPromise;
    const detectedModel = Object.values(this.agents)[0]?.model || 'llama3.1:8b';
    console.log(`[SimpleEnsemble] Detected model: ${detectedModel}`);

    // Update config with detected model
    this.config.model = detectedModel;

    // Initialize provider with detected model
    this.provider = new OllamaEndpoint({
      endpoint: this.config.ollamaEndpoint,
      model: this.config.model
    });

    // Initialize task router
    this.router = new TaskRouter(this.agents, this.provider, this.memory);

    console.log(`[SimpleEnsemble] Initializing agents...`);

    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        await agent.init(this.memory);
        console.log(`  ✓ ${name}: ${agent.role}`);
      } catch (error) {
        console.error(`  ✗ ${name}: ${error.message}`);
      }
    }

    console.log("[SimpleEnsemble] All agents initialized");
  }

  /**
   * Execute task through selected agents
   */
  async execute(message, selectedAgents = []) {
    console.log(`[SimpleEnsemble] Executing: "${message.substring(0, 50)}..."`);

    const startTime = Date.now();

    try {
      const results = await this.router.route(message, selectedAgents);

      const executionTime = Date.now() - startTime;

      // Store results in memory
      const taskRecord = {
        task_id: `task-${Date.now()}`,
        input: message,
        output: results,
        agents_involved: selectedAgents.length || Object.keys(this.agents).length,
        execution_time_ms: executionTime,
        status: "completed",
        routing: {
          decision: selectedAgents.length ? "selected" : "all",
          selected_agent: selectedAgents.length ? selectedAgents.join(",") : "all",
          selected_subsystem: "simple_ensemble",
          estimated_cost: 0,
          actual_cost: 0,
          confidence: 0.9
        },
        created_at: new Date().toISOString(),
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        error: null
      };

      this.memory.append(`${this.config.memoryPath}/tasks/task-${Date.now()}.json`, taskRecord);

      console.log(`[SimpleEnsemble] Completed in ${executionTime}ms`);

      return {
        success: true,
        results,
        executionTime,
        agents: selectedAgents.length || Object.keys(this.agents).length
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Store error in memory
      const errorRecord = {
        task_id: `task-${Date.now()}`,
        input: message,
        output: null,
        agents_involved: selectedAgents.length || Object.keys(this.agents).length,
        execution_time_ms: executionTime,
        status: "failed",
        routing: {
          decision: selectedAgents.length ? "selected" : "all",
          selected_agent: selectedAgents.length ? selectedAgents.join(",") : "all",
          selected_subsystem: "simple_ensemble",
          estimated_cost: 0,
          actual_cost: 0,
          confidence: 0.9
        },
        created_at: new Date().toISOString(),
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        error: error.message
      };

      this.memory.append(`${this.config.memoryPath}/tasks/task-error-${Date.now()}.json`, errorRecord);

      console.error(`[SimpleEnsemble] Error: ${error.message}`);

      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Get agent status
   */
  getAgentStatus() {
    return Object.entries(this.agents).map(([name, agent]) => ({
      name: agent.name,
      role: agent.role,
      state: agent.state,
      memory: agent.memoryPath
    }));
  }

  /**
   * Get all available agent names
   */
  getAvailableAgents() {
    return Object.keys(this.agents);
  }

  /**
   * Load agent memory
   */
  loadAgentMemory(agentName) {
    const agent = this.agents[agentName];
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    return this.memory.load(agent.memoryPath);
  }

  /**
   * Get ensemble metrics
   */
  getMetrics() {
    return {
      totalAgents: Object.keys(this.agents).length,
      agentNames: Object.keys(this.agents),
      agentStatus: this.getAgentStatus(),
      provider: this.config.model,
      memoryPath: this.config.memoryPath
    };
  }
}

// Create singleton instance
let ensembleInstance = null;

export function getEnsemble(config = {}) {
  if (!ensembleInstance) {
    ensembleInstance = new SimpleEnsemble(config);
  }
  return ensembleInstance;
}

export async function initEnsemble(config = {}) {
  const ensemble = getEnsemble(config);
  await ensemble.initialize();
  return ensemble;
}

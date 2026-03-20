/*
  File: task-router.js
  Description: Routes tasks to selected agents using local-first logic.
  Updated: Smart agent selection + model routing (deepseek-coder for code, llama for general).
*/

import { OllamaEndpoint } from './providers/ollama-endpoint.js';

// Model routing: code/debug/security use deepseek-coder-v2:16b, others use llama3.1:8b
// Gemini is used for high-precision reasoning tasks
const AGENT_MODEL_MAP = {
  code: 'deepseek-coder-v2:16b',      // Bigger model for code tasks
  debug: 'deepseek-coder-v2:16b',     // Bigger model for debugging
  security: 'deepseek-coder-v2:16b',  // Bigger model for security analysis
  test: 'deepseek-coder-v2:16b',      // Bigger model for test generation
  clinical: 'llama3.1:8b',            // Fast model for clinical tasks
  data: 'llama3.1:8b',                // Fast model for data tasks
  api: 'llama3.1:8b',                 // Fast model for API tasks
  db: 'llama3.1:8b',                  // Fast model for database tasks
  devops: 'llama3.1:8b',              // Fast model for devops tasks
  kilo: 'llama3.1:8b',                // Fast model for orchestration tasks
  reasoning: 'gemini-1.5-flash',       // NEW: Gemini for complex reasoning
  planning: 'gemini-1.5-flash',        // NEW: Gemini for task planning
  highPrecision: 'gemini-1.5-pro'     // NEW: Gemini Pro for high-precision tasks
};

export class TaskRouter {
  constructor(agents, provider, memory) {
    this.agents = agents;
    this.provider = provider;
    this.memory = memory;
    
    // Cache for model-specific providers
    this.providerCache = new Map();
    this.providerCache.set(provider.model, provider);
    
    // Agent capability keywords for smart routing
    this.agentKeywords = {
      code: ['code', 'function', 'class', 'module', 'debug', 'error', 'implement', 'refactor', 'api', 'script'],
      data: ['data', 'query', 'database', 'sql', 'csv', 'json', 'analyze', 'report', 'metrics', 'statistics'],
      clinical: ['patient', 'diagnosis', 'symptom', 'treatment', 'medical', 'clinical', 'health', 'medication', 'dosage'],
      test: ['test', 'spec', 'coverage', 'unit', 'integration', 'mock', 'assert', 'validate'],
      security: ['security', 'auth', 'token', 'encrypt', 'vulnerability', 'xss', 'injection', 'permission'],
      api: ['api', 'endpoint', 'rest', 'graphql', 'request', 'response', 'http', 'route', 'middleware'],
      db: ['database', 'schema', 'migration', 'table', 'index', 'query', 'transaction', 'orm'],
      devops: ['deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline', 'build', 'container', 'infrastructure'],
      kilo: ['kilo', 'master', 'orchestrate', 'coordinate', 'multi-agent', 'federation', 'system']
    };
  }

  /**
   * Get the appropriate provider for an agent based on model mapping
   */
  getProviderForAgent(agentName) {
    const model = AGENT_MODEL_MAP[agentName] || 'llama3.1:8b';
    
    // Check cache first
    if (this.providerCache.has(model)) {
      return this.providerCache.get(model);
    }
    
    // Create new provider for this model
    const newProvider = new OllamaEndpoint({
      endpoint: this.provider.endpoint || 'http://localhost:11434/api/generate',
      model: model
    });
    
    this.providerCache.set(model, newProvider);
    console.log(`[TaskRouter] Created new provider for model: ${model}`);
    
    return newProvider;
  }

  /**
   * Detect relevant agents based on message content
   * Returns 1-2 most relevant agent names
   */
  detectRelevantAgents(message) {
    const lowerMessage = message.toLowerCase();
    const scores = {};
    
    // Score each agent based on keyword matches
    for (const [agent, keywords] of Object.entries(this.agentKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          score += 1;
        }
      }
      if (score > 0) {
        scores[agent] = score;
      }
    }
    
    // Sort by score and take top 2
    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([agent]) => agent);
    
    // Default to 'code' agent if no matches
    return sorted.length > 0 ? sorted : ['code'];
  }

  async route(message, selectedAgents) {
    // Smart routing: use selected agents, or detect relevant ones
    const active = selectedAgents.length > 0
      ? selectedAgents
      : this.detectRelevantAgents(message);

    console.log(`[TaskRouter] Routing to ${active.length} agent(s): ${active.join(', ')}`);

    // Run agents in PARALLEL with model-specific providers
    const promises = active.map(async (name) => {
      const agent = this.agents[name];
      if (!agent) {
        console.warn(`[TaskRouter] Agent '${name}' not found, skipping`);
        return {
          agent: name,
          response: `Agent '${name}' not found`,
          timestamp: Date.now(),
          error: true
        };
      }
      
      try {
        const startTime = Date.now();
        
        // Get the right provider/model for this agent
        const provider = this.getProviderForAgent(name);
        const model = AGENT_MODEL_MAP[name] || 'llama3.1:8b';
        console.log(`[TaskRouter] Agent '${name}' using model: ${model}`);
        
        // Pass model in options so agent uses the correct model
        const response = await agent.handleMessage(message, provider, { model });
        const elapsed = Date.now() - startTime;
        console.log(`[TaskRouter] Agent '${name}' completed in ${elapsed}ms`);

        return {
          agent: name,
          response: response.content,
          model: model,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error(`[TaskRouter] Agent '${name}' failed:`, error.message);
        return {
          agent: name,
          response: `Error: ${error.message}`,
          timestamp: Date.now(),
          error: true
        };
      }
    });

    // Wait for all agents to complete in parallel
    const results = await Promise.all(promises);
    return results;
  }
}

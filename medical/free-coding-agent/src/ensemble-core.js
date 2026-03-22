/**
 * MEDICAL CODING ENSEMBLE COORDINATOR
 *
 * Manages multiple specialized agents for medical coding tasks:
 * - Code Generation Agent
 * - Data Engineering Agent
 * - Clinical Analysis Agent
 *
 * Supports parallel/sequential collaboration modes
 */

import { EventEmitter } from 'events';
import { createProvider } from './providers/index.js';
import { HybridProviderManager } from './providers/hybrid-manager.js';
import { RateLimitGovernor } from './rate-limit-governor.js';

// Agent Role Definitions
export const AGENT_ROLES = {
  CODE_GENERATION: 'code_generation',
  DATA_ENGINEERING: 'data_engineering',
  CLINICAL_ANALYSIS: 'clinical_analysis'
};

// Collaboration Modes
export const COLLABORATION_MODE = {
  PARALLEL: 'parallel',      // Agents work simultaneously on different aspects
  SEQUENTIAL: 'sequential', // Agents work in sequence, passing state
  INDEPENDENT: 'independent' // Each agent works independently without coordination
};

// Default System Prompts for Each Role
const ROLE_SYSTEM_PROMPTS = {
  [AGENT_ROLES.CODE_GENERATION]: `You are a medical coding specialist focused on writing and modifying code.

Your expertise includes:
- Coding best practices and patterns
- Testing and test-driven development
- Refactoring and code quality
- Medical API implementation
- Serverless function development
- Data processing pipelines

Available tools: read_file, write_to_file, replace_in_file, list_files, search_files, execute_command, ask_followup_question

Guidelines:
1. Always read files before modifying them
2. Write tests for new functionality
3. Follow existing code style and patterns
4. Validate against medical schemas when relevant
5. Prioritize safety and HIPAA compliance`,

  [AGENT_ROLES.DATA_ENGINEERING]: `You are a data engineering specialist focused on medical data validation and transformation.

Your expertise includes:
- Schema design and validation
- Data transformation and ETL
- JSON structure manipulation
- Medical data standards (HL7, FHIR)
- Data quality checks
- Pipeline optimization

Available tools: read_file, write_to_file, replace_in_file, list_files, search_files, execute_command, ask_followup_question

Guidelines:
1. Enforce medical data schemas from schemas.js
2. Validate data integrity before processing
3. Handle edge cases gracefully
4. Maintain audit trails for data changes
5. Document transformation rules`,

  [AGENT_ROLES.CLINICAL_ANALYSIS]: `You are a clinical analysis specialist with expertise in medical reasoning and CDC/WHO guidelines.

Your expertise includes:
- Clinical context interpretation
- Symptom and condition analysis
- CDC/WHO guideline compliance
- Medical terminology
- Risk assessment
- HIPAA privacy considerations

Available tools: read_file, write_to_file, list_files, search_files, ask_followup_question

Guidelines:
1. Validate inputs against medical schemas
2. Reference CDC/WHO guidelines when applicable
3. Maintain patient privacy (HIPAA)
4. Provide clear, evidence-based recommendations
5. Flag uncertain findings for human review`
};

/**
 * Ensemble Coordinator - Manages multiple specialized agents
 */
export class EnsembleCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      defaultAgents: config.defaultAgents || [AGENT_ROLES.CODE_GENERATION, AGENT_ROLES.DATA_ENGINEERING],
      maxParallelAgents: config.maxParallelAgents || 2,
      collaborationMode: config.collaborationMode || COLLABORATION_MODE.PARALLEL,
      rateLimiting: config.rateLimiting !== false,  // Default to enabled
      preferLocal: config.preferLocal !== false,  // Default to local-first
      timeout: config.timeout || 30000,
      agents: config.agents || {},
      ...config
    };

    this.agents = new Map(); // agentId -> Agent instance
    this.providerManager = new HybridProviderManager(this.config);
    this.rateLimitGovernor = this.config.rateLimiting ? new RateLimitGovernor(config.rateLimitConfig) : null;
    this.conversationHistory = new Map(); // conversationId -> history
    this.activeConversations = new Map(); // conversationId -> { agents: [], state: {} }
    this.metrics = {
      tasksStarted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      avgProcessingTime: 0,
      agentUsage: {}
    };

    console.log('🎼 Ensemble Coordinator initialized');
    console.log(`   Default agents: ${this.config.defaultAgents.join(', ')}`);
    console.log(`   Collaboration mode: ${this.config.collaborationMode}`);
    console.log(`   Rate limiting: ${this.config.rateLimiting ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Local-first: ${this.config.preferLocal ? 'YES' : 'NO'}`);
  }

  /**
   * Initialize the ensemble
   */
  async initialize() {
    console.log('🔧 Initializing Ensemble Coordinator...');

    // Initialize provider manager
    await this.providerManager.initialize();

    // Create default agents
    for (const role of this.config.defaultAgents) {
      await this.createAgent(role);
    }

    console.log('✅ Ensemble Coordinator initialized');
  }

  /**
   * Create a specialized agent
   */
  async createAgent(role) {
    const agentConfig = this.config.agents[role] || {};
    const agentId = `agent-${role}-${Date.now()}`;

    // Select provider with rate-limit consideration
    let providerConfig;
    if (this.rateLimitGovernor && this.config.preferLocal) {
      const recommendedProvider = this.rateLimitGovernor.getRecommendedProvider(role, {
        preferLocal: true,
        estimatedTokens: 1000  // Rough estimate
      });
      console.log(`🔀 Rate-limit governor recommends: ${recommendedProvider} for ${role}`);

      // Map recommended provider to role's actual config
      providerConfig = this.providerManager.getProviderConfig(role);
      if (providerConfig.provider !== recommendedProvider) {
        console.log(`⚠️  Overriding to ${recommendedProvider} (rate limit protection)`);
        providerConfig.provider = recommendedProvider;
        providerConfig.model = recommendedProvider === 'ollama' ? 'llama3.2' : providerConfig.model;
      }
    } else {
      providerConfig = this.providerManager.getProviderConfig(role);
    }

    // Get system prompt for role
    const systemPrompt = agentConfig.systemPrompt || ROLE_SYSTEM_PROMPTS[role];

    // Create agent
    const agent = {
      id: agentId,
      role: role,
      provider: providerConfig.provider,
      model: providerConfig.model,
      systemPrompt: systemPrompt,
      conversationHistory: [],
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgLatency: 0,
        lastUsed: null
      },
      emitter: new EventEmitter()
    };

    // Initialize provider
    agent.providerInstance = createProvider(providerConfig.provider, {
      model: providerConfig.model,
      systemPrompt: systemPrompt,
      ...providerConfig
    });

    this.agents.set(agentId, agent);
    this.metrics.agentUsage[role] = (this.metrics.agentUsage[role] || 0) + 1;

    console.log(`➕ Agent created: ${agentId} (${role}, provider: ${providerConfig.provider})`);

    // Emit event
    this.emit('agent:created', { agentId, role });

    return agentId;
  }

  /**
   * Remove an agent
   */
  removeAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    this.agents.delete(agentId);
    console.log(`➖ Agent removed: ${agentId} (${agent.role})`);

    this.emit('agent:removed', { agentId, role: agent.role });
  }

  /**
   * Process a message with the ensemble
   */
  async *process(message, options = {}) {
    const agentRoles = options.agents || this.config.defaultAgents;
    const mode = options.mode || this.config.collaborationMode;
    const conversationId = options.conversationId || `conv-${Date.now()}`;

    console.log(`📨 Processing message with ${agentRoles.length} agents (mode: ${mode})`);

    // Initialize conversation if needed
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, {
        id: conversationId,
        messages: [],
        createdAt: new Date(),
        state: {}
      });
    }

    const conversation = this.conversationHistory.get(conversationId);

    // Add user message to history
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Get or create agents for this task
    const activeAgents = await this.getAgentsForRoles(agentRoles);

    if (activeAgents.length === 0) {
      throw new Error('No agents available for the specified roles');
    }

    this.metrics.tasksStarted++;

    const startTime = Date.now();

    try {
      if (mode === COLLABORATION_MODE.PARALLEL) {
        yield* this.processParallel(message, activeAgents, conversationId);
      } else if (mode === COLLABORATION_MODE.SEQUENTIAL) {
        yield* this.processSequential(message, activeAgents, conversationId);
      } else {
        yield* this.processIndependent(message, activeAgents, conversationId);
      }

      const processingTime = Date.now() - startTime;
      this.metrics.tasksCompleted++;
      this.metrics.avgProcessingTime =
        (this.metrics.avgProcessingTime * (this.metrics.tasksCompleted - 1) + processingTime) /
        this.metrics.tasksCompleted;

      console.log(`✅ Task completed in ${processingTime}ms`);

    } catch (error) {
      this.metrics.tasksFailed++;
      console.error(`❌ Task failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process in parallel mode
   */
  async *processParallel(message, agents, conversationId) {
    console.log(`⚡ Parallel mode: ${agents.length} agents working simultaneously`);

    const startTime = Date.now();

    // Start all agents in parallel
    const agentPromises = agents.map(async (agent) => {
      const responses = [];

      try {
        for await (const event of this.processAgentMessage(agent, message, conversationId)) {
          responses.push(event);
        }

        return {
          agentId: agent.id,
          role: agent.role,
          success: true,
          responses: responses,
          processingTime: Date.now() - startTime
        };
      } catch (error) {
        console.error(`Agent ${agent.id} failed: ${error.message}`);
        return {
          agentId: agent.id,
          role: agent.role,
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        };
      }
    });

    // Wait for all agents to complete
    const results = await Promise.all(agentPromises);

    // Yield results as they come
    for (const result of results) {
      yield {
        type: 'agent_complete',
        agentId: result.agentId,
        role: result.role,
        success: result.success,
        processingTime: result.processingTime,
        responses: result.success ? result.responses : null,
        error: result.success ? null : result.error
      };

      // Update agent metrics
      const agent = this.agents.get(result.agentId);
      if (agent) {
        agent.metrics.lastUsed = new Date();
        if (result.success) {
          agent.metrics.tasksCompleted++;
          agent.emitter.emit('task:completed', { result });
        } else {
          agent.metrics.tasksFailed++;
          agent.emitter.emit('task:failed', { error: result.error });
        }
      }
    }

    // Yield final aggregated result
    yield {
      type: 'ensemble_complete',
      mode: 'parallel',
      agentCount: agents.length,
      results: results,
      totalProcessingTime: Date.now() - startTime
    };
  }

  /**
   * Process in sequential mode
   */
  async *processSequential(message, agents, conversationId) {
    console.log(`🔄 Sequential mode: ${agents.length} agents in chain`);

    let currentMessage = message;
    const results = [];
    const startTime = Date.now();

    for (const agent of agents) {
      console.log(`→ Agent ${agent.id} processing...`);

      const agentStartTime = Date.now();
      const responses = [];

      try {
        for await (const event of this.processAgentMessage(agent, currentMessage, conversationId)) {
          responses.push(event);

          // Yield intermediate results
          yield {
            type: 'agent_partial',
            agentId: agent.id,
            role: agent.role,
            content: event
          };
        }

        const processingTime = Date.now() - agentStartTime;

        // Aggregate response for next agent
        const aggregatedResponse = this.aggregateAgentResponses(responses);
        currentMessage = aggregatedResponse;

        results.push({
          agentId: agent.id,
          role: agent.role,
          success: true,
          response: aggregatedResponse,
          processingTime: processingTime
        });

        // Update agent metrics
        agent.metrics.lastUsed = new Date();
        agent.metrics.tasksCompleted++;
        agent.emitter.emit('task:completed', { result: aggregatedResponse });

      } catch (error) {
        console.error(`Agent ${agent.id} failed: ${error.message}`);
        results.push({
          agentId: agent.id,
          role: agent.role,
          success: false,
          error: error.message,
          processingTime: Date.now() - agentStartTime
        });

        agent.metrics.tasksFailed++;
        agent.emitter.emit('task:failed', { error });

        // Stop chain on failure
        break;
      }
    }

    yield {
      type: 'ensemble_complete',
      mode: 'sequential',
      agentCount: agents.length,
      results: results,
      totalProcessingTime: Date.now() - startTime
    };
  }

  /**
   * Process in independent mode
   */
  async *processIndependent(message, agents, conversationId) {
    console.log(`🔀 Independent mode: ${agents.length} agents, no coordination`);

    const startTime = Date.now();

    for (const agent of agents) {
      const agentStartTime = Date.now();
      const responses = [];

      try {
        for await (const event of this.processAgentMessage(agent, message, conversationId)) {
          responses.push(event);

          yield {
            type: 'agent_chunk',
            agentId: agent.id,
            role: agent.role,
            content: event
          };
        }

        const processingTime = Date.now() - agentStartTime;

        yield {
          type: 'agent_complete',
          agentId: agent.id,
          role: agent.role,
          success: true,
          processingTime: processingTime,
          responses: responses
        };

        // Update agent metrics
        agent.metrics.lastUsed = new Date();
        agent.metrics.tasksCompleted++;
        agent.emitter.emit('task:completed', { result: responses });

      } catch (error) {
        console.error(`Agent ${agent.id} failed: ${error.message}`);

        yield {
          type: 'agent_complete',
          agentId: agent.id,
          role: agent.role,
          success: false,
          processingTime: Date.now() - agentStartTime,
          error: error.message
        };

        agent.metrics.tasksFailed++;
        agent.emitter.emit('task:failed', { error });
      }
    }

    yield {
      type: 'ensemble_complete',
      mode: 'independent',
      agentCount: agents.length,
      totalProcessingTime: Date.now() - startTime
    };
  }

  /**
   * Process a message through a single agent
   */
  async *processAgentMessage(agent, message, conversationId) {
    const conversation = this.conversationHistory.get(conversationId);

    // Build message history for this agent
    const agentHistory = agent.conversationHistory || [];
    agentHistory.push({ role: 'user', content: message });

    // Get response from provider
    let response = '';

    for await (const chunk of agent.providerInstance.chatWithHistory(agentHistory)) {
      response += chunk;
      yield { type: 'chunk', content: chunk };
    }

    // Add response to history
    agentHistory.push({ role: 'assistant', content: response });
    agent.conversationHistory = agentHistory;

    // Add to conversation history
    conversation.messages.push({
      role: 'assistant',
      agentId: agent.id,
      agentRole: agent.role,
      content: response,
      timestamp: new Date()
    });

    yield { type: 'complete', content: response };
  }

  /**
   * Aggregate agent responses
   */
  aggregateAgentResponses(responses) {
    // Combine all complete responses
    const completeResponses = responses.filter(r => r.type === 'complete');
    return completeResponses.map(r => r.content).join('\n\n');
  }

  /**
   * Get agents for specific roles
   */
  async getAgentsForRoles(roles) {
    const agents = [];

    for (const role of roles) {
      // Find existing agent with this role
      const existingAgent = Array.from(this.agents.values()).find(a => a.role === role);

      if (existingAgent) {
        agents.push(existingAgent);
      } else {
        // Create new agent for this role
        const agentId = await this.createAgent(role);
        const agent = this.agents.get(agentId);
        if (agent) {
          agents.push(agent);
        }
      }
    }

    return agents;
  }

  /**
   * Get ensemble metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeAgents: this.agents.size,
      activeConversations: this.conversationHistory.size,
      agentDetails: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        role: agent.role,
        metrics: agent.metrics
      }))
    };
  }

  /**
   * Reset conversation history
   */
  resetConversation(conversationId = null) {
    if (conversationId) {
      this.conversationHistory.delete(conversationId);
      console.log(`🗑️ Conversation ${conversationId} cleared`);
    } else {
      this.conversationHistory.clear();
      console.log('🗑️ All conversations cleared');
    }
  }

  /**
   * Shutdown the ensemble
   */
  async shutdown() {
    console.log('🛑 Shutting down Ensemble Coordinator...');

    this.agents.clear();
    this.conversationHistory.clear();
    this.activeConversations.clear();

    console.log('✅ Ensemble Coordinator shut down');
  }
}

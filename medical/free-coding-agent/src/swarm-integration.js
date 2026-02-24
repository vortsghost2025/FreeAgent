/**
 * SWARM COORDINATOR INTEGRATION
 *
 * Bridges the ensemble with the existing SwarmCoordinator:
 * - Register ensemble agents with coordinator
 * - Map ensemble tasks to swarm tasks
 * - Handle swarm events (workload changes, rebalancing)
 *
 * This integrates the medical coding ensemble with the broader
 * WE4Free distributed agent swarm.
 */

import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensemble Swarm Adapter
 *
 * Adapts ensemble agents to work with SwarmCoordinator
 */
export class EnsembleSwarmAdapter extends EventEmitter {
  constructor(ensembleCoordinator, swarmCoordinator, config = {}) {
    super();

    this.ensemble = ensembleCoordinator;
    this.swarm = swarmCoordinator;
    this.config = {
      coordinatorId: config.coordinatorId || 'medical-ensemble',
      loadBalancingStrategy: config.loadBalancingStrategy || 'least_loaded',
      ...config
    };

    this.registeredAgents = new Map(); // ensembleAgentId -> swarmAgentId
    this.taskMappings = new Map(); // swarmTaskId -> ensembleTaskId

    this._setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  _setupEventHandlers() {
    // Listen to ensemble events
    this.ensemble.on('agent:created', (data) => {
      this._registerAgentWithSwarm(data.agentId);
    });

    this.ensemble.on('agent:removed', (data) => {
      this._unregisterAgentFromSwarm(data.agentId);
    });

    // Listen to swarm events
    if (this.swarm) {
      this.swarm.on('task:assigned', (data) => {
        this._handleTaskAssigned(data);
      });

      this.swarm.on('workload:changed', (data) => {
        this._handleWorkloadChanged(data);
      });
    }
  }

  /**
   * Initialize adapter
   */
  async initialize() {
    console.log('🔧 Initializing Ensemble Swarm Adapter...');

    // Register existing ensemble agents
    for (const agentId of this.ensemble.agents.keys()) {
      this._registerAgentWithSwarm(agentId);
    }

    console.log('✅ Ensemble Swarm Adapter initialized');
  }

  /**
   * Register agent with swarm
   */
  _registerAgentWithSwarm(ensembleAgentId) {
    const agent = this.ensemble.agents.get(ensembleAgentId);

    if (!agent) {
      console.warn(`⚠️  Agent not found: ${ensembleAgentId}`);
      return;
    }

    // Create swarm-compatible agent interface
    const swarmAgent = {
      id: `ensemble-${ensembleAgentId}`,
      role: this._mapRoleToSwarmRole(agent.role),
      state: 'idle',
      workload: 0,
      metrics: agent.metrics,
      peers: new Set(),

      // Required swarm methods
      executeTask: async (task) => {
        return this._executeSwarmTask(task, ensembleAgentId);
      },

      updateWorkload: (newWorkload) => {
        agent.emitter.emit('workload:changed', { workload: newWorkload });
      },

      hasCapability: (capability) => {
        return capability === 'PERFORM_TASKS';
      },

      on: (event, callback) => {
        agent.emitter.on(event, callback);
      },

      emit: (event, data) => {
        agent.emitter.emit(event, data);
      },

      // Lifecycle
      shutdown: async () => {
        agent.emitter.emit('shutdown');
      }
    };

    // Register with swarm coordinator
    if (this.swarm) {
      this.swarm.registerAgent(swarmAgent);
      this.registeredAgents.set(ensembleAgentId, swarmAgent.id);

      console.log(`✓ Registered agent ${ensembleAgentId} with swarm as ${swarmAgent.id}`);
    }
  }

  /**
   * Unregister agent from swarm
   */
  _unregisterAgentFromSwarm(ensembleAgentId) {
    const swarmAgentId = this.registeredAgents.get(ensembleAgentId);

    if (!swarmAgentId) {
      return;
    }

    if (this.swarm) {
      this.swarm.unregisterAgent(swarmAgentId);
      this.registeredAgents.delete(ensembleAgentId);

      console.log(`✓ Unregistered agent ${ensembleAgentId} from swarm`);
    }
  }

  /**
   * Map ensemble role to swarm role
   */
  _mapRoleToSwarmRole(role) {
    const roleMap = {
      'code_generation': 'worker',
      'data_engineering': 'worker',
      'clinical_analysis': 'worker'
    };

    return roleMap[role] || 'worker';
  }

  /**
   * Execute swarm task through ensemble
   */
  async _executeSwarmTask(swarmTask, ensembleAgentId) {
    const agent = this.ensemble.agents.get(ensembleAgentId);

    if (!agent) {
      throw new Error(`Agent not found: ${ensembleAgentId}`);
    }

    console.log(`📌 Swarm task assigned to ensemble agent ${ensembleAgentId}:`, swarmTask.id);

    // Map swarm task to ensemble task format
    const ensembleTask = this._mapSwarmTaskToEnsemble(swarmTask);

    // Track task mapping
    this.taskMappings.set(swarmTask.id, ensembleTask.id);

    try {
      // Execute through ensemble
      const results = [];
      for await (const event of this.ensemble.process(ensembleTask.message, {
        agents: [agent.role],
        mode: 'independent'
      })) {
        results.push(event);
      }

      // Extract final result
      const finalResult = results.find(r => r.type === 'agent_complete');

      // Update agent metrics
      agent.metrics.tasksCompleted++;
      agent.emitter.emit('task:completed', { result: finalResult });

      // Return result to swarm
      return {
        success: true,
        result: finalResult,
        processingTime: Date.now() - swarmTask.startTime
      };
    } catch (error) {
      console.error(`❌ Ensemble task failed:`, error);

      agent.metrics.tasksFailed++;
      agent.emitter.emit('task:failed', { error });

      throw error;
    }
  }

  /**
   * Map swarm task to ensemble format
   */
  _mapSwarmTaskToEnsemble(swarmTask) {
    return {
      id: `ensemble-task-${Date.now()}`,
      type: swarmTask.type || 'general',
      message: swarmTask.data?.message || swarmTask.description || swarmTask.data?.input || '',
      context: swarmTask.data,
      priority: swarmTask.priority || 10
    };
  }

  /**
   * Handle swarm task assignment
   */
  _handleTaskAssigned(data) {
    const { task, agent } = data;

    // Check if this is a task for our ensemble
    if (!agent.id.startsWith('ensemble-')) {
      return;
    }

    console.log(`📋 Swarm task assigned to ensemble: ${task.id}`);
  }

  /**
   * Handle swarm workload changes
   */
  _handleWorkloadChanged(data) {
    // Propagate workload changes to ensemble
    this.ensemble.emit('workload:changed', data);
  }

  /**
   * Register ensemble with swarm
   */
  registerWithSwarm() {
    if (!this.swarm) {
      console.warn('⚠️  Swarm coordinator not available');
      return false;
    }

    console.log(`🔗 Registering ensemble with swarm coordinator...`);

    // Register all ensemble agents
    for (const agentId of this.ensemble.agents.keys()) {
      this._registerAgentWithSwarm(agentId);
    }

    console.log('✅ Ensemble registered with swarm');

    return true;
  }

  /**
   * Unregister ensemble from swarm
   */
  unregisterFromSwarm() {
    console.log('🔌 Unregistering ensemble from swarm...');

    // Unregister all ensemble agents
    for (const ensembleAgentId of this.registeredAgents.keys()) {
      this._unregisterAgentFromSwarm(ensembleAgentId);
    }

    console.log('✅ Ensemble unregistered from swarm');
  }

  /**
   * Get swarm metrics
   */
  getSwarmMetrics() {
    if (!this.swarm) {
      return null;
    }

    return this.swarm.getSwarmMetrics();
  }

  /**
   * Get ensemble metrics from swarm perspective
   */
  getEnsembleSwarmMetrics() {
    const ensembleAgents = Array.from(this.registeredAgents.entries()).map(([ensembleId, swarmId]) => {
      const ensembleAgent = this.ensemble.agents.get(ensembleId);
      return {
        ensembleId,
        swarmId,
        role: ensembleAgent.role,
        metrics: ensembleAgent.metrics
      };
    });

    return {
      totalAgents: ensembleAgents.length,
      agents: ensembleAgents,
      taskMappings: Array.from(this.taskMappings.entries())
    };
  }

  /**
   * Rebalance ensemble workload
   */
  rebalanceWorkload() {
    if (!this.swarm) {
      return;
    }

    console.log('⚖️ Rebalancing ensemble workload...');

    // Trigger swarm rebalance
    this.swarm.rebalanceWork();

    // Emit to ensemble
    this.ensemble.emit('rebalance:requested');
  }

  /**
   * Assign task to ensemble via swarm
   */
  async assignTask(task) {
    if (!this.swarm) {
      // Execute directly through ensemble
      const results = [];
      for await (const event of this.ensemble.process(task.message, {
        agents: task.agents,
        mode: task.mode || 'parallel'
      })) {
        results.push(event);
      }
      return results;
    }

    // Assign through swarm
    return this.swarm.assignTask(task);
  }

  /**
   * Optimize ensemble in swarm context
   */
  optimize() {
    if (!this.swarm) {
      console.log('⚠️  Swarm coordinator not available, optimizing ensemble locally...');
      return;
    }

    console.log('🔧 Optimizing ensemble in swarm context...');

    // Trigger swarm optimization
    this.swarm.optimize();

    // Emit to ensemble
    this.ensemble.emit('optimize:requested');
  }

  /**
   * Get agent status from swarm
   */
  getAgentStatus() {
    if (!this.swarm) {
      return Array.from(this.ensemble.agents.values()).map(agent => ({
        id: agent.id,
        role: agent.role,
        metrics: agent.metrics
      }));
    }

    const swarmStatus = this.swarm.getAgentStatus();

    // Filter to only ensemble agents
    return swarmStatus.filter(agent =>
      agent.id.startsWith('ensemble-') || Array.from(this.registeredAgents.values()).includes(agent.id)
    );
  }

  /**
   * Get combined metrics
   */
  getCombinedMetrics() {
    const ensembleMetrics = this.ensemble.getMetrics();
    const swarmMetrics = this.getSwarmMetrics();
    const ensembleSwarmMetrics = this.getEnsembleSwarmMetrics();

    return {
      ensemble: ensembleMetrics,
      swarm: swarmMetrics,
      integration: ensembleSwarmMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown adapter
   */
  async shutdown() {
    console.log('🛑 Shutting down Ensemble Swarm Adapter...');

    // Unregister from swarm
    this.unregisterFromSwarm();

    // Clear mappings
    this.registeredAgents.clear();
    this.taskMappings.clear();

    console.log('✅ Ensemble Swarm Adapter shut down');
  }
}

/**
 * Create ensemble with swarm integration
 */
export async function createEnsembleWithSwarm(ensembleConfig = {}, swarmConfig = {}) {
  // This would typically import SwarmCoordinator from the main codebase
  // For now, we assume it's available globally or passed in

  const { EnsembleCoordinator } = await import('./ensemble-core.js');

  // Create ensemble
  const ensemble = new EnsembleCoordinator(ensembleConfig);
  await ensemble.initialize();

  // Get or create swarm coordinator
  let swarm = swarmConfig.swarm;

  if (!swarm && typeof window !== 'undefined' && window.SwarmCoordinator) {
    swarm = new window.SwarmCoordinator(swarmConfig.coordinatorId || 'medical-ensemble');
  }

  // Create adapter
  const adapter = new EnsembleSwarmAdapter(ensemble, swarm, {
    coordinatorId: swarmConfig.coordinatorId,
    loadBalancingStrategy: swarmConfig.loadBalancingStrategy
  });

  await adapter.initialize();
  adapter.registerWithSwarm();

  return {
    ensemble,
    swarm,
    adapter
  };
}

/**
 * Create simple ensemble without swarm
 */
export async function createSimpleEnsemble(config = {}) {
  const { EnsembleCoordinator } = await import('./ensemble-core.js');

  const ensemble = new EnsembleCoordinator(config);
  await ensemble.initialize();

  return ensemble;
}

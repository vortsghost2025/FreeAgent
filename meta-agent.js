/**
 * WE4Free Meta-Agent
 * 
 * The Brain of the Swarm.
 * 
 * Responsibilities:
 * - Observes entire mesh
 * - Spawns new agents when needed
 * - Retires idle agents
 * - Tunes system parameters
 * - Optimizes message routing
 * - Detects anomalies
 * - Maintains global state
 * - Makes autonomous decisions
 * 
 * This is the crown jewel of Track 4: Distributed Agent Swarm Layer
 */

// META-AGENT DECISIONS
const Decision = {
  SPAWN_AGENT: 'spawn_agent',
  RETIRE_AGENT: 'retire_agent',
  REBALANCE_LOAD: 'rebalance_load',
  TUNE_PARAMETER: 'tune_parameter',
  OPTIMIZE_ROUTE: 'optimize_route',
  HEAL_PEER: 'heal_peer',
  SCALE_UP: 'scale_up',
  SCALE_DOWN: 'scale_down'
};

// META-AGENT
class MetaAgent {
  constructor(metaId = 'meta-0') {
    this.metaId = metaId;
    this.agentFactory = null; // AgentFactory instance
    this.swarmCoordinator = null; // SwarmCoordinator instance
    this.healthMonitor = null; // SelfHealingMonitor instance
    this.gossipState = null; // GossipState instance
    this.taskQueue = null; // TaskQueue instance

    this.decisions = [];
    this.decisionHistory = [];
    this.autonomousMode = false;
    this.observationInterval = null;

    this.thresholds = {
      minAgents: 2,
      maxAgents: 20,
      targetWorkload: 70, // %
      maxWorkload: 85, // %
      minWorkload: 20, // %
      idleTimeout: 60000, // 1 minute
      scaleUpThreshold: 80, // %
      scaleDownThreshold: 30 // %
    };

    this.metrics = {
      decisionsMade: 0,
      agentsSpawned: 0,
      agentsRetired: 0,
      parametersTuned: 0,
      anomaliesDetected: 0,
      interventions: 0
    };

    console.log(`🧠 Meta-Agent initialized: ${this.metaId}`);
  }

  /**
   * Initialize meta-agent with dependencies
   */
  initialize(options = {}) {
    this.agentFactory = options.agentFactory;
    this.swarmCoordinator = options.swarmCoordinator;
    this.healthMonitor = options.healthMonitor;
    this.gossipState = options.gossipState;
    this.taskQueue = options.taskQueue;

    if (options.thresholds) {
      this.thresholds = { ...this.thresholds, ...options.thresholds };
    }

    console.log('✅ Meta-Agent initialized with dependencies');
  }

  /**
   * Start autonomous operation
   */
  startAutonomousMode(intervalMs = 5000) {
    if (this.autonomousMode) {
      console.warn('Meta-Agent already in autonomous mode');
      return;
    }

    this.autonomousMode = true;

    this.observationInterval = setInterval(() => {
      this._observe();
      this._analyze();
      this._decide();
      this._act();
    }, intervalMs);

    console.log(`🤖 Meta-Agent autonomous mode started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop autonomous operation
   */
  stopAutonomousMode() {
    if (this.observationInterval) {
      clearInterval(this.observationInterval);
      this.observationInterval = null;
    }

    this.autonomousMode = false;
    console.log('🛑 Meta-Agent autonomous mode stopped');
  }

  /**
   * Observe the swarm
   */
  _observe() {
    const observation = {
      timestamp: Date.now(),
      swarm: this.swarmCoordinator ? this.swarmCoordinator.getSwarmMetrics() : null,
      agents: this.swarmCoordinator ? this.swarmCoordinator.getAgentStatus() : [],
      health: this.healthMonitor ? this.healthMonitor.getSummary() : null,
      tasks: this.taskQueue ? this.taskQueue.getStatus() : null,
      gossip: this.gossipState ? this.gossipState.getMetrics() : null
    };

    return observation;
  }

  /**
   * Analyze observations
   */
  _analyze() {
    const obs = this._observe();

    if (!obs.swarm || !obs.agents) {
      return;
    }

    const issues = [];

    // Check for overloaded agents
    const overloaded = obs.agents.filter(a => a.workload > this.thresholds.maxWorkload);
    if (overloaded.length > 0) {
      issues.push({
        type: 'overload',
        severity: 'high',
        agents: overloaded.map(a => a.id),
        action: Decision.SCALE_UP
      });
    }

    // Check for underutilized swarm
    const avgWorkload = obs.agents.reduce((sum, a) => sum + a.workload, 0) / obs.agents.length;
    if (avgWorkload < this.thresholds.minWorkload && obs.agents.length > this.thresholds.minAgents) {
      issues.push({
        type: 'underutilized',
        severity: 'low',
        avgWorkload,
        action: Decision.SCALE_DOWN
      });
    }

    // Check for idle agents
    const idle = obs.agents.filter(a => a.state === 'idle' && a.workload < 10);
    if (idle.length > 2) {
      issues.push({
        type: 'excess_idle',
        severity: 'low',
        agents: idle.map(a => a.id),
        action: Decision.RETIRE_AGENT
      });
    }

    // Check for degraded peers
    if (obs.health && obs.health.degraded > 0) {
      issues.push({
        type: 'degraded_peers',
        severity: 'medium',
        count: obs.health.degraded,
        action: Decision.HEAL_PEER
      });
    }

    // Check for failed peers
    if (obs.health && obs.health.failed > 0) {
      issues.push({
        type: 'failed_peers',
        severity: 'critical',
        count: obs.health.failed,
        action: Decision.HEAL_PEER
      });
    }

    // Check task queue backlog
    if (obs.tasks && obs.tasks.pending > 10) {
      issues.push({
        type: 'task_backlog',
        severity: 'high',
        pending: obs.tasks.pending,
        action: Decision.SPAWN_AGENT
      });
    }

    return issues;
  }

  /**
   * Make decisions based on analysis
   */
  _decide() {
    const issues = this._analyze();

    if (!issues || issues.length === 0) {
      return;
    }

    // Prioritize by severity
    const priority = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    issues.sort((a, b) => priority[b.severity] - priority[a.severity]);

    // Make decisions
    issues.forEach(issue => {
      const decision = {
        timestamp: Date.now(),
        issue,
        action: issue.action,
        status: 'pending'
      };

      this.decisions.push(decision);
      this.metrics.decisionsMade++;
    });

    if (this.decisions.length > 0) {
      console.log(`🧠 Meta-Agent made ${this.decisions.length} decisions`);
    }
  }

  /**
   * Act on decisions
   */
  _act() {
    if (this.decisions.length === 0) {
      return;
    }

    const decision = this.decisions.shift();

    try {
      switch (decision.action) {
        case Decision.SPAWN_AGENT:
          this._spawnAgent(decision);
          break;

        case Decision.RETIRE_AGENT:
          this._retireAgent(decision);
          break;

        case Decision.SCALE_UP:
          this._scaleUp(decision);
          break;

        case Decision.SCALE_DOWN:
          this._scaleDown(decision);
          break;

        case Decision.REBALANCE_LOAD:
          this._rebalanceLoad(decision);
          break;

        case Decision.HEAL_PEER:
          this._healPeer(decision);
          break;

        case Decision.TUNE_PARAMETER:
          this._tuneParameter(decision);
          break;

        default:
          console.warn(`Unknown action: ${decision.action}`);
      }

      decision.status = 'completed';
      this.decisionHistory.push(decision);
      this.metrics.interventions++;

    } catch (error) {
      console.error(`Failed to execute decision:`, error);
      decision.status = 'failed';
      decision.error = error.message;
      this.decisionHistory.push(decision);
    }

    // Keep last 100 decisions
    if (this.decisionHistory.length > 100) {
      this.decisionHistory.shift();
    }
  }

  /**
   * Spawn a new agent
   */
  _spawnAgent(decision) {
    if (!this.agentFactory || !this.swarmCoordinator) {
      return;
    }

    const obs = this._observe();
    if (obs.agents.length >= this.thresholds.maxAgents) {
      console.warn('⚠️ Max agents reached, cannot spawn more');
      return;
    }

    // Determine role needed (default to worker)
    const role = decision.role || window.AgentRole?.WORKER || 'worker';

    const agent = this.agentFactory.spawn(role);
    this.swarmCoordinator.registerAgent(agent);

    this.metrics.agentsSpawned++;
    console.log(`✨ Meta-Agent spawned ${agent.id} (${role})`);
  }

  /**
   * Retire an agent
   */
  _retireAgent(decision) {
    if (!this.agentFactory || !this.swarmCoordinator) {
      return;
    }

    const obs = this._observe();

    // PROTECTION 1: Never retire if there are pending tasks
    if (this.taskQueue) {
      const queueStatus = this.taskQueue.getStatus();
      if (queueStatus && queueStatus.pending > 0) {
        console.warn('⚠️ Retirement blocked: pending tasks in queue (' + queueStatus.pending + ')');
        return;
      }
    }

    // PROTECTION 2: Always maintain minimum 4 worker agents
    const workerCount = obs.agents.filter(a => a.role === 'worker').length;
    if (workerCount <= 4) {
      console.warn('⚠️ Retirement blocked: minimum 4 workers required (current: ' + workerCount + ')');
      return;
    }

    if (obs.agents.length <= this.thresholds.minAgents) {
      console.warn('⚠️ Min agents reached, cannot retire more');
      return;
    }

    // Find most idle agent (prefer non-workers first to preserve workers)
    const idle = obs.agents
      .filter(a => a.state === 'idle' && a.workload < 10)
      .sort((a, b) => {
        // Prefer retiring non-workers over workers
        if (a.role === 'worker' && b.role !== 'worker') return 1;
        if (a.role !== 'worker' && b.role === 'worker') return -1;
        return a.workload - b.workload;
      });

    if (idle.length === 0) {
      return;
    }

    const agentId = idle[0].id;
    const agent = this.agentFactory.getAgent(agentId);

    if (agent) {
      agent.shutdown();
      this.swarmCoordinator.unregisterAgent(agentId);
      this.metrics.agentsRetired++;
      console.log(`🛑 Meta-Agent retired ${agentId}`);
    }
  }

  /**
   * Scale up (spawn multiple agents)
   */
  _scaleUp(decision) {
    const count = decision.count || 2;

    for (let i = 0; i < count; i++) {
      this._spawnAgent(decision);
    }

    console.log(`📈 Meta-Agent scaled up by ${count} agents`);
  }

  /**
   * Scale down (retire multiple agents)
   */
  _scaleDown(decision) {
    const count = decision.count || 1;

    for (let i = 0; i < count; i++) {
      this._retireAgent(decision);
    }

    console.log(`📉 Meta-Agent scaled down by ${count} agents`);
  }

  /**
   * Rebalance load
   */
  _rebalanceLoad(decision) {
    if (this.swarmCoordinator) {
      this.swarmCoordinator.rebalanceWork();
      console.log('⚖️ Meta-Agent triggered load rebalance');
    }
  }

  /**
   * Heal degraded peer
   */
  _healPeer(decision) {
    if (this.healthMonitor) {
      const obs = this._observe();
      const degraded = obs.health.peers.filter(p => p.status === 'degraded' || p.status === 'failed');

      degraded.forEach(peer => {
        this.healthMonitor.forceReconnect(peer.peerId);
        console.log(`🩹 Meta-Agent initiated heal for ${peer.peerId}`);
      });
    }
  }

  /**
   * Tune system parameter
   */
  _tuneParameter(decision) {
    const { parameter, value } = decision;

    if (this.thresholds[parameter] !== undefined) {
      this.thresholds[parameter] = value;
      this.metrics.parametersTuned++;
      console.log(`🔧 Meta-Agent tuned ${parameter} to ${value}`);
    }
  }

  /**
   * Get meta-agent status
   */
  getStatus() {
    const obs = this._observe();

    return {
      metaId: this.metaId,
      autonomousMode: this.autonomousMode,
      pendingDecisions: this.decisions.length,
      decisionHistory: this.decisionHistory.length,
      thresholds: { ...this.thresholds },
      metrics: { ...this.metrics },
      currentObservation: obs
    };
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit = 10) {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Manual intervention: spawn agent
   */
  manualSpawnAgent(role = 'worker') {
    const decision = {
      timestamp: Date.now(),
      issue: { type: 'manual', severity: 'manual' },
      action: Decision.SPAWN_AGENT,
      role,
      status: 'pending'
    };

    this._spawnAgent(decision);
    decision.status = 'completed';
    this.decisionHistory.push(decision);

    console.log(`👤 Manual spawn: ${role}`);
  }

  /**
   * Manual intervention: retire agent
   */
  manualRetireAgent(agentId) {
    const agent = this.agentFactory?.getAgent(agentId);
    if (!agent) {
      console.error(`Agent ${agentId} not found`);
      return;
    }

    agent.shutdown();
    this.swarmCoordinator?.unregisterAgent(agentId);
    this.metrics.agentsRetired++;

    console.log(`👤 Manual retire: ${agentId}`);
  }

  /**
   * Save swarm state snapshot - Track 5
   */
  async saveStateSnapshot() {
    if (!this.swarmSnapshot) {
      console.warn('⚠️ Swarm snapshot manager not configured');
      return null;
    }

    try {
      const snapshot = await this.swarmSnapshot.takeSnapshot();
      console.log('✅ Meta-Agent saved swarm state snapshot');
      return snapshot;
    } catch (error) {
      console.error('❌ Failed to save snapshot:', error);
      throw error;
    }
  }

  /**
   * Restore swarm state from snapshot - Track 5
   */
  async restoreState() {
    if (!this.restoreManager) {
      console.warn('⚠️ Restore manager not configured');
      return false;
    }

    try {
      const restored = await this.restoreManager.restoreSwarm();
      if (restored) {
        console.log('✅ Meta-Agent restored swarm state');
        // Emit event for UI update
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('swarm-restored', {
            detail: this.restoreManager.getProgress()
          }));
        }
      }
      return restored;
    } catch (error) {
      console.error('❌ Failed to restore state:', error);
      throw error;
    }
  }

  /**
   * Configure Track 5 persistence modules
   */
  configurePersistence(persistence, snapshot, restoreManager) {
    this.persistence = persistence;
    this.swarmSnapshot = snapshot;
    this.restoreManager = restoreManager;
    console.log('✅ Track 5 persistence configured');
  }

  /**
   * Shutdown meta-agent
   */
  shutdown() {
    this.stopAutonomousMode();
    this.decisions = [];
    this.decisionHistory = [];

    console.log('🛑 Meta-Agent shutdown');
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Decision,
    MetaAgent
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.Decision = Decision;
  window.MetaAgent = MetaAgent;
}

console.log('✅ Meta-Agent loaded');

/**
 * Phase 5.2: Emergent Behavior Engine
 * Self-balancing, self-healing, self-tuning, self-prioritizing, self-organizing
 * Nodes can promote/demote themselves and reassign responsibilities autonomously
 */

/**
 * Self-Balancer - autonomous load balancing and task distribution
 */
export class SelfBalancer {
  constructor(options = {}) {
    this.nodeStates = new Map();
    this.balancingLog = [];
    this.balanceThreshold = options.balanceThreshold || 0.2;
    this.debug = options.debug || false;
  }

  registerNode(nodeId, capacity = 100) {
    this.nodeStates.set(nodeId, {
      nodeId,
      capacity,
      load: 0,
      tasks: [],
      promessionScore: 0,
      role: 'worker'
    });
  }

  updateNodeLoad(nodeId, load, tasks = []) {
    const node = this.nodeStates.get(nodeId);
    if (!node) return { success: false };

    node.load = load;
    node.tasks = tasks;
    node.utilization = load / node.capacity;

    return { success: true };
  }

  autonomousBalance() {
    const nodes = Array.from(this.nodeStates.values());
    if (nodes.length < 2) return { balanced: true, changes: [] };

    const avgLoad = nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length;
    const changes = [];

    // Identify overloaded and underloaded nodes
    const overloaded = nodes.filter(n => n.load > avgLoad * (1 + this.balanceThreshold));
    const underloaded = nodes.filter(n => n.load < avgLoad * (1 - this.balanceThreshold));

    // Self-organize: move tasks from overloaded to underloaded
    for (const heavy of overloaded) {
      for (const light of underloaded) {
        if (heavy.tasks.length > 0) {
          const taskToMove = heavy.tasks.pop();
          light.tasks.push(taskToMove);
          changes.push({ from: heavy.nodeId, to: light.nodeId, task: taskToMove });
          break;
        }
      }
    }

    return { balanced: changes.length === 0, changes };
  }

  calculatePromotionScore(nodeId) {
    const node = this.nodeStates.get(nodeId);
    if (!node) return 0;

    let score = 100;
    score -= node.utilization * 50; // Less load = higher score
    score += node.tasks.length * 5; // More tasks managed = credit
    score -= (Math.random() * 10); // Randomness to prevent oscillation

    node.promotionScore = Math.max(0, Math.min(100, score));
    return node.promotionScore;
  }

  promoteNode(nodeId) {
    const node = this.nodeStates.get(nodeId);
    if (!node) return { success: false };

    const oldRole = node.role;
    node.role = 'leader';

    this.balancingLog.push({
      type: 'PROMOTION',
      nodeId,
      oldRole,
      newRole: 'leader',
      timestamp: Date.now()
    });

    return { success: true, nodeId, newRole: 'leader' };
  }

  demoteNode(nodeId) {
    const node = this.nodeStates.get(nodeId);
    if (!node || node.role === 'worker') return { success: false };

    node.role = 'worker';

    this.balancingLog.push({
      type: 'DEMOTION',
      nodeId,
      oldRole: 'leader',
      newRole: 'worker',
      timestamp: Date.now()
    });

    return { success: true, nodeId, newRole: 'worker' };
  }

  getStats() {
    const nodes = Array.from(this.nodeStates.values());
    const leaders = nodes.filter(n => n.role === 'leader').length;

    return {
      totalNodes: nodes.length,
      leaders,
      workers: nodes.length - leaders,
      avgLoad: nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length,
      maxLoad: Math.max(...nodes.map(n => n.load)),
      promotions: this.balancingLog.filter(l => l.type === 'PROMOTION').length,
      demotions: this.balancingLog.filter(l => l.type === 'DEMOTION').length
    };
  }
}

/**
 * Self-Healer - autonomous failure detection and recovery
 */
export class SelfHealer {
  constructor(options = {}) {
    this.nodeHealth = new Map();
    this.healingLog = [];
    this.recoveryThreshold = options.recoveryThreshold || 3;
    this.debug = options.debug || false;
  }

  registerNode(nodeId) {
    this.nodeHealth.set(nodeId, {
      nodeId,
      health: 100,
      failures: 0,
      recoveries: 0,
      lastFailure: null,
      status: 'healthy'
    });
  }

  reportFailure(nodeId) {
    const node = this.nodeHealth.get(nodeId);
    if (!node) return { success: false };

    node.failures++;
    node.lastFailure = Date.now();
    node.health = Math.max(0, node.health - 20);

    if (node.failures >= this.recoveryThreshold) {
      node.status = 'failing';
    }

    this.healingLog.push({
      type: 'FAILURE',
      nodeId,
      cumulativeFailures: node.failures,
      timestamp: Date.now()
    });

    return { success: true, nodeStatus: node.status };
  }

  attemptRecovery(nodeId) {
    const node = this.nodeHealth.get(nodeId);
    if (!node) return { success: false };

    // Simulate recovery attempt
    const recoveryChance = 0.7 - (node.failures * 0.1);
    const recovered = Math.random() < recoveryChance;

    if (recovered) {
      node.recoveries++;
      node.failures = Math.max(0, node.failures - 1);
      node.health = Math.min(100, node.health + 30);
      if (node.failures === 0) {
        node.status = 'healthy';
      }

      this.healingLog.push({
        type: 'RECOVERY',
        nodeId,
        success: true,
        timestamp: Date.now()
      });

      return { success: true, recovered: true, nodeHealth: node.health };
    }

    this.healingLog.push({
      type: 'RECOVERY',
      nodeId,
      success: false,
      timestamp: Date.now()
    });

    return { success: false, recovered: false };
  }

  getHealthReport() {
    const nodes = Array.from(this.nodeHealth.values());
    const healthy = nodes.filter(n => n.status === 'healthy').length;
    const failing = nodes.filter(n => n.status === 'failing').length;

    return {
      totalNodes: nodes.length,
      healthy,
      failing,
      avgHealth: (nodes.reduce((sum, n) => sum + n.health, 0) / nodes.length).toFixed(1),
      totalRecoveries: nodes.reduce((sum, n) => sum + n.recoveries, 0),
      recentEvents: this.healingLog.slice(-10)
    };
  }
}

/**
 * Self-Organizer - autonomous topology and responsibility redistribution
 */
export class SelfOrganizer {
  constructor(options = {}) {
    this.roles = new Map();
    this.responsibilities = new Map();
    this.reorganizationLog = [];
    this.debug = options.debug || false;
  }

  defineRole(roleId, responsibilities = []) {
    this.roles.set(roleId, {
      roleId,
      responsibilities,
      assignedNodes: [],
      capacity: 10,
      currentLoad: 0
    });
  }

  assignNodeToRole(nodeId, roleId) {
    const role = this.roles.get(roleId);
    if (!role) return { success: false, error: 'ROLE_NOT_FOUND' };

    if (!role.assignedNodes.includes(nodeId)) {
      role.assignedNodes.push(nodeId);
    }

    this.reorganizationLog.push({
      type: 'ROLE_ASSIGNMENT',
      nodeId,
      roleId,
      timestamp: Date.now()
    });

    return { success: true };
  }

  redistributeResponsibilities(nodeId, responsibilities) {
    if (!this.responsibilities.has(nodeId)) {
      this.responsibilities.set(nodeId, []);
    }

    const oldResponsibilities = this.responsibilities.get(nodeId);
    this.responsibilities.set(nodeId, responsibilities);

    this.reorganizationLog.push({
      type: 'RESPONSIBILITY_REDISTRIBUTION',
      nodeId,
      oldCount: oldResponsibilities.length,
      newCount: responsibilities.length,
      timestamp: Date.now()
    });

    return { success: true, changes: responsibilities.length - oldResponsibilities.length };
  }

  autonomousReorganize() {
    const changes = [];

    // Check for underutilized roles
    for (const [roleId, role] of this.roles) {
      const utilization = role.currentLoad / role.capacity;

      if (utilization < 0.3 && role.assignedNodes.length > 1) {
        // Consolidate to fewer nodes
        const toRemove = role.assignedNodes.slice(-1);
        role.assignedNodes = role.assignedNodes.slice(0, -1);

        changes.push({
          type: 'CONSOLIDATION',
          roleId,
          removedNode: toRemove[0],
          newNodeCount: role.assignedNodes.length
        });
      } else if (utilization > 0.9 && role.assignedNodes.length < 5) {
        // Scale up
        const newNodeId = `node-${Date.now()}`;
        role.assignedNodes.push(newNodeId);

        changes.push({
          type: 'SCALING',
          roleId,
          addedNode: newNodeId,
          newNodeCount: role.assignedNodes.length
        });
      }
    }

    return { reorganized: changes.length > 0, changes };
  }

  getTopology() {
    const topology = {};
    for (const [roleId, role] of this.roles) {
      topology[roleId] = {
        nodes: role.assignedNodes,
        responsibilities: role.responsibilities,
        utilization: (role.currentLoad / role.capacity * 100).toFixed(1)
      };
    }
    return topology;
  }
}

/**
 * Emergent Behavior Engine - orchestrates all self-behaviors
 */
export class EmergentBehaviorEngine {
  constructor(options = {}) {
    this.balancer = new SelfBalancer(options);
    this.healer = new SelfHealer(options);
    this.organizer = new SelfOrganizer(options);
    this.behaviorLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.debug = options.debug || false;
  }

  registerNode(nodeId, capacity = 100) {
    this.balancer.registerNode(nodeId, capacity);
    this.healer.registerNode(nodeId);
  }

  observeSystemState(nodeStates) {
    const changes = [];

    // Balance load
    const balanceResult = this.balancer.autonomousBalance();
    if (balanceResult.changes.length > 0) {
      changes.push({ component: 'BALANCER', changes: balanceResult.changes });
    }

    // Check health and heal
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      if (state.failing) {
        this.healer.reportFailure(nodeId);
        this.healer.attemptRecovery(nodeId);
        changes.push({ component: 'HEALER', nodeId, action: 'RECOVERY_ATTEMPTED' });
      }
    }

    // Reorganize topology
    const reorganizeResult = this.organizer.autonomousReorganize();
    if (reorganizeResult.changes.length > 0) {
      changes.push({ component: 'ORGANIZER', changes: reorganizeResult.changes });
    }

    return { changed: changes.length > 0, changes };
  }

  getSystemStatus() {
    return {
      balancingStats: this.balancer.getStats(),
      healingReport: this.healer.getHealthReport(),
      topology: this.organizer.getTopology(),
      timestamp: Date.now()
    };
  }
}

export default {
  SelfBalancer,
  SelfHealer,
  SelfOrganizer,
  EmergentBehaviorEngine
};

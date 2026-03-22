/**
 * WE4Free Swarm Registry
 * 
 * Single source of truth for swarm membership and connection state.
 * Provides stable agent identity independent of connection lifecycle.
 * 
 * Features:
 * - Durable agent registration with role tracking
 * - Connection state machine (connecting, connected, disconnected, failed, reconnecting)
 * - Bounded reconnection tracking with exponential backoff
 * - Event-driven updates for decoupled modules
 * - Membership queries for task assignment
 * 
 * This is the architectural fix for Track 6C connection stability.
 */

// ============================================================================
// EVENT EMITTER (Simple)
// ============================================================================

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// ============================================================================
// CONNECTION STATES
// ============================================================================

const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

const AgentState = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  QUARANTINED: 'quarantined'
};

// ============================================================================
// SWARM REGISTRY
// ============================================================================

class SwarmRegistry extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map(); // id -> { id, role, state, lastSeen, connections }
    this.connections = new Map(); // `${from}-${to}` -> { from, to, state, attempts, lastAttempt }
    this.maxReconnectAttempts = 5;
    this.maxBackoffMs = 30000; // 30 seconds
    
    console.log('📋 SwarmRegistry initialized');
  }

  /**
   * Register a component in the swarm
   */
  registerComponent(name, component) {
    if (!this.components) {
      this.components = new Map();
    }
    this.components.set(name, component);
    console.log(`✅ Component registered: ${name}`);
  }

  /**
   * Get a registered component
   */
  getComponent(name) {
    if (!this.components) return null;
    return this.components.get(name);
  }

  /**
   * Register a new agent in the swarm
   */
  registerAgent(id, role) {
    if (this.agents.has(id)) {
      console.warn(`⚠️ Agent ${id} already registered, updating...`);
    }
    
    this.agents.set(id, {
      id,
      role,
      state: AgentState.ACTIVE,
      lastSeen: Date.now(),
      connections: new Set()
    });
    
    this.emit('agent:added', id, role);
    console.log(`✅ Agent registered: ${id} (${role})`);
  }

  /**
   * Unregister an agent from the swarm
   */
  unregisterAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) {
      console.warn(`⚠️ Agent ${id} not found in registry`);
      return;
    }
    
    // Remove all connections involving this agent
    for (const connKey of agent.connections) {
      this.connections.delete(connKey);
    }
    
    this.agents.delete(id);
    this.emit('agent:removed', id);
    console.log(`✅ Agent unregistered: ${id}`);
  }

  /**
   * Update agent's last seen timestamp
   */
  touchAgent(id) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.lastSeen = Date.now();
      if (agent.state === AgentState.INACTIVE) {
        agent.state = AgentState.ACTIVE;
        this.emit('agent:activated', id);
      }
    }
  }

  /**
   * Mark agent as inactive
   */
  markAgentInactive(id) {
    const agent = this.agents.get(id);
    if (agent && agent.state !== AgentState.INACTIVE) {
      agent.state = AgentState.INACTIVE;
      this.emit('agent:inactive', id);
      console.log(`⚠️ Agent marked inactive: ${id}`);
    }
  }

  /**
   * Quarantine an agent (too many failures)
   */
  quarantineAgent(id) {
    const agent = this.agents.get(id);
    if (agent && agent.state !== AgentState.QUARANTINED) {
      agent.state = AgentState.QUARANTINED;
      this.emit('agent:quarantined', id);
      console.log(`🚫 Agent quarantined: ${id}`);
    }
  }

  /**
   * Set connection state between two agents
   */
  setConnectionState(fromId, toId, state) {
    const key = `${fromId}-${toId}`;
    const conn = this.connections.get(key) || {
      from: fromId,
      to: toId,
      attempts: 0,
      lastAttempt: 0
    };
    
    const oldState = conn.state;
    conn.state = state;
    conn.lastAttempt = Date.now();
    
    // Track failure attempts
    if (state === ConnectionState.FAILED || state === ConnectionState.DISCONNECTED) {
      conn.attempts++;
    } else if (state === ConnectionState.CONNECTED) {
      conn.attempts = 0; // Reset on success
    }
    
    this.connections.set(key, conn);
    
    // Update agent connection tracking
    const fromAgent = this.agents.get(fromId);
    const toAgent = this.agents.get(toId);
    if (fromAgent) fromAgent.connections.add(key);
    if (toAgent) toAgent.connections.add(key);
    
    // Emit state change event
    this.emit('connection:changed', fromId, toId, state, oldState);
    
    // Log significant state changes
    if (state === ConnectionState.CONNECTED) {
      console.log(`✅ Connection established: ${fromId} ↔ ${toId}`);
    } else if (state === ConnectionState.FAILED) {
      console.log(`❌ Connection failed: ${fromId} ↔ ${toId} (attempts: ${conn.attempts})`);
    } else if (state === ConnectionState.DISCONNECTED) {
      console.log(`⚠️ Connection disconnected: ${fromId} ↔ ${toId}`);
    }
    
    // Quarantine agents with too many failures
    if (conn.attempts >= this.maxReconnectAttempts) {
      this.quarantineAgent(fromId);
      this.quarantineAgent(toId);
    }
  }

  /**
   * Get connection state between two agents
   */
  getConnectionState(fromId, toId) {
    const key = `${fromId}-${toId}`;
    const conn = this.connections.get(key);
    return conn ? conn.state : null;
  }

  /**
   * Get all connected peers for an agent
   */
  getConnectedPeers(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return [];
    
    return Array.from(agent.connections)
      .map(key => this.connections.get(key))
      .filter(conn => conn && conn.state === ConnectionState.CONNECTED)
      .map(conn => conn.from === agentId ? conn.to : conn.from);
  }

  /**
   * Get all active agents with a specific role
   */
  getAgentsByRole(role) {
    return Array.from(this.agents.values())
      .filter(a => a.role === role && a.state === AgentState.ACTIVE);
  }

  /**
   * Get all active agents
   */
  getActiveAgents() {
    return Array.from(this.agents.values())
      .filter(a => a.state === AgentState.ACTIVE);
  }

  /**
   * Get failed connections that haven't exceeded max attempts
   */
  getFailedConnections() {
    return Array.from(this.connections.values())
      .filter(conn => 
        (conn.state === ConnectionState.FAILED || conn.state === ConnectionState.DISCONNECTED) &&
        conn.attempts < this.maxReconnectAttempts
      );
  }

  /**
   * Get stale agents (haven't been seen recently)
   */
  getStaleAgents(maxAgeMs = 5000) {
    const now = Date.now();
    return Array.from(this.agents.values())
      .filter(a => now - a.lastSeen > maxAgeMs && a.state === AgentState.ACTIVE);
  }

  /**
   * Calculate exponential backoff for reconnection attempts
   */
  calculateBackoff(attempts) {
    return Math.min(1000 * Math.pow(2, attempts), this.maxBackoffMs);
  }

  /**
   * Check if enough time has passed for reconnection attempt
   */
  shouldRetryConnection(fromId, toId) {
    const key = `${fromId}-${toId}`;
    const conn = this.connections.get(key);
    
    if (!conn) return true; // No connection record, try connecting
    if (conn.attempts >= this.maxReconnectAttempts) return false; // Max attempts exceeded
    if (conn.state === ConnectionState.CONNECTED) return false; // Already connected
    
    const backoff = this.calculateBackoff(conn.attempts);
    const timeSinceLastAttempt = Date.now() - conn.lastAttempt;
    
    return timeSinceLastAttempt >= backoff;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.state === AgentState.ACTIVE).length;
    
    const totalConnections = this.connections.size;
    const connectedCount = Array.from(this.connections.values())
      .filter(c => c.state === ConnectionState.CONNECTED).length;
    const disconnectedCount = Array.from(this.connections.values())
      .filter(c => c.state === ConnectionState.DISCONNECTED).length;
    const failedCount = Array.from(this.connections.values())
      .filter(c => c.state === ConnectionState.FAILED).length;
    
    return {
      totalAgents,
      activeAgents,
      inactiveAgents: totalAgents - activeAgents,
      totalConnections,
      connectedCount,
      disconnectedCount,
      failedCount,
      connectionSuccessRate: totalConnections > 0 ? connectedCount / totalConnections : 0
    };
  }

  /**
   * Clear all state (for testing)
   */
  clear() {
    this.agents.clear();
    this.connections.clear();
    console.log('🧹 SwarmRegistry cleared');
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SwarmRegistry = SwarmRegistry;
  window.ConnectionState = ConnectionState;
  window.AgentState = AgentState;
}

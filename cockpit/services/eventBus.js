/**
 * Event Bus - Agent Communication System
 * Enables agent-to-agent collaboration (Claw ↔ Kilo ↔ Gemini ↔ Local)
 * 
 * Features:
 * - Pub/Sub messaging between agents
 * - Event routing with filters
 * - Request/Response pattern
 * - Event history for debugging
 */

class EventBus {
  constructor(options = {}) {
    this.subscribers = new Map();
    this.eventHistory = [];
    this.maxHistory = options.maxHistory || 1000;
    this.debug = options.debug || false;
    
    // Agent connection status
    this.agents = new Map();
    
    // Initialize default agents
    this.registerAgent('kilo', { name: 'Kilo', type: 'orchestrator', status: 'online' });
    this.registerAgent('claw', { name: 'Claw', type: 'robotic-arm', status: 'idle' });
    this.registerAgent('gemini', { name: 'Gemini', type: 'llm', status: 'idle' });
    this.registerAgent('claude', { name: 'Claude', type: 'llm', status: 'idle' });
    this.registerAgent('lmstudio', { name: 'LM Studio', type: 'llm', status: 'idle' });
  }

  /**
   * Log debug message
   */
  log(...args) {
    if (this.debug) {
      console.log('[EventBus]', ...args);
    }
  }

  /**
   * Register an agent
   */
  registerAgent(agentId, metadata = {}) {
    this.agents.set(agentId, {
      id: agentId,
      ...metadata,
      connectedAt: Date.now(),
      lastSeen: Date.now()
    });
    this.log(`Agent registered: ${agentId}`, metadata);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    this.agents.delete(agentId);
    this.subscribers.delete(agentId);
    this.log(`Agent unregistered: ${agentId}`);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId, status, metadata = {}) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastSeen = Date.now();
      Object.assign(agent, metadata);
    }
  }

  /**
   * Get all agents
   */
  getAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Subscribe to events
   */
  subscribe(agentId, eventPattern, callback) {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    
    const subscription = {
      pattern: eventPattern,
      callback,
      subscribedAt: Date.now()
    };
    
    this.subscribers.get(agentId).push(subscription);
    this.log(`Agent ${agentId} subscribed to: ${eventPattern}`);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(agentId);
      const index = subs.indexOf(subscription);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event
   */
  publish(eventType, data, source = 'unknown') {
    const event = {
      type: eventType,
      data,
      source,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    this.log(`Event published: ${eventType} from ${source}`);

    // Notify subscribers
    let notified = 0;
    for (const [agentId, subs] of this.subscribers) {
      for (const sub of subs) {
        if (this.matchesPattern(eventType, sub.pattern)) {
          try {
            sub.callback(event);
            notified++;
          } catch (err) {
            console.error(`[EventBus] Callback error for ${agentId}:`, err);
          }
        }
      }
    }

    return { event, notified };
  }

  /**
   * Check if event matches pattern
   */
  matchesPattern(eventType, pattern) {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    
    // Support wildcards
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix);
    }
    
    // Support regex-like patterns
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(eventType);
    }
    
    return false;
  }

  /**
   * Request-Response pattern
   */
  async request(targetAgent, eventType, data, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout: ${targetAgent}/${eventType}`));
      }, timeout);

      // Subscribe to response
      const unsubscribe = this.subscribe(`req-${requestId}`, eventType, (event) => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(event.data);
      });

      // Send request
      this.publish(`${targetAgent}.request`, { 
        requestId, 
        type: eventType, 
        data 
      }, 'eventbus');
    });
  }

  /**
   * Send a direct message to an agent
   */
  sendToAgent(targetAgent, message, source = 'unknown') {
    return this.publish(`${targetAgent}.message`, {
      message,
      from: source,
      sentAt: Date.now()
    }, source);
  }

  /**
   * Broadcast to all agents
   */
  broadcast(eventType, data, exclude = []) {
    const event = {
      type: eventType,
      data,
      broadcast: true,
      timestamp: Date.now()
    };

    for (const agentId of this.agents.keys()) {
      if (!exclude.includes(agentId)) {
        this.publish(`${agentId}.${eventType}`, data, 'broadcast');
      }
    }
  }

  /**
   * Get event history
   */
  getHistory(eventType = null, limit = 100) {
    let history = this.eventHistory;
    
    if (eventType) {
      history = history.filter(e => e.type === eventType);
    }
    
    return history.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      agents: this.agents.size,
      subscribers: Array.from(this.subscribers.values()).reduce((a, b) => a + b.length, 0),
      events: this.eventHistory.length,
      agentsList: this.getAgents()
    };
  }
}

// Singleton instance
let eventBusInstance = null;

/**
 * Get EventBus singleton
 */
function getEventBus(options = {}) {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus(options);
  }
  return eventBusInstance;
}

/**
 * Create new EventBus instance
 */
function createEventBus(options = {}) {
  return new EventBus(options);
}

module.exports = { EventBus, getEventBus, createEventBus };

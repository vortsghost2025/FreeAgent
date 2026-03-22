// 🔄 ZeroMQ SwarmBus - The Nervous System
// Broadcast-first communication layer for your distributed organism

import { Publisher, Subscriber } from 'zeromq';
import { randomUUID } from 'crypto';

const IPC_ENDPOINT = 'ipc:///tmp/swarm-bus';

class SwarmBus {
  constructor(identity, options = {}) {
    this.identity = identity || randomUUID().slice(0,8);
    this.options = { 
      ipcEndpoint: options.ipcEndpoint || IPC_ENDPOINT, 
      debug: options.debug || false 
    };
    this.publisher = null;
    this.subscriber = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.messageHandlers.set('*', []);
    
    if (this.options.debug) {
      console.log(`[SWARM BUS] Initializing node ${this.identity}`);
    }
  }

  async connect() {
    if (this.connected) return;
    
    try {
      // Setup publisher
      this.publisher = new Publisher();
      await this.publisher.bind(this.options.ipcEndpoint);
      
      // Setup subscriber
      this.subscriber = new Subscriber();
      this.subscriber.connect(this.options.ipcEndpoint);
      await this.subscriber.subscribe('');
      
      this.connected = true;
      
      if (this.options.debug) {
        console.log(`[SWARM BUS] Connected node ${this.identity} to ${this.options.ipcEndpoint}`);
      }
      
      this.startListening();
      
      // Broadcast node registration
      this.broadcast('node_registered', {
        nodeId: this.identity,
        timestamp: Date.now(),
        type: 'swarm_bus_node'
      });
      
    } catch (error) {
      console.error(`[SWARM BUS] Connection failed for ${this.identity}:`, error.message);
      throw error;
    }
  }

  async startListening() {
    for await (const [msg] of this.subscriber) {
      try {
        const data = JSON.parse(msg.toString());
        if (data.sender !== this.identity) {
          this.handleMessage(data);
        }
      } catch (error) {
        if (this.options.debug) {
          console.warn('[SWARM BUS] Failed to parse message:', error.message);
        }
      }
    }
  }

  handleMessage(data) {
    // Handle targeted messages
    const targetHandlers = this.messageHandlers.get(data.target) || [];
    targetHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[SWARM BUS] Handler error for ${data.target}:`, error);
      }
    });
    
    // Handle wildcard messages
    const wildcardHandlers = this.messageHandlers.get('*') || [];
    wildcardHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('[SWARM BUS] Wildcard handler error:', error);
      }
    });
    
    if (this.options.debug) {
      console.log(`[SWARM BUS] ${this.identity} received: ${data.type} from ${data.sender}`);
    }
  }

  broadcast(type, payload = {}, priority = 'normal') {
    if (!this.connected) {
      if (this.options.debug) {
        console.warn(`[SWARM BUS] Cannot broadcast - not connected`);
      }
      return;
    }
    
    const message = {
      id: `msg_${Date.now()}_${randomUUID().slice(0,6)}`,
      sender: this.identity,
      target: 'all',
      type: type,
      payload: payload,
      priority: priority,
      timestamp: Date.now(),
      metadata: {
        source: 'swarm_bus',
        version: '1.0'
      }
    };
    
    try {
      this.publisher.send(JSON.stringify(message));
      if (this.options.debug) {
        console.log(`[SWARM BUS] Broadcast ${type} from ${this.identity}`);
      }
    } catch (error) {
      console.error(`[SWARM BUS] Broadcast failed:`, error);
    }
  }

  send(target, type, payload = {}) {
    if (!this.connected) return;
    
    const message = {
      id: `msg_${Date.now()}_${randomUUID().slice(0,6)}`,
      sender: this.identity,
      target: target,
      type: type,
      payload: payload,
      timestamp: Date.now()
    };
    
    this.publisher.send(JSON.stringify(message));
  }

  on(target, handler) {
    if (!this.messageHandlers.has(target)) {
      this.messageHandlers.set(target, []);
    }
    this.messageHandlers.get(target).push(handler);
    
    if (this.options.debug) {
      console.log(`[SWARM BUS] Registered handler for ${target} on ${this.identity}`);
    }
  }

  onAny(handler) {
    this.on('*', handler);
  }

  async close() {
    if (this.publisher) {
      await this.publisher.close();
    }
    if (this.subscriber) {
      await this.subscriber.close();
    }
    this.connected = false;
    
    if (this.options.debug) {
      console.log(`[SWARM BUS] Node ${this.identity} disconnected`);
    }
  }

  getStatus() {
    return {
      identity: this.identity,
      connected: this.connected,
      endpoint: this.options.ipcEndpoint,
      handlerCount: this.messageHandlers.size
    };
  }
}

export default SwarmBus;
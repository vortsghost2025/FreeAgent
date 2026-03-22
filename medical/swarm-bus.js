import zmq from 'zeromq';
import { randomUUID } from 'crypto';

const DEFAULT_ENDPOINT = 'ipc:///tmp/swarm-bus';

class SwarmBus {
  constructor(options = {}) {
    this.endpoint = options.endpoint || DEFAULT_ENDPOINT;
    this.agentId = options.agentId || 'agent-' + randomUUID().slice(0, 8);
    this.sender = null;
    this.receiver = null;
    this.handlers = new Map();
    this.subscriptions = new Set();
    this.connected = false;
  }

  async connect() {
    this.sender = new zmq.Publisher();
    this.receiver = new zmq.Subscriber();
    await this.sender.bind(this.endpoint);
    await this.receiver.connect(this.endpoint);
    this.connected = true;
    this.receiveLoop();
  }

  async receiveLoop() {
    for await (const [topic, msg] of this.receiver) {
      try {
        const message = JSON.parse(msg.toString());
        this.routeMessage(topic.toString(), message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    }
  }

  routeMessage(topic, message) {
    const target = message.target;
    const sender = message.sender;
    
    if (target && target !== this.agentId && target !== 'broadcast') {
      return;
    }
    
    const handler = this.handlers.get('*') || this.handlers.get(sender);
    if (handler) {
      handler({ sender, target, content: message, topic });
    }
    
    if (this.handlers.has(target)) {
      this.handlers.get(target)({ sender, target, content: message, topic });
    }
  }

  async send(target, content) {
    if (!this.connected) throw new Error('Not connected');
    
    const message = {
      sender: this.agentId,
      target,
      timestamp: new Date().toISOString(),
      content,
      metadata: {}
    };
    
    await this.sender.send([target, JSON.stringify(message)]);
  }

  async broadcast(content) {
    return this.send('broadcast', content);
  }

  subscribe(target, handler) {
    this.subscriptions.add(target);
    this.handlers.set(target, handler);
    this.receiver.subscribe(target);
  }

  onMessage(handler) {
    this.handlers.set('*', handler);
  }

  unsubscribe(target) {
    this.subscriptions.delete(target);
    this.handlers.delete(target);
  }

  async shutdown() {
    if (this.sender) await this.sender.close();
    if (this.receiver) await this.receiver.close();
    this.connected = false;
  }
}

export function createSwarmBus(options) {
  return new SwarmBus(options);
}

export { SwarmBus };
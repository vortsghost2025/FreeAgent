// Message Bus Adapter (stub for Redis/NATS)
// Replace with real implementation as needed

export class MessageBusAdapter {
  constructor() { this.handlers = {}; }
  on(event, handler) { this.handlers[event] = handler; }
  emit(event, msg) { if (this.handlers[event]) this.handlers[event](msg); }
  // TODO: Plug in Redis/NATS here
}

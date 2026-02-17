// Heartbeat & Health Checks
import { updateNodeHeartbeat, listNodes } from './node-registry.js';

export function heartbeat(id) {
  updateNodeHeartbeat(id);
}

export function checkHealth(timeoutMs = 10000) {
  const now = Date.now();
  return listNodes().map(node => ({
    ...node,
    healthy: (now - node.lastSeen) < timeoutMs
  }));
}

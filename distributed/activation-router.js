// Distributed Activation Router: Decides which node handles which protocol/task
import { listNodes } from './node-registry.js';

export function routeActivation(protocol) {
  const nodes = listNodes();
  // Simple round-robin for now
  if (!nodes.length) throw new Error('No nodes registered');
  const idx = Math.floor(Math.random() * nodes.length);
  return nodes[idx];
}

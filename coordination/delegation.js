// Task Delegation Logic
import { findAgentsForType } from './capability-registry.js';

export function delegateTask(type, task) {
  const agents = findAgentsForType(type);
  if (!agents.length) throw new Error('No agent for type ' + type);
  // Simple: pick first agent
  return { agentId: agents[0], task };
}

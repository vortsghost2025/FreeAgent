// Agent Capability Registry
const capabilities = new Map();

export function registerCapability(agentId, types) {
  capabilities.set(agentId, types);
}

export function getCapabilities(agentId) {
  return capabilities.get(agentId) || [];
}

export function findAgentsForType(type) {
  return Array.from(capabilities.entries())
    .filter(([_, types]) => types.includes(type))
    .map(([agentId]) => agentId);
}

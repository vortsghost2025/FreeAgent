// Node Registry: Tracks all active nodes (metadata, health, capabilities)
const nodes = new Map();

export function registerNode(id, meta) {
  nodes.set(id, { ...meta, lastSeen: Date.now() });
}

export function updateNodeHeartbeat(id) {
  if (nodes.has(id)) nodes.get(id).lastSeen = Date.now();
}

export function getNode(id) {
  return nodes.get(id);
}

export function listNodes() {
  return Array.from(nodes.entries()).map(([id, meta]) => ({ id, ...meta }));
}

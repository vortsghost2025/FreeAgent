// Distributed Conflict Detection
const activations = new Map();

export function recordActivation(taskId, nodeId) {
  activations.set(taskId, nodeId);
}

export function detectConflicts() {
  // Returns tasks handled by multiple nodes
  const seen = new Map();
  const conflicts = [];
  for (const [taskId, nodeId] of activations.entries()) {
    if (seen.has(taskId)) conflicts.push({ taskId, nodes: [seen.get(taskId), nodeId] });
    else seen.set(taskId, nodeId);
  }
  return conflicts;
}

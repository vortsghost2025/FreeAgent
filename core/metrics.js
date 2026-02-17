// Metrics Collector (in-memory, can be extended)
const metrics = {};

export function recordMetric(name, value) {
  if (!metrics[name]) metrics[name] = [];
  metrics[name].push({ value, ts: Date.now() });
}

export function getMetrics(name) {
  return metrics[name] || [];
}

export function getAllMetrics() {
  return { ...metrics };
}

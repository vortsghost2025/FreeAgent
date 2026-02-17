// Core Protocol Registry v2
// Metadata-only registry for protocols, agents, and plugins

const protocols = new Map();

export function registerProtocol(name, meta) {
  protocols.set(name, { ...meta, registeredAt: new Date().toISOString() });
}

export function getProtocol(name) {
  return protocols.get(name);
}

export function listProtocols() {
  return Array.from(protocols.entries()).map(([name, meta]) => ({ name, ...meta }));
}

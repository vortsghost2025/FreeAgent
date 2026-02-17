// State Snapshotter
import { listNodes } from '../distributed/node-registry.js';
import { listProtocols } from '../core/protocol-registry.js';

export function snapshotState() {
  return {
    nodes: listNodes(),
    protocols: listProtocols(),
    ts: new Date().toISOString()
  };
}

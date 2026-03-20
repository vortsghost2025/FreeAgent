# Federation Protocol

> Domain-agnostic. Production-grade. Deterministic.

---

## 1. Federation Model

### 1.1 Federation Types

| Type | Scope | Use Case |
|------|-------|----------|
| **Local** | Same instance, multiple agents | Internal collaboration |
| **Workspace** | Same machine, multiple instances | Multi-environment |
| **Network** | Same network, multiple machines | Distributed deployment |
| **Cloud** | Remote, multiple networks | Global deployment |

### 1.2 Federation Interface

```typescript
interface FederationProtocol {
  // Peer management
  connect(peer: PeerInfo): Promise<void>;
  disconnect(peerId: string): Promise<void>;
  getPeers(): Peer[];
  
  // Communication
  broadcast(message: FederationMessage): Promise<void>;
  send(peerId: string, message: FederationMessage): Promise<void>;
  
  // Sync
  syncState(): Promise<SyncResult>;
  requestSync(peerId: string, resource: string): Promise<any>;
  
  // Patterns
  sharePattern(pattern: Pattern): Promise<void>;
  receivePattern(pattern: Pattern): Promise<void>;
}
```

---

## 2. Peer Management

### 2.1 Peer Structure

```typescript
interface Peer {
  id: string;
  name: string;
  type: 'agent' | 'cockpit' | 'gateway';
  endpoint: string;
  capabilities: string[];
  status: PeerStatus;
  lastSeen: string;
  trust: number; // 0-1
  metadata: Record<string, any>;
}

type PeerStatus = 
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';
```

### 2.2 Connection Handshake

```typescript
async function handshake(local: PeerInfo, remote: PeerInfo): Promise<HandshakeResult> {
  // 1. Exchange capabilities
  const capabilities = await exchangeCapabilities(local, remote);
  
  // 2. Verify compatibility
  if (!verifyCompatibility(capabilities)) {
    throw new Error('Incompatible peers');
  }
  
  // 3. Establish trust
  const trust = await establishTrust(local, remote);
  
  // 4. Exchange state
  const state = await exchangeState(local, remote);
  
  return {
    peerId: remote.id,
    capabilities,
    trust,
    state,
    established: Date.now()
  };
}
```

### 2.3 Heartbeat

```typescript
interface Heartbeat {
  peerId: string;
  timestamp: string;
  status: PeerStatus;
  metrics: {
    cpu: number;
    memory: number;
    agents: number;
  };
}

async function startHeartbeat(peer: Peer, interval: number): Promise<void> {
  setInterval(async () => {
    const heartbeat: Heartbeat = {
      peerId: localPeer.id,
      timestamp: new Date().toISOString(),
      status: 'connected',
      metrics: await getSystemMetrics()
    };
    
    try {
      await send(peer.id, { type: 'heartbeat', payload: heartbeat });
    } catch (e) {
      await handleDisconnect(peer.id);
    }
  }, interval);
}
```

---

## 3. Pattern Propagation

### 3.1 Pattern Structure

```typescript
interface FederatedPattern {
  id: string;
  type: string;
  data: any;
  source: {
    peerId: string;
    agentId: string;
    timestamp: string;
  };
  confidence: number;
  propagation: {
    hops: number;
    visited: string[];
    ttl: number;
  };
  metadata: {
    domain: string;
    tags: string[];
    priority: number;
  };
}
```

### 3.2 Propagation Algorithm

```typescript
async function propagatePattern(
  pattern: FederatedPattern, 
  federation: FederationProtocol
): Promise<void> {
  // 1. Store locally
  await localStore.store(pattern);
  
  // 2. Calculate recipients
  const recipients = await selectRecipients(pattern);
  
  // 3. Broadcast to recipients
  for (const peer of recipients) {
    try {
      await federation.send(peer.id, {
        type: 'pattern_share',
        payload: {
          ...pattern,
          propagation: {
            ...pattern.propagation,
            hops: pattern.propagation.hops + 1,
            visited: [...pattern.propagation.visited, localPeer.id]
          }
        }
      });
    } catch (e) {
      console.warn(`Failed to propagate to ${peer.id}`);
    }
  }
}

async function selectRecipients(pattern: FederatedPattern): Promise<Peer[]> {
  const peers = await federation.getPeers();
  
  // Filter by:
  // 1. Not visited
  const notVisited = peers.filter(p => !pattern.propagation.visited.includes(p.id));
  
  // 2. Trust threshold
  const trusted = notVisited.filter(p => p.trust >= MIN_TRUST);
  
  // 3. Capability match
  const capable = trusted.filter(p => 
    pattern.metadata.tags.some(tag => p.capabilities.includes(tag))
  );
  
  // 4. Limit by TTL
  return capable.slice(0, pattern.propagation.ttl);
}
```

---

## 4. State Synchronization

### 4.1 Sync Types

| Type | Trigger | Scope | Consistency |
|------|---------|-------|-------------|
| **Full** | Connection | All resources | Strong |
| **Delta** | Periodic | Changed since last sync | Eventual |
| **On-Demand** | Request | Specific resource | Weak |
| **Push** | Event | Related resources | Eventual |

### 4.2 Delta Sync

```typescript
interface SyncState {
  lastSync: string;
  resourceVersions: Map<string, number>;
  pendingChanges: Change[];
}

async function deltaSync(federation: FederationProtocol): Promise<SyncResult> {
  const localState = getLocalSyncState();
  const peerStates = await gatherPeerStates();
  
  const changes: Change[] = [];
  
  for (const [resource, version] of Object.entries(localState.resourceVersions)) {
    const peerVersion = peerStates[resource]?.version || 0;
    
    if (version > peerVersion) {
      // Local has newer
      changes.push({
        resource,
        direction: 'push',
        data: await getResource(resource)
      });
    } else if (version < peerVersion) {
      // Peer has newer
      changes.push({
        direction: 'pull',
        resource,
        data: await federation.requestSync(peerId, resource)
      });
    }
  }
  
  return applyChanges(changes);
}
```

---

## 5. Conflict Resolution

### 5.1 Conflict Detection

```typescript
interface Conflict {
  resource: string;
  versions: {
    local: { value: any; timestamp: string };
    remote: { value: any; timestamp: string };
  };
}

function detectConflict(local: Versioned, remote: Versioned): Conflict | null {
  if (local.version !== remote.version && local.timestamp !== remote.timestamp) {
    return {
      resource: local.id,
      versions: { local, remote }
    };
  }
  return null;
}
```

### 5.2 Resolution Strategies

```typescript
type ResolutionStrategy = 'last_write_wins' | 'merge' | 'manual' | 'source_trust';

const resolvers: Record<ResolutionStrategy, Resolver> = {
  last_write_wins: (conflict) => {
    return conflict.versions.local.timestamp > conflict.versions.remote.timestamp
      ? conflict.versions.local
      : conflict.versions.remote;
  },
  
  merge: (conflict) => {
    // Deep merge with conflict markers
    return deepMergeWithMarkers(conflict.versions.local, conflict.versions.remote);
  },
  
  manual: (conflict) => {
    // Queue for human resolution
    queueForManualResolution(conflict);
    return conflict.versions.local; // Keep local until resolved
  },
  
  source_trust: (conflict, peerTrust) => {
    const localTrust = getLocalTrust();
    return peerTrust > localTrust
      ? conflict.versions.remote
      : conflict.versions.local;
  }
};
```

---

## 6. Trust Management

### 6.1 Trust Calculation

```typescript
interface TrustScore {
  peerId: string;
  score: number; // 0-1
  factors: {
    reliability: number;    // Uptime, response time
    accuracy: number;       // Correct predictions
    cooperation: number;     // Pattern sharing
    honesty: number;       // Reported vs actual
  };
  lastUpdated: string;
}

function calculateTrust(peerId: string): TrustScore {
  const history = getPeerHistory(peerId);
  
  const reliability = history.uptime / history.totalTime;
  const accuracy = history.correct / history.total;
  const cooperation = history.shared / history.requests;
  const honesty = 1 - (history.discrepancies / history.total);
  
  const score = (
    reliability * 0.3 +
    accuracy * 0.3 +
    cooperation * 0.2 +
    honesty * 0.2
  );
  
  return {
    peerId,
    score,
    factors: { reliability, accuracy, cooperation, honesty },
    lastUpdated: new Date().toISOString()
  };
}
```

---

## 7. Federation Metrics

### 7.1 Tracked Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `federation.peers` | Active peers | < 1 |
| `federation.messages.sent` | Messages sent/min | N/A |
| `federation.messages.received` | Messages received/min | N/A |
| `federation.sync.latency` | Sync time | > 5s |
| `federation.conflicts` | Conflicts detected | > 5 |
| `federation.trust` | Average trust score | < 0.5 |
| `federation.patterns.shared` | Patterns shared/min | N/A |

---

## 8. Security

### 8.1 Authentication

```typescript
interface AuthChallenge {
  challenge: string;
  timestamp: string;
  nonce: string;
}

async function authenticate(peer: Peer): Promise<boolean> {
  const challenge = generateChallenge();
  
  const response = await send(peer.id, {
    type: 'auth_challenge',
    payload: challenge
  });
  
  const verified = await verifySignature(response, peer.publicKey);
  const authorized = await checkAuthorization(peer.id);
  
  return verified && authorized;
}
```

---

## Related

- [COCKPIT_ORCHESTRATION_LAYER.md](./COCKPIT_ORCHESTRATION_LAYER.md)
- [MEMORY_SUBSTRATE_SPEC.md](./MEMORY_SUBSTRATE_SPEC.md)
- [AGENT_ROLE_MATRIX.md](./AGENT_ROLE_MATRIX.md)
- [CONSENSUS_ENGINE_SPEC.md](./CONSENSUS_ENGINE_SPEC.md)

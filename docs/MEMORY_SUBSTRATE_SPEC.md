# Memory Substrate Spec

> Domain-agnostic. Production-grade. Deterministic.

---

## 1. Memory Architecture

### 1.1 Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MEMORY SUBSTRATE                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ TRANSCENDENT (Long-term, archived patterns)           │    │
│  │ - Wisdom, core values, fundamental patterns            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↑                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ASSOCIATIVE (Cross-domain patterns)                     │    │
│  │ - Abstracted insights, metaphors, analogies            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↑                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LONG-TERM (Persistent knowledge)                       │    │
│  │ - Learned patterns, agent memories                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↑                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ WORKING (Active context │
│  │)                               │    - Current task, immediate context                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↑                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ SHORT-TERM (Ephemeral)                                 │    │
│  │ - Turn-by-turn, scratchpad                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↑                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PERCEPTUAL (Sensory input)                             │    │
│  │ - Raw input, immediate sensations                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Memory Interfaces

### 2.1 Core Memory Interface

```typescript
interface MemorySubstrate {
  // Write
  store(collection: string, entry: MemoryEntry): Promise<string>;
  
  // Read
  retrieve(collection: string, id: string): Promise<MemoryEntry | null>;
  query(collection: string, filter: QueryFilter): Promise<MemoryEntry[]>;
  
  // Update
  update(collection: string, id: string, data: Partial<MemoryEntry>): Promise<boolean>;
  
  // Delete
  delete(collection: string, id: string): Promise<boolean>;
  
  // Maintenance
  compact(collection: string): Promise<void>;
  getStats(collection: string): MemoryStats;
}
```

### 2.2 Memory Entry

```typescript
interface MemoryEntry {
  id: string;
  type: string;
  data: Record<string, any>;
  metadata: {
    created: string;
    updated: string;
    source: string;
    importance: number; // 0-1
    ttl?: number; // ms, -1 = never
    tags: string[];
  };
  embedding?: number[]; // vector for similarity search
}
```

### 2.3 Query Filter

```typescript
interface QueryFilter {
  where?: Record<string, any>;
  tags?: string[];
  importance?: { min?: number; max?: number };
  created?: { after?: string; before?: string };
  embedding?: {
    vector: number[];
    similarity: number; // 0-1 threshold
    topK?: number;
  };
  limit?: number;
  offset?: number;
  sort?: { field: string; order: 'asc' | 'desc' };
}
```

---

## 3. Persistence Layer

### 3.1 Atomic Write

```typescript
async function atomicWrite(filepath: string, data: any): Promise<void> {
  const tempPath = `${filepath}.tmp.${Date.now()}`;
  const backupPath = `${filepath}.backup`;
  
  try {
    // 1. Write to temp file
    await fs.writeFile(tempPath, JSON.stringify(data), 'utf8');
    
    // 2. If main exists, backup
    if (await fs.exists(filepath)) {
      await fs.copyFile(filepath, backupPath);
    }
    
    // 3. Atomic rename
    await fs.rename(tempPath, filepath);
    
    // 4. Cleanup old backup
    if (await fs.exists(backupPath)) {
      await fs.unlink(backupPath);
    }
  } catch (error) {
    // Cleanup temp on failure
    if (await fs.exists(tempPath)) {
      await fs.unlink(tempPath);
    }
    throw error;
  }
}
```

### 3.2 Recovery

```typescript
async function recover(filepath: string): Promise<any> {
  const mainPath = filepath;
  const backupPath = `${filepath}.backup`;
  
  // Try main first
  if (await fs.exists(mainPath)) {
    try {
      const data = JSON.parse(await fs.readFile(mainPath, 'utf8'));
      return { data, source: 'main' };
    } catch (e) {
      console.warn('Main file corrupt, trying backup');
    }
  }
  
  // Try backup
  if (await fs.exists(backupPath)) {
    try {
      const data = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      return { data, source: 'backup' };
    } catch (e) {
      console.error('Backup also corrupt');
    }
  }
  
  // Initialize fresh
  return { data: null, source: 'initialized' };
}
```

---

## 4. Bounded Collections

### 4.1 Collection Limits

```typescript
interface CollectionConfig {
  maxSize: number;
  maxAge?: number; // ms
  evictionPolicy: 'lru' | 'fifo' | 'priority';
}

const DEFAULT_LIMITS: Record<string, CollectionConfig> = {
  'transient': { maxSize: 100, maxAge: 60000, evictionPolicy: 'fifo' },
  'short-term': { maxSize: 500, maxAge: 300000, evictionPolicy: 'lru' },
  'working': { maxSize: 1000, maxAge: 3600000, evictionPolicy: 'lru' },
  'long-term': { maxSize: 10000, evictionPolicy: 'priority' },
  'associative': { maxSize: 5000, evictionPolicy: 'priority' },
  'transcendent': { maxSize: 1000, evictionPolicy: 'priority' }
};
```

### 4.2 Eviction

```typescript
async function evict(collection: string, count: number): Promise<void> {
  const config = DEFAULT_LIMITS[collection];
  if (!config) return;
  
  const entries = await getEntriesSortedByRelevance(collection, config.evictionPolicy);
  const toEvict = entries.slice(0, count);
  
  for (const entry of toEvict) {
    // Archive before eviction if important
    if (entry.metadata.importance > 0.8) {
      await archive(entry);
    }
    await deleteEntry(collection, entry.id);
  }
}
```

---

## 5. Memory Hygiene

### 5.1 Cleanup Schedule

```typescript
interface CleanupTask {
  collection: string;
  interval: number; // ms
  task: () => Promise<void>;
}

const CLEANUP_TASKS: CleanupTask[] = [
  { collection: 'transient', interval: 60000, task: removeExpired },
  { collection: 'short-term', interval: 300000, task: removeExpired },
  { collection: 'working', interval: 600000, task: compress },
  { collection: 'long-term', interval: 3600000, task: deduplicate }
];
```

### 5.2 Expiration

```typescript
function isExpired(entry: MemoryEntry): boolean {
  if (entry.metadata.ttl === undefined || entry.metadata.ttl === -1) {
    return false;
  }
  const age = Date.now() - new Date(entry.metadata.updated).getTime();
  return age > entry.metadata.ttl;
}
```

---

## 6. Vector Search

### 6.1 Embedding Interface

```typescript
interface VectorMemory {
  // Store with embedding
  storeWithEmbedding(entry: MemoryEntry, embedding: number[]): Promise<string>;
  
  // Similarity search
  findSimilar(embedding: number[], threshold: number, limit: number): Promise<MemoryEntry[]>;
  
  // Update embedding
  updateEmbedding(id: string, embedding: number[]): Promise<void>;
}
```

### 6.2 Similarity Search

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

async function findSimilar(
  collection: string, 
  embedding: number[], 
  threshold: number,
  limit: number
): Promise<MemoryEntry[]> {
  const candidates = await query(collection, { limit: 1000 });
  
  const scored = candidates
    .filter(e => e.embedding)
    .map(e => ({
      entry: e,
      score: cosineSimilarity(embedding, e.embedding!)
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return scored.map(s => s.entry);
}
```

---

## 7. Federation Support

### 7.1 Cross-Agent Memory

```typescript
interface FederatedMemory {
  // Share memory with peer
  share(entryId: string, peerId: string): Promise<void>;
  
  // Receive shared memory
  receive(peerId: string, entry: MemoryEntry): Promise<void>;
  
  // Query across federation
  federatedQuery(filter: QueryFilter, peers: string[]): Promise<MemoryEntry[]>;
}
```

---

## 8. Metrics

### 8.1 Memory Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `memory.total` | Total entries | > maxSize |
| `memory.size` | Total bytes | > limit |
| `memory.evictions` | Evictions per minute | > 100/min |
| `memory.expired` | Expired entries | > 50/min |
| `memory.latency` | Avg operation time | > 100ms |
| `memory.corruption` | Corruption events | > 0 |

---

## Related

- [RESILIENCE_LAYER_SPEC.md](./RESILIENCE_LAYER_SPEC.md)
- [persistentAgentMemory.js](./persistentAgentMemory.js)
- [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md)

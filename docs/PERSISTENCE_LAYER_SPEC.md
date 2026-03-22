# PERSISTENCE_LAYER_SPEC.md

## Browser-Resident Agent Immortality

**Role:** Ensures agents, tasks, metrics, and snapshots survive browser sessions.

---

## 1. Position in Stack

- Above: **RUNTIME_EXECUTION_LAYER.md**
- Beside: **MEMORY_SUBSTRATE_SPEC.md**, **RESILIENCE_LAYER_SPEC.md**

**This is the Immortality Layer** — continuity of consciousness for browser agents.

---

## 2. Four Object Stores

| Store | Cognitive Domain | Mirrors |
|-------|-----------------|---------|
| `agents` | Agent identity + state | Working memory |
| `tasks` | Work queue | Short-term memory |
| `metrics` | Performance telemetry | Perceptual monitoring |
| `snapshots` | Full-system dumps | Long-term/associative |

---

## 3. Core Capabilities

### 3.1 Deterministic Resurrection

Restore functions rebuild swarm identity:
- agent type
- capabilities
- workload
- metrics
- last activity
- custom state via `getState()`

### 3.2 Transactional Safety

Every operation:
- opens transaction
- writes/reads atomically
- increments metrics
- logs success/failure
- isolates stores

### 3.3 Nuclear Option

`clearAll()` — reset node, wipe memory, reinitialize cockpit.

---

## 4. Metrics Tracked

- agentsSaved / agentsRestored
- tasksSaved / tasksRestored
- snapshotsSaved / snapshotsRestored
- errors

---

## 5. Invariants

- **Invariant 1:** All agent state must be recoverable on page load.
- **Invariant 2:** Tasks must survive browser crash.
- **Invariant 3:** Snapshots must enable full system restore.
- **Invariant 4:** Metrics must persist for observability.
- **Invariant 5:** ClearAll must leave system in known-good state.

---

## 6. Related Specs

- MEMORY_SUBSTRATE_SPEC.md — cognitive layers
- RUNTIME_EXECUTION_LAYER.md — phased execution
- RESILIENCE_LAYER_SPEC.md — heartbeats, retries

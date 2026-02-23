# Phase 7 Isolation Wiring Guide

**Date**: 2026-02-22
**Purpose**: Wire Phase 7 Evolution to isolated compute engine to prevent swarm crashes

---

## 🟥 Problem Identified

### Symptoms
- Coordinator dies instantly when autonomous mode enabled
- Router dies instantly when autonomous mode enabled
- Observer dies instantly when autonomous mode enabled
- Only 2 light workers survive (supervisor, logger)

### Root Cause
**Phase 7 Autonomous Evolution is overloading the shared compute engine.**

When autonomous mode fires:
1. Phase 7 floods compute engine with:
   - Cycle tasks
   - Diagnostics tasks
   - Proposal tasks
   - Guardrail checks
   - Memory writes
   - Federated convergence checks

2. Shared `distributed-compute.js` chokes instantly

3. Coordinator (which depends on compute engine) crashes

4. Router (which depends on coordinator) crashes

5. Observer (which depends on coordinator/router) crashes

6. Light workers (which don't depend on compute) survive

---

## ✅ Solution Implemented

### 1. Created Isolated Compute Engine

**File**: `distributed-compute-evolution.js`

**Isolation Features**:
- Separate job ID prefix: `ev-` vs `mr-`/`pipe-`/`batch-`
- Separate task types: `map-evolution`, `reduce-evolution`, `pipeline-evolution-stage`, etc.
- Lower default concurrency: 5 chunks (vs 10 in shared)
- Smaller batch size: 5 items (vs 10 in shared)
- Longer timeout: 90s (vs 60s in shared)
- Separate metrics tracking
- Distinct logging prefix: `[EVOL]`

**Location**: `C:\inetpub\wwwroot\distributed-compute-evolution.js`

---

### 2. Updated Phase 7 Dashboard

**File**: `phase-7-evolution-dashboard.html`

**Changes Made**:
- ✅ Changed to ES6 module: `<script type="module">`
- ✅ Import isolated compute: `import { DistributedComputeEvolution } from './distributed-compute-evolution.js'`
- ✅ Import real Phase 7 modules:
  - `SelfDirectedImprovementCycleEngine` from `autonomous-evolution-cycles.js`
  - `FederatedSelfDiagnosticsEngine` from `federated-self-diagnostics.js`
  - `GuardrailPolicy` from `supervised-autonomy-controller.js`
  - `PatchProposalBuilder` from `autonomous-patch-proposals.js`
  - `SafetyConstraintEngine` from `safety-bounded-exploration.js`
  - `EvolutionMemory` from `evolution-memory.js`
  - `AutonomousFederatedEvolutionEngine` from `autonomous-federated-evolution.js`
- ✅ Replaced mock classes with real implementations
- ✅ Updated `runEvolutionCycle()` to use real engines
- ✅ Updated `clearDiagnostics()` to use real diagnostics
- ✅ Added isolated compute initialization on first run
- ✅ Added real pattern storage in evolution memory
- ✅ Added real anomaly detection from diagnostics

**Deployment**: `C:\inetpub\wwwroot\phase-7-evolution-dashboard.html`

---

## 🎯 Architecture After Isolation

### Before (CRASHING)
```
Genomics UI ──┐
Medical UI ───┤
Phase 7 UI ──┼─→ distributed-compute.js (SHARED, OVERLOADED)
Swarm UI ───┤
                  └→→ Coordinator ─→ Router ─→ Observer (CRASH)
```

### After (STABLE)
```
Genomics UI ──┐
Medical UI ───┤
Swarm UI ───┼─→ distributed-compute.js (SHARED, STABLE)
                  └→→ Coordinator ─→ Router ─→ Observer (HEALTHY)

Phase 7 UI ──┐
                  └→→ distributed-compute-evolution.js (ISOLATED, STABLE)
                      └→→ Evolution Tasks (NO IMPACT)
```

---

## 🔧 Technical Details

### Compute Engine Interface

**Isolated Engine Constructor**:
```javascript
new DistributedComputeEvolution(swarmCoordinator, taskQueue)
```

**For Dashboard**:
```javascript
// Initialize on first run
if (!evolutionCompute || !evolutionTaskQueue) {
  // Create isolated task queue
  evolutionTaskQueue = {
    tasks: new Map(),
    completedTasks: new Map(),
    failedTasks: new Map(),
    addTask: (task) => { /* ... */ },
    completeTask: (taskId, result) => { /* ... */ },
    failTask: (taskId, error) => { /* ... */ }
  };

  // Create isolated compute engine
  evolutionCompute = new DistributedComputeEvolution(null, evolutionTaskQueue);
}
```

### Task Routing

**Phase 7 tasks** are automatically routed to isolated engine because:
1. Dashboard uses `DistributedComputeEvolution` class
2. Isolated engine generates `ev-*` prefixed task IDs
3. Workers claiming `ev-*` tasks process them through isolated engine
4. Shared compute engine never sees `ev-*` tasks

---

## ✅ Expected Results

### Swarm Health
- ✅ Coordinator: Stable (no overload from Phase 7)
- ✅ Router: Stable (coordinator doesn't crash)
- ✅ Observer: Stable (router doesn't crash)
- ✅ All 4 workers: Stable (no cascade failures)

### Phase 7 Functionality
- ✅ Evolution cycles: Run in isolation
- ✅ Diagnostics: Generate from real engine
- ✅ Proposals: Generated through real builder
- ✅ Guardrails: Real policy enforcement
- ✅ Memory: Real pattern storage

### Cross-Project Isolation
- ✅ Genomics: Unaffected (uses shared compute)
- ✅ Medical: Unaffected (uses shared compute)
- ✅ Phase 7: Isolated (uses dedicated compute)
- ✅ Climate: (when wired) Can use isolated or shared

---

## 🚀 Testing Steps

1. **Test Baseline Swarm**
   - Open `http://localhost/swarm-ui.html`
   - Verify all 4 workers start: coordinator, router, observer, supervisor, logger
   - Verify all workers show healthy status
   - Expected: All green, all stable

2. **Test Autonomous Mode (BEFORE)**
   - Enable autonomous mode
   - **Expected CRASH**: Coordinator/Router/Observer die instantly
   - Note: 2 light workers survive

3. **Test Autonomous Mode (AFTER)**
   - Open `http://localhost/phase-7-evolution-dashboard.html`
   - Click "▶ Run" to start evolution cycle
   - **Expected SUCCESS**: All swarm workers stay alive
   - Verify Phase 7 console shows real module activity

4. **Verify Isolation**
   - Check Phase 7 console logs: Should show `[EVOL]` prefix
   - Check swarm console: Should NOT show Phase 7 tasks in shared compute
   - Verify Phase 7 metrics update with real data

---

## 📊 Monitoring

### What to Watch in Swarm UI

**Healthy (After Isolation)**:
```
✓ Coordinator: healthy
✓ Router: healthy
✓ Observer: healthy
✓ Supervisor: healthy
✓ Logger: healthy
```

**Unhealthy (If Isolation Fails)**:
```
✗ Coordinator: crashed
✗ Router: crashed
✗ Observer: crashed
✗ Supervisor: healthy (light worker, survives)
✗ Logger: healthy (light worker, survives)
```

### What to Watch in Phase 7 Console

**Success (Real Modules)**:
```
[HH:MM:SS] ✅ ISOLATED compute engine ready
[HH:MM:SS] ✅ Real Phase 7 modules connected
[HH:MM:SS] Starting Evolution Cycle...
[HH:MM:SS] Running Self-Directed Improvement Cycle...
[HH:MM:SS] ✅ Evolution cycle completed: COMPLETED
[HH:MM:SS] ✅ Proposal proposal-123 APPROVED
[HH:MM:SS] Pattern stored in evolution memory
```

**Failure (Still Mock)**:
```
[HH:MM:SS] Starting Evolution Cycle...
[HH:MM:SS] Metrics Updated: {...}
```

---

## 🔄 Rollback Plan (If Issues)

### If Swarm Still Crashes

**Option 1: Revert to Mock Data**
```javascript
// In phase-7-evolution-dashboard.html, comment out real imports:
// import { DistributedComputeEvolution } from './distributed-compute-evolution.js';
// import { SelfDirectedImprovementCycleEngine } from './medical/intelligence/autonomous-evolution-cycles.js';
// ... etc.

// Uncomment mock classes at bottom of file
```

**Option 2: Use Shared Compute Only**
```javascript
// Change import back to shared compute:
import { DistributedCompute } from './distributed-compute.js';

// Keep real Phase 7 modules but use shared compute
// Risk: May still overload but allows manual testing
```

### If Phase 7 Doesn't Work

**Option 1: Check Module Exports**
```bash
# Verify Phase 7 modules export correctly
grep -n "export" c:/workspace/medical/intelligence/*.js
```

**Option 2: Check Import Paths**
```javascript
// Verify dashboard imports match actual file structure
// All imports should be: from './medical/intelligence/FILENAME.js'
```

**Option 3: Browser Console Check**
```javascript
// Open browser dev console
// Look for: "Failed to resolve module specifier" errors
// Look for: "is not a constructor" errors
```

---

## 📝 Deployment Checklist

- ✅ `distributed-compute-evolution.js` created
- ✅ `distributed-compute-evolution.js` deployed to IIS
- ✅ `phase-7-evolution-dashboard.html` updated with real imports
- ✅ `phase-7-evolution-dashboard.html` deployed to IIS
- ✅ `AGENT_COORDINATION/PHASE7_ISOLATION_WIRING.md` created
- ⏳ Test swarm with Phase 7 isolated
- ⏳ Verify no crashes when autonomous mode enabled
- ⏳ Document test results

---

**Status**: 🔧 READY FOR TESTING
**Next Action**: Test swarm UI with Phase 7 dashboard running

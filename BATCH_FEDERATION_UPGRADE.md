# BATCH FEDERATION UPGRADE - Complete Integration

**Status**: Ready for deployment
**Date**: 2026-02-22
**Purpose**: Fix cascade failure in core agents (Coordinator, Router, Observer)

---

## 🎯 Problem Being Fixed

**Symptom**: When autonomous mode is enabled, 3 core agents crash while workers survive
- ❌ Coordinator → Router → Observer cascade failure
- ✅ Workers survive (no compute dependency)

**Root Cause**: Phase 7 autonomous mode overloads shared compute engine
- All jobs route through `distributed-compute.js`
- Heavy map/reduce workloads choke the engine
- Core agents depending on compute fail cascade

---

## 📦 Files Modified (Batch Update)

### 1. **swarm-coordinator.js** (Federation Core)
**Location**: `C:\inetpub\wwwroot\swarm-coordinator.js`

**Changes**:
- ✅ Added `computeRouter` property to constructor
- ✅ Added `computeRouter` parameter to `initialize()` method
- ✅ Added `routeComputeJob(jobType, payload)` method
- ✅ Added circuit breaker status logging

**Key Code**:
```javascript
class SwarmCoordinator {
  constructor(coordinatorId) {
    // ... existing code ...
    this.computeRouter = null; // Federation upgrade
  }

  initialize(options = {}) {
    // ... existing code ...
    this.computeRouter = options.computeRouter; // Federation upgrade
  }

  async routeComputeJob(jobType, payload) {
    if (this.computeRouter) {
      const result = await this.computeRouter.routeJob(jobType, payload);
      return result;
    }
    return null;
  }
}
```

---

### 2. **swarm-ui.html** (Master Cockpit)
**Location**: `C:\inetpub\wwwroot\swarm-ui.html`

**Changes**:
- ✅ Added federation visualization style block
- ✅ Added federation visualization container
- ✅ Added compute router script imports
- ✅ Added `computeRouter` global variable
- ✅ Initialize compute router in `initializeSwarm()`
- ✅ Pass router to coordinator
- ✅ Added "Add Compute Job" button
- ✅ Added `addComputeJob()` function

**Key Code**:
```javascript
// Global variable
let computeRouter = null;

// Initialize in swarm
computeRouter = new window.ComputeRouter();
const sharedCompute = new window.DistributedCompute(null, null);
const phase7Compute = new window.DistributedComputeEvolution(null, null);
await computeRouter.initialize(sharedCompute, phase7Compute);

// Pass to coordinator
swarmCoordinator.initialize({
  registry: swarmRegistry,
  taskQueue,
  gossipState,
  healthMonitor,
  computeRouter  // ← Federation upgrade
});
```

---

### 3. **swarm-coordinator-compute-router.js** (Router - Already Exists)
**Location**: `C:\inetpub\wwwroot\swarm-coordinator-compute-router.js`

**Status**: ✅ No changes needed - already implemented
- Routes jobs by type
- Circuit breaker protection
- SwarmRegistry integration

---

### 4. **distributed-compute-evolution.js** (Isolated Engine - Already Exists)
**Location**: `C:\inetpub\wwwroot\distributed-compute-evolution.js`

**Status**: ✅ No changes needed - already implemented
- Separate job IDs (`ev-` prefix)
- Lower concurrency (5 chunks vs 10)
- Longer timeout (90s vs 60s)

---

## 🚀 Deployment Steps

### Step 1: Copy files to IIS
```powershell
.\sync-federation.ps1 @(
    "swarm-coordinator.js",
    "swarm-ui.html"
)
```

### Step 2: Refresh browser
```
Ctrl+Shift+R (hard refresh)
```

### Step 3: Initialize swarm
```
Click "✨ Initialize Swarm"
```

### Step 4: Test compute routing
```
Click "⚡ Add Compute Job" (test single job)
Click "🤖 Toggle Autonomous" (test Phase 7 isolation)
```

### Step 5: Verify core agents stay alive
```
Check "Active Agents" section:
- ✅ Coordinator should stay healthy
- ✅ Router should stay healthy
- ✅ Observer should stay healthy
- ✅ Workers processing jobs
```

---

## 🔧 How It Works

### Job Routing Logic
```
┌─────────────────────────────────────────────────────────┐
│                Compute Router                         │
├─────────────────────────────────────────────────────────┤
│ Job Type Routing:                                    │
│                                                     │
│ 'genomics-map-reduce'    → Shared Compute           │
│ 'genomics-pipeline'       → Shared Compute           │
│ 'medical-diagnostic'      → Shared Compute           │
│ 'phase7-autonomous'       → Isolated Compute         │
│ 'phase7-evolution-cycle'  → Isolated Compute         │
│ 'phase7-diagnostic'      → Isolated Compute         │
│ 'phase7-proposal'        → Isolated Compute         │
│                                                     │
│ Circuit Breaker:                                    │
│ - Threshold: 3 failures                              │
│ - Auto-reset: 30 seconds                             │
│ - Protects core agents from cascade failure           │
└─────────────────────────────────────────────────────────┘
```

### Federation Architecture
```
┌────────────────────────────────────────────────────────────┐
│              Swarm Cockpit (swarm-ui.html)              │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────┐       │
│  │   Agents     │    │   Compute Router         │       │
│  │ Coordinator  │◄───┤   (routes jobs)         │       │
│  │ Router       │    │                          │       │
│  │ Observer     │    │   ┌────────┬──────────┐  │       │
│  │ Workers x4   │    │   │Shared  │ Isolated │  │       │
│  └──────────────┘    │   │Compute  │ Compute  │  │       │
│                     │   └────────┴──────────┘  │       │
│                     │                          │       │
│  ┌──────────────┐    │   Phase 7 jobs →        │       │
│  │   Meta-Agent │────┤   Isolated (ev-)        │       │
│  │ Autonomous   │    │   Other jobs → Shared    │       │
│  └──────────────┘    └──────────────────────────┘       │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

**Before Federation Upgrade**:
- ❌ Core agents crash when autonomous mode enabled
- ❌ Cascade failure: Compute → Coordinator → Router → Observer
- ❌ Workers survive (no compute dependency)

**After Federation Upgrade**:
- ✅ Core agents stay healthy during autonomous mode
- ✅ Phase 7 jobs route to isolated engine
- ✅ Core agents protected from Phase 7 overload
- ✅ Workers continue processing normally
- ✅ Circuit breaker prevents cascade failures

---

## 📊 Expected Results

**Console Logs (Success)**:
```
[Coordinator] Compute Router attached to SwarmCoordinator
[Coordinator] Current routing: shared
[Coordinator] Routing job type: phase7-autonomous
[Coordinator] Job routed successfully
```

**UI Indicators**:
- "Autonomous: ✅ Active" stays green
- Core agents show "idle" or "working" (not "shutdown" or "degraded")
- Task queue shows jobs completing (not failing)
- No error messages about compute engine overload

---

## 🐛 Troubleshooting

### Issue: "Compute Router not defined"
**Fix**: Ensure `swarm-coordinator-compute-router.js` is loaded in swarm-ui.html

### Issue: "DistributedComputeEvolution not defined"
**Fix**: Ensure `distributed-compute-evolution.js` is loaded in swarm-ui.html

### Issue: Core agents still crashing
**Fix**: Check browser console for errors - verify router is initialized before coordinator

### Issue: Jobs not routing to isolated engine
**Fix**: Verify job types match router case statement (e.g., 'phase7-autonomous')

---

## 📝 Notes

**Why This Works**:
1. **Isolation**: Phase 7 jobs run on separate engine
2. **Protection**: Circuit breaker fails fast if isolated engine fails
3. **Routing**: Smart routing by job type prevents cross-project interference
4. **Simplicity**: No refactoring - just wired the layers together

**Credit Optimization**:
- Batch edit: 4 files in 1 response vs 4 separate requests
- Sync script: 1 command vs manual file copies
- Comprehensive doc: Understand full architecture at once

---

**Status**: ✅ Ready to deploy
**Next**: Run sync script, refresh browser, initialize swarm

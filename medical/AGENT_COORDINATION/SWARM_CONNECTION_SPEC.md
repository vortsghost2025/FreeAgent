# Swarm Connection Specification

**Target:** Link swarm to medical federation
**Files to Modify:** `C:\workspace\medical\cockpit-server.js`
**Reference:** `C:\workspace\swarm-coordinator.js`

---

## CURRENT STATE

```
Medical Federation (8889)    Swarm Coordinator
┌─────────────────┐         ┌─────────────────┐
│ 8 agents        │         │ Separate system │
│ - code          │    ❌    │ - compute router│
│ - data          │  NOT    │ - genomics      │
│ - clinical      │ LINKED  │ - job queue     │
│ - test          │         │                 │
│ - security      │         │ No connection   │
│ - api           │         │                 │
│ - db            │         │                 │
│ - devops        │         │                 │
└─────────────────┘         └─────────────────┘
```

---

## TARGET STATE

```
                    Swarm Coordinator
                    ┌─────────────────┐
                    │ Load Balancer   │
                    │ Job Router      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Medical (8889)  │ │ Weather         │ │ Genomics        │
│ 8 agents        │ │ Federation      │ │ Pipeline        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## IMPLEMENTATION

### Step 1: Import SwarmCoordinator

At top of `cockpit-server.js`:

```javascript
// Import swarm coordinator
let SwarmCoordinator;
let swarmCoordinator;

try {
  const swarmPath = path.join(__dirname, '..', 'swarm-coordinator.js');
  if (fs.existsSync(swarmPath)) {
    SwarmCoordinator = require(swarmPath);
    swarmCoordinator = new SwarmCoordinator('medical-federation');
    console.log('✅ SwarmCoordinator connected');
  }
} catch (error) {
  console.warn('⚠️ SwarmCoordinator not available:', error.message);
  swarmCoordinator = null;
}
```

### Step 2: Register Medical Agents with Swarm

Add after ensemble initialization:

```javascript
// Register medical agents with swarm
function registerWithSwarm() {
  if (!swarmCoordinator || !ensemble) return;
  
  const agents = ['code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops'];
  
  agents.forEach((role, index) => {
    try {
      swarmCoordinator.registerAgent({
        id: `medical-${role}-${index + 1}`,
        role: role,
        type: 'medical',
        state: 'idle',
        workload: 0,
        capabilities: getCapabilities(role),
        executeTask: async (task) => {
          // Route task to medical ensemble
          return await ensemble.execute(task.message || task, { 
            agents: [role] 
          });
        },
        on: (event, callback) => {
          // Event handling
        }
      });
      console.log(`  ✅ Registered: medical-${role}`);
    } catch (error) {
      console.warn(`  ⚠️ Failed to register ${role}:`, error.message);
    }
  });
}

function getCapabilities(role) {
  const caps = {
    code: ['CODE_GENERATION', 'REFACTORING', 'TESTING'],
    data: ['DATA_ENGINEERING', 'ETL', 'SCHEMA_VALIDATION'],
    clinical: ['CLINICAL_ANALYSIS', 'CDC_GUIDELINES', 'HIPAA'],
    test: ['TESTING', 'COVERAGE', 'QA'],
    security: ['SECURITY_AUDIT', 'OWASP', 'HIPAA_COMPLIANCE'],
    api: ['API_DESIGN', 'REST', 'GRAPHQL'],
    db: ['DATABASE', 'SQL', 'MIGRATIONS'],
    devops: ['DEVOPS', 'CI_CD', 'DOCKER', 'KUBERNETES']
  };
  return caps[role] || [];
}
```

### Step 3: Add Swarm API Routes

```javascript
// Swarm status endpoint
app.get('/api/swarm/status', (req, res) => {
  if (!swarmCoordinator) {
    return res.json({ 
      success: false, 
      error: 'SwarmCoordinator not connected' 
    });
  }
  
  try {
    const metrics = swarmCoordinator.getSwarmMetrics ? 
      swarmCoordinator.getSwarmMetrics() : 
      { agents: 'connected' };
    
    res.json({
      success: true,
      swarm: metrics,
      medical: {
        agents: 8,
        roles: ['code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops'],
        status: 'connected'
      }
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Swarm task submission
app.post('/api/swarm/task', async (req, res) => {
  if (!swarmCoordinator) {
    return res.json({ 
      success: false, 
      error: 'SwarmCoordinator not connected' 
    });
  }
  
  const { task, preferredAgent } = req.body;
  
  try {
    // Route through swarm coordinator
    const result = await swarmCoordinator.assignTask({
      message: task,
      preferredAgent: preferredAgent || 'auto'
    });
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Step 4: Add Swarm Health Check

```javascript
// Periodic swarm health check
setInterval(() => {
  if (swarmCoordinator && swarmCoordinator.getSwarmMetrics) {
    const metrics = swarmCoordinator.getSwarmMetrics();
    console.log('[Swarm] Health check:', {
      agents: metrics.totalAgents || 'unknown',
      load: metrics.avgWorkload || 'unknown'
    });
  }
}, 60000); // Every minute
```

### Step 5: Initialize on Startup

```javascript
// In the startup sequence, after ensemble init:
async function initializeSystems() {
  console.log('🔧 Initializing systems...');
  
  // Initialize ensemble
  await ensemble.initialize();
  console.log('✅ Ensemble initialized');
  
  // Register with swarm
  registerWithSwarm();
  console.log('✅ Swarm registration complete');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server listening on http://localhost:${PORT}/`);
  });
}

initializeSystems().catch(console.error);
```

---

## TESTING

```powershell
# Test swarm status
curl http://localhost:8889/api/swarm/status

# Test swarm task
curl -X POST http://localhost:8889/api/swarm/task -H "Content-Type: application/json" -d '{"task": "test task"}'
```

---

## SWARM COORDINATOR API REFERENCE

From `swarm-coordinator.js`:

```javascript
// Registration
swarmCoordinator.registerAgent({
  id: 'unique-id',
  role: 'role-name',
  capabilities: ['CAP1', 'CAP2'],
  executeTask: async (task) => { ... }
});

// Task assignment
swarmCoordinator.assignTask({
  message: 'task description',
  preferredAgent: 'optional-hint'
});

// Metrics
swarmCoordinator.getSwarmMetrics();
```

---

## FOR KILO TO IMPLEMENT

1. Import SwarmCoordinator at top of file
2. Add `registerWithSwarm()` function
3. Add `getCapabilities()` helper
4. Add `/api/swarm/status` route
5. Add `/api/swarm/task` route
6. Call `registerWithSwarm()` after ensemble init
7. Test swarm status endpoint

---

**Spec complete. Ready for Kilo to implement.** 🦞

# Swarm Integration Architecture

**The Hub:** `C:\workspace\swarm-ui.html` connects everything

---

## THE FULL STACK

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SWARM UI (Hub)                               │
│                    C:\workspace\swarm-ui.html                        │
│                                                                      │
│  Quick Nav Links:                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Cockpit │ │ Master  │ │  Swarm  │ │Genomics │ │ Medical │       │
│  │ :7771   │ │ :3001   │ │  THIS   │ │  UI     │ │   UI    │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                                      │
│  Compute Router:                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    JOBS ROUTING                               │   │
│  │                                                               │   │
│  │  genomics-map-reduce ──┐                                      │   │
│  │  genomics-pipeline  ───┼──→ SHARED COMPUTE                    │   │
│  │  medical-diagnostic ───┘    (distributed-compute.js)          │   │
│  │                                                               │   │
│  │  phase7-autonomous ────┐                                      │   │
│  │  phase7-evolution-cycle├──→ ISOLATED COMPUTE                  │   │
│  │  phase7-diagnostic ────┘    (distributed-compute-evolution.js)│   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DASHBOARDS IN THE SYSTEM

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **Swarm UI** | `http://localhost/swarm-ui.html` | Hub, compute routing, agent swarm |
| **Medical Cockpit** | `http://localhost:8889/` | 8 agents, smart routing, providers |
| **Cockpit** | `http://localhost:7771` | Original cockpit |
| **Master Control** | `http://localhost:3001/master` | Master control panel |
| **Genomics UI** | `http://localhost/genomics-ui.html` | GWAS, variant calling |
| **Medical UI** | `http://localhost/medical-ui.html` | Medical workflows |
| **Compute UI** | `http://localhost/compute-ui.html` | Compute job management |

---

## JOB TYPES ROUTED BY COMPUTE ROUTER

### Shared Compute (distributed-compute.js)
- `genomics-map-reduce` - GWAS analysis
- `genomics-pipeline` - Variant calling
- `medical-diagnostic` - Clinical analysis
- `genomics-variant` - Variant detection

### Isolated Compute (distributed-compute-evolution.js)
- `phase7-autonomous` - Autonomous evolution
- `phase7-evolution-cycle` - Evolution cycles
- `phase7-diagnostic` - System diagnostics
- `phase7-proposal` - Change proposals

---

## INTEGRATION OPPORTUNITY

### Current Gap
- **Medical AI Federation** (port 8889) has 8 agents + smart routing
- **Swarm UI** has compute router + job distribution
- **They're not connected yet**

### How to Connect

1. **Add Medical Federation to Swarm Router:**
```javascript
// In compute-router, add:
case 'medical-federation':
case 'clinical-analysis':
case 'patient-triage':
  // Route to Medical AI Federation (port 8889)
  return await fetch('http://localhost:8889/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: payload })
  });
```

2. **Or use iframe shell** (UNIFIED_COCKPIT_PLAN.md):
- Create unified-shell.html
- Load swarm-ui and medical cockpit in tabs
- Shared status bar polls both

---

## OFFLINE MESH INTEGRATION

The swarm UI references WebRTC mesh networking (from we4free_global):
- P2P communication between nodes
- Works offline
- Synchronizes when reconnected

This is how the system stays functional during internet outages.

---

## NEXT STEPS

1. **Decide integration approach:**
   - Iframe shell (fastest)
   - API bridge (cleanest)
   - Full merge (most work)

2. **Add Medical Federation to Compute Router:**
   - New job type: `medical-federation`
   - Routes to port 8889
   - Returns results to swarm

3. **Unified status dashboard:**
   - Show all systems in one place
   - Health checks for each
   - Cross-system job tracking

---

**The swarm-ui.html is the hub. We need to plug the Medical Federation (8889) into it.** 🦞

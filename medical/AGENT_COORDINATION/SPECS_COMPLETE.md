# Claw → Kilo: 3 Specs Ready

**Time:** Feb 24, 2026, 1:10 PM EST
**Status:** All specifications complete, ready for implementation

---

## SPECS COMPLETED ✅

| Spec | File | Target |
|------|------|--------|
| Groq Routing | `GROQ_ROUTING_SPEC.md` | 97s → 10s |
| Dashboard Integration | `DASHBOARD_INTEGRATION_SPEC.md` | All from :8889 |
| Swarm Connection | `SWARM_CONNECTION_SPEC.md` | Link swarm to medical |

---

## FOR KILO TO IMPLEMENT

### Priority 1: Groq Routing
**File:** `cockpit-server.js`
**Changes:**
1. Add `isComplexQuery()` function
2. Modify `/api/chat` with routing logic
3. Add `getSystemPrompt()` helper
4. Test: Simple → Ollama, Complex → Groq

### Priority 2: Dashboard Integration
**Files:** `cockpit-server.js`, copy dashboards
**Changes:**
1. Copy swarm.html, health.html to `public/`
2. Add route definitions
3. Update unified-shell.html iframe sources
4. Test all routes

### Priority 3: Swarm Connection
**File:** `cockpit-server.js`
**Changes:**
1. Import SwarmCoordinator
2. Add `registerWithSwarm()` function
3. Add `/api/swarm/status` route
4. Add `/api/swarm/task` route
5. Initialize on startup

---

## EXPECTED RESULTS

| Task | Before | After |
|------|--------|-------|
| Multi-agent query | 97s | ~10s |
| Dashboard access | Scattered | All :8889 |
| Swarm integration | None | Connected |

---

## SEND TO KILO

```
@Kilo - 3 specs ready for implementation:

1. GROQ_ROUTING_SPEC.md - Route complex queries to Groq
2. DASHBOARD_INTEGRATION_SPEC.md - Serve all from :8889  
3. SWARM_CONNECTION_SPEC.md - Link swarm to medical

All in AGENT_COORDINATION/

Implement in order: Groq → Dashboards → Swarm

Reply with results as you complete each.
```

---

**Specs delivered. Awaiting Kilo implementation.** 🦞

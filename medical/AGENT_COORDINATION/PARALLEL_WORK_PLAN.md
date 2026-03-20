# Parallel Work Plan - Feb 24, 2026

**Mission:** Do all 3 tasks simultaneously
**Agents:** Claw + Kilo
**Coordinator:** Sean

---

## TASK ASSIGNMENTS

### 🟦 CLAW (Analysis + Planning)

**Task 1: Groq Routing Architecture**
- Analyze current multi-agent flow
- Design Groq routing logic
- Create complexity detection rules
- Document implementation steps for Kilo

**Task 2: Dashboard Integration Plan**
- Map all dashboard files
- Design URL structure for :8889
- Plan route additions
- Document for Kilo to implement

**Task 3: Swarm Connection Design**
- Analyze swarm-coordinator.js API
- Design medical integration points
- Plan registration flow
- Document for Kilo to implement

---

### 🟩 KILO (Implementation)

**After Claw documents, Kilo implements:**

1. **Groq Routing** (Priority 1)
   - Add complexity detection to `/api/chat`
   - Route 2+ agent queries to Groq
   - Test: 97s → ~10s

2. **Dashboard Routes** (Priority 2)
   - Add routes in `cockpit-server.js`
   - Move/serve dashboards from :8889
   - Test: All tabs work in unified shell

3. **Swarm Connection** (Priority 3)
   - Import swarm-coordinator
   - Register medical agents
   - Test: Swarm shows medical agents

---

## EXECUTION ORDER

```
┌─────────────────────────────────────────────────────────────┐
│ PARALLEL EXECUTION                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLAW NOW:                    KILO (after docs):            │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ Write Groq      │    →     │ Implement Groq  │          │
│  │ routing spec    │          │ routing         │          │
│  └─────────────────┘          └─────────────────┘          │
│                                                             │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ Write dashboard │    →     │ Add dashboard   │          │
│  │ integration plan│          │ routes          │          │
│  └─────────────────┘          └─────────────────┘          │
│                                                             │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ Write swarm     │    →     │ Connect swarm   │          │
│  │ connection spec │          │ to medical      │          │
│  └─────────────────┘          └─────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## DELIVERABLES FROM CLAW (Next 10 mins)

1. `GROQ_ROUTING_SPEC.md` - How to route to Groq
2. `DASHBOARD_INTEGRATION_SPEC.md` - Routes and file moves
3. `SWARM_CONNECTION_SPEC.md` - Integration points

---

## STARTING NOW

Claw begins writing specs. Sean relays to Kilo as each completes.

**Let's go.** 🦞

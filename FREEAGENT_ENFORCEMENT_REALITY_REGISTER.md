# FreeAgent Enforcement Reality Register

**Created:** 2026-04-28T07:59:57-04:00  
**Purpose:** Distinguish defined/planned/tested governance mechanisms from live enforcement.  
**Hard rule:** Nothing is marked **ENFORCED** unless there is a runtime call site, execution trace, blocked failure case, and bypass analysis.

| # | Control | Defined in | Tested? | Runtime hook exists? | Feature flag enabled? | Blocks failure? | Bypass surface | Status | Next proof needed |
|---|---------|------------|---------|----------------------|-----------------------|-----------------|----------------|--------|---------------------|
| 1 | Compact phenotype continuity gate | `COMPACT_PHENOTYPE_CONTINUITY_GATE_BRIEF.md` | Yes (decision table & hash determinism unit tests) | No | Disabled / none | No | Code path disabled; no integration to orchestration | Inert tested machinery | Runtime call site + gated opt-in proof + blocked failure demonstration |
| 2 | Periodic continuity probe | `COMPACT_CONTINUITY_IMPLEMENTATION_PLAN.md` | No | No | Disabled / none | No | N/A — not present | Planned only | Working probe implementation, schedule policy, integration test |
| 3 | FreeAgent governance headers | `AGENTS.md`, `SAFETY_INVARIANTS.md`, `docs/DUAL_VERIFICATION_PROTOCOL.md`, `docs/GOVERNANCE_LAYER_SPEC.md` | No | No | N/A | No | None (documentation only) | Documentation boundary (lattice remains supreme) | Ratification evidence showing headers match lattice definitions |
| 4 | Nexus Graph authority disclaimer | `docs/NEXUS_GRAPH_MODEL.md` | No | No | N/A | No | None (display layer only) | Display/meaning‑layer guard | Signed UI acknowledgment that graph ≠ authority (if UI is added) |
| 5 | Autonomous constraint discovery protocol | `AUTONOMOUS_CONSTRAINT_DISCOVERY_PROTOCOLFREEAGENT.md` | No | No | N/A | No | Manual review & lattice ratification | Candidate draft / non‑binding | Discovery → simulation → lattice ratification cycle; anti‑enforcement audit |

--

**Notes**
- **No entries are marked ENFORCED.**  All items are either documentation boundaries, planned mechanisms, or inert tested machinery.
- **Live enforcement surface remains empty** for the controls listed.
- **Bypass surface** describes how a control could be circumvented when not enforced (e.g., disabled code path, documentation‑only status).
- **Next proof needed** identifies the minimal evidence required before an item could be considered for enforcement.

--

*This register is documentation only. No runtime code, feature flags, or authority transfers are implied or performed.*
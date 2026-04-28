# Next Decisions — Post Phase 1

**Created:** 2026-04-28T00:16:36-04:00  
**Status:** Open — awaiting authorization

## H-01: Governance Source of Truth — DECIDED: Option D

**Decision:** Keep governance exclusively in the 4-lane lattice. Treat FreeAgent governance files (`AGENTS.md`, `SAFETY_INVARIANTS.md`, `DUAL_VERIFICATION_PROTOCOL.md`, `GOVERNANCE_LAYER_SPEC.md`) as operational guides for the FreeAgent runtime only. Constitutional authority remains with the lane lattice. In case of conflict, lattice rules prevail.

**Rationale:** Aligns with hard constraints (lane lattice is supra-repository authority; recency ≠ authority; file location ≠ authority). Avoids drift from copied governance and prevents conflation of runtime control with constitutional authority.

**Fallback (if lattice integration becomes too heavy):** Option B — extract a separate `governance-auth` repo as the canonical constitutional source. Not required at this time.

**What was done:**
- Added one-line clarification header to FreeAgent governance files.
- No governance files copied into extracted repos.
- No governance-auth repo created.

**Remaining open decisions:**

### 2. Nexus Graph ownership
- **DECIDED: Option C (split)**
- Spec/governance-depth model: self-organizing-library (lattice-facing docs). FreeAgent may hold non-authoritative reference; Deliberate may publish public explanation.
- Runtime visualization/UI: WE4Free mesh/public-site layer (`we4free_global/`, `we4free_website/`).
- The Nexus Graph is descriptive only. It does not confer constitutional authority. The 4-lane lattice remains the sole authority.
- Evidence linking: graph may link to evidence but is not evidence itself.
- UI disclaimer: "Nexus Graph visualizes document relationships and verification states. It does not grant constitutional authority. Enforcement is defined by the 4-lane lattice."
- Future: define `graph-data.json` (governance-depth fields) produced by mesh layer.

### 3. WE4Free extraction readiness
- Authorize Phase 2 for `we4free-mesh` and `we4free-web`? Pending coupling/deployment readiness review.

### 4. Medical extraction blocker
- Mandate PHI/synthetic-data audit before any move.

### 5. FreeAgent hardening
- Trust Layer V1 — prioritize?
- Active-blocker operationalization — implement?
- Path-standardization regression gate — add pre-commit?

## Constraints (hard)

- Do not begin Phase 2 without explicit authorization.
- Do not move files.
- Do not delete originals.
- Do not alter governance (no transfers, no copies into extracted repos).
- No package publishing (H-10: GitHub repos only).

## References
- PHASE1_EXECUTION_LOG.md — Phase 1 results and verification
- docs/DEPENDENCY_GRAPH.md — updated extraction status
- docs/EXTRACTION_READINESS_REPORT.md — Phase 1 closeout
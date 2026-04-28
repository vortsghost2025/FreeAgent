# Next Decisions — Post Phase 1

**Created:** 2026-04-28T00:16:36-04:00  
**Status:** Open — awaiting authorization

## Context
Phase 1 extraction (shared-infra, federation-creative, connection-bridge) is complete and remote-verified. No Phase 2 work is authorized.

## Open Decisions

### 1. Governance source of truth
- **Keep governance in FreeAgent?**
- **Extract governance-auth repo?**
- **Vendor governance into extracted repos?**

### 2. Nexus Graph ownership
- **Define as core protocol (freeagent-core)?**
- **Define as WE4Free mesh implementation (we4free-mesh)?**
- **Split: spec in core, runtime in mesh?**

### 3. WE4Free extraction readiness
- **Authorize Phase 2 for `we4free-mesh`?** (pending coupling fixes)
- **Authorize Phase 2 for `we4free-web`?** (pending coupling check)
- **Hold until governance decisions resolved?**

### 4. Medical extraction blocker
- **Mandate PHI/synthetic-data audit before any move.**
- **Authorize medical-demos extraction only after audit?**

### 5. FreeAgent hardening
- **Trust Layer V1 — prioritize?**
- **Active-blocker operationalization — implement?**
- **Path-standardization regression gate — add pre-commit?**

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
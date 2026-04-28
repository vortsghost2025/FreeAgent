# Compact Continuity Gate — Implementation Plan

**Created:** 2026-04-28T06:42:19-04:00  
**Purpose:** Plan implementation of the Compact Phenotype Continuity Gate. This is a **read-only planning document**; no runtime code or feature flag changes are made.

--

## 1. Proposed Modules

All modules are to be implemented as non‑enabled components behind a feature flag.

| Module | Path (suggested) | Role |
|--------|------------------|------|
| **continuity_hasher** | `core/continuity_hasher.js` | Deterministic hashing of compact snapshots and selected runtime state (SHA‑256). Must be platform‑independent. |
| **phenotype_compare** | `core/phenotype_compare.js` | Generate lightweight embeddings from memory substrate + task state; compute cosine similarity against last‑known‑good phenotype. |
| **continuity_probe** | `orchestrator/continuity_probe.js` | Orchestrates checks: calls hasher and comparator; evaluates decision table; writes structured log and evidence directory. |
| **gate_enforcement_hook** | `orchestrator/gate.js` | Blocks continuation on QUARANTINE/BLOCK; allows QUARANTINE_REVIEW only after operator approval and evidence entry. |
| **operator_alert** | `services/alert.js` | Concise alerting (stdout, file, optional lattice notification) on mismatch or escalation. |
| **evidence_logger** | `services/evidence_logger.js` | Writes `logs/continuity.jsonl` and creates dated evidence directories with canonical artifacts. |

--

## 2. Feature Flag Policy

- **Flag name:** `config.continuityGateEnabled` (default `false`).
- **Enablement:** Must be explicitly set to `true` by an operator after:
  1. Canonical evidence imported and indexed.
  2. Test suite passes.
  3. Operator sign‑off recorded.
- **Runtime behavior when disabled:** All modules are no‑ops; no enforcement or blocking occurs.
- **No automatic enablement:** Flag is never toggled automatically.
- **Audit:** Any change to the flag must be logged (who, when, reason).

--

## 3. Integration Points

- **Orchestrator startup:** If enabled, run initial continuity probe before accepting tasks.
- **Compact restore flow:** After a restore, invoke probe and gate enforcement before allowing resumed activity.
- **Manual continuity check script:** `scripts/continuity_check.js` — operator‑invoked, prints status and evidence path.
- **Periodic probe (future):** Configurable interval (default 5 min) — only active when flag enabled and tests passed.

--

## 4. Data Model

### Compact snapshot
- Canonical artifact (e.g., `PRE_COMPACT_SNAPSHOT.json`).
- Must contain deterministic fields for hashing (state root, version, timestamp, signature/hash).

### Runtime state
- Deterministic subset of in‑memory substrate needed for continuity (active task, risk tallies, memory vectors).
- Produced by hasher at probe time.

### Phenotype signature
- Embedding vector derived from memory + task state.
- Used for similarity comparison.

### Continuity probe
- Input: compact snapshot, runtime state, optional external challenge.
- Output: pass/fail, hash comparison, similarity score.

### Decision record
- JSON with fields: `status`, `compact_hash`, `runtime_hash`, `phenotype_similarity`, `evidence_path`, `action_taken`, `operator_alert`, `lattice_notification`.

### Evidence directory
- Path pattern: `data/memory/continuity/<ISO8601>/`
- Contents: `compact_snapshot.json`, `runtime_state.json`, `probe.log`, `decision.json`.

--

## 5. Test Plan

| Test | Goal | Success Criteria |
|------|------|------------------|
| Hash determinism | Same snapshot → same hash across runs/platforms | Hashes match within tolerance 0. |
| Mismatch quarantine | Authoritative mismatch triggers QUARANTINE and blocks resume | System quarantines; operator alerted; no automatic resume. |
| Advisory mismatch warning | Advisory-only mismatch logs WARN but does not block | No BLOCK/QUARANTINE from advisory alone. |
| Similarity thresholds | Phenotype similarity thresholds map to correct actions | 0.95+ → CONTINUE; 0.90–0.95 → QUARANTINE_REVIEW; <0.90 → BLOCK. |
| Override logging | QUARANTINE_REVIEW approvals are logged with evidence | Decision record includes approval and evidence path. |
| Fail‑closed behavior | When enabled and test fails, system does not continue | Automated tests verify gate blocks on mismatch. |

--

## 6. Rollback Plan

- **Immediate rollback:** Set `config.continuityGateEnabled = false`.
- **Bypass procedure:** Only allowed with evidence log entry and operator justification.
- **Evidence records:** Never delete evidence directories once created; they are append‑only audit artifacts.
- **Re‑enable:** Requires repeat of test suite and operator sign‑off.

--

## 7. Non‑Goals

- Do not enable the runtime gate at this time.
- Do not claim compact restore proves full continuity.
- Do not block live work or ongoing operations.
- Do not start Phase 2 extraction or any file moves.
- Do not implement feature flag changes.

--

## Next Steps

1. Import/index canonical compact/restore artifacts into repository (`evidence/compact-restore/`).
2. Create module skeletons (no logic) behind disabled flag.
3. Write unit and integration tests against imported artifacts.
4. Run test suite; obtain operator sign‑off.
5. Only then enable flag and activate enforcement.

--

*This plan describes future implementation. No runtime code is enabled and no feature flags are changed.*
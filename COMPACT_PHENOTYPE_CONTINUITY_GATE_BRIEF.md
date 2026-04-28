# Compact Phenotype Continuity Gate — Policy Brief

**Created:** 2026-04-28T06:32:41-04:00  
**Purpose:** Define how compact/restore becomes a mandatory fail-closed runtime gate. This is a **policy/documentation** brief only. No runtime code is enabled; no feature flags are activated.

--

## 1. Current Evidence

- No canonical runtime-enforcement artifacts (PRE_COMPACT_SNAPSHOT.json, COMPACT_RESTORE_PACKET.json, COMPACT_RESTORE_TEST_RESULTS.json, POST_COMPACT_AUDIT.json, COMPACT_CONTEXT_HANDOFF.md, CHECKPOINT_PRE_COMPACT_001.md, compact-restore-test.js) are committed in FreeAgent.
- External verified evidence exists and must be imported/indexed before implementing the gate. See `COMPACT_CONTINUITY_EVIDENCE_INDEX.md` for the full inventory and classification.
- Present in-repo items are operational modules or human continuity records:
  - `restore-manager.js` (runtime restoration module) — not test evidence.
  - `session_checkpoint.md`, `session_checkpoints.md` — external/human continuity records.
- `docs/MEMORY_SUBSTRATE_SPEC.md` and `docs/COMPACT_CONTINUITY_EVIDENCE_INDEX.md` provide context and evidence inventory.

The gate described below MUST NOT be enabled until canonical evidence is imported and tests pass.

--

## 2. Gate Contract

**Authoritative fields** (used for enforcement decisions):
- Compact snapshot cryptographic hash (e.g., SHA-256).
- Runtime state hash (deterministic derivation of active memory/task state).
- Continuity probe result (pass/fail from lattice or local challenge).
- Phenotype similarity score (embedding-based comparison against last-known-good).

**Advisory fields** (informational only):
- Human notes, summaries, and non-verified metadata.
- Non-deterministic timestamps, operator comments.

**Trigger points:**
- Agent start/resume from compact snapshot.
- Periodic continuity probe (configurable interval).
- External continuity challenge (operator or lattice request).

**Non-negotiables:**
- Compact restore does **not** prove full continuity.
- Resume is **never** allowed from summary text alone.
- Advisory fields are never authoritative.
- Authoritative mismatch always results in QUARANTINE/BLOCK (see decision table).
- Events must be logged accessibly (short status + evidence path) — do not bury in raw logs only.
- The gate must remain disabled by default (feature flag) until validation is complete and explicitly enabled.

--

## 3. Fail-Closed Decision Table

| Condition | Action | Override? | Notes |
|-----------|--------|-----------|-------|
| Authoritative mismatch (e.g., invalid compact snapshot signature) | **QUARANTINE** | No | Preserve state; operator required. |
| Continuity probe mismatch (challenge failure) | **QUARANTINE** | No | Active state considered corrupted. |
| Hash mismatch (compact vs runtime) | **ESCALATE** | No | Immediate operator/lattice alert. |
| Phenotype similarity ≥ 0.95 | **CONTINUE** | Yes (audit log) | Normal operation. |
| Phenotype similarity 0.90–0.95 | **QUARANTINE_REVIEW** | Yes (after review) | Requires operator approval + evidence logging. |
| Phenotype similarity < 0.90 | **BLOCK** | No | Do not resume; preserve quarantine. |
| Advisory mismatch only | **WARN / REVIEW** | Yes | Logged; does not block unless coupled with authoritative mismatch. |

Phenotype similarity metric: deterministic embedding comparison over memory substrate + task-state vector. Thresholds are initial guidance; may be tuned with evidence.

--

## 4. Required Log Format

**Machine-readable log** (`logs/continuity.jsonl`):
```json
{
  "ts": "2026-04-28T06:32:41-04:00",
  "event": "continuity_probe",
  "status": "QUARANTINE",
  "compact_hash": "sha256:...",
  "runtime_hash": "sha256:...",
  "phenotype_similarity": 0.92,
  "probe_result": "mismatch",
  "evidence_path": "data/memory/continuity/2026-04-28T06-32-41Z/",
  "operator_alert": true,
  "lattice_notification": true,
  "action_taken": "quarantined"
}
```

**Evidence directory** (`evidence_path` contents):
- `compact_snapshot.json` (copy of snapshot)
- `runtime_state.json` (state at probe)
- `probe.log` (raw probe output)
- `decision.json` (full decision record)

**Human-readable summary** (stdout + short file):
```
[CONTINUITY] STATUS=QUARANTINE similarity=0.92 evidence=data/memory/continuity/2026-04-28T06-32-41Z/
```

--

## 5. Minimum Viable Implementation Plan (Disabled by Default)

1. **Hasher module** (`core/continuity_hasher.js`): deterministic SHA-256 of compact snapshot + selected runtime state.
2. **Phenotype comparator** (`core/phenotype_compare.js`): lightweight embedding generation + cosine similarity against last-known-good.
3. **Continuity probe** (`orchestrator/continuity_probe.js`): runs on start and periodic interval; calls hasher + comparator; enforces decision table; writes structured log + evidence directory.
4. **Gate enforcement hook** (`orchestrator/gate.js`): blocks continuation on QUARANTINE/BLOCK; allows QUARANTINE_REVIEW only after operator approval.
5. **Operator alert** (`services/alert.js`): concise alert on mismatch (file + stdout) and optional lattice notification hook.
6. **Feature flag** (`config.continuityGateEnabled`): default `false`; gated behind explicit opt-in after validation.

All code must be merged behind the feature flag. No enforcement active until flag is set true following validation and operator sign-off.

--

## 6. Tests Needed

- Hash determinism: same snapshot → same hash across runs/platforms.
- Phenotype similarity stability: small deltas must not cause false positives/negatives.
- Fail-closed enforcement: mismatches must trigger QUARANTINE/BLOCK and prevent resume.
- Advisory-only mismatch: must not block when authoritative fields are consistent.
- Evidence logging: required fields present and parsable.
- Operator override safety: QUARANTINE_REVIEW cannot be bypassed without evidence entry.
- Feature flag default: gate must remain inactive by default.

--

## 7. What Not to Do

- Do **not** claim compact restore proves full continuity.
- Do **not** allow resume based only on summary text.
- Do **not** treat advisory fields as authoritative.
- Do **not** continue after authoritative mismatch under any automatic condition.
- Do **not** enable the gate by default before validation and operator sign-off.
- Do **not** bury compact recovery events only in raw logs — structured, accessible output is required.
- Do **not** tune thresholds without evidence and testing.

--

**Next steps (documentation-only):**
- Import/index canonical compact/restore artifacts into the repository.
- Update `COMPACT_CONTINUITY_EVIDENCE_INDEX.md` with imported artifacts and hashes.
- When ready to implement, gate implementation behind a feature flag and run the full test suite before enabling.

--

*This brief describes policy and future enforcement design. No runtime code is enabled.*
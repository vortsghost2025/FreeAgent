# Phase 9 Operational Guide

## System Overview

Phase 9 Autonomous Strategic Evolution Engine integrates all prior phases (8, C, A, D, B, E) into a unified decision-making system that autonomously manages architectural evolution cycles.

## Key Modes

### 1. STABILITY_FIRST
**When**: System experiencing mild degradation or approaching complexity bounds
**Thresholds**:
- MTTR max: 20s (strict)
- Risk tolerance: 0.2 (very low)
- Improvement min: 0.5% (accept any gain)
- Rollback freq max: 0.2 (intolerant of failures)
- Cycle duration: 120s (slow, deliberate)

**Log Signals**:
```
[Phase 9] Selected strategy: STABILITY_FIRST
[Phase C] Rolling improvement: +0.8% (above 0.5% minimum)
[Phase E] Policy strictness: HIGH
```

**When to Intervene**: If stability stays < 0.85 for 5+ consecutive cycles

### 2. PERFORMANCE_FIRST
**When**: System is healthy with strong improvement trend
**Thresholds**:
- MTTR max: 45s (permissive)
- Risk tolerance: 0.6 (medium-high)
- Improvement min: 5% (high bar for gains)
- Rollback freq max: 0.5
- Cycle duration: 60s (fast iteration)

**Log Signals**:
```
[Phase 9] Selected strategy: PERFORMANCE_FIRST
[Phase D] Quality scoring: EXCELLENT proposals prioritized
[Phase B] MTTR prediction: 25-35s acceptable range
```

**When to Intervene**: If improvement trend drops below 3% for 3+ cycles

### 3. RISK_AVERSE
**When**: Complexity approaching bound (>180/200)
**Thresholds**:
- MTTR max: 15s (very strict)
- Risk tolerance: 0.1 (minimal)
- Improvement min: 0.1% (accept stabilization)
- Rollback freq max: 0.1
- Cycle duration: 180s (very slow)

**Log Signals**:
```
[Phase 9] Selected strategy: RISK_AVERSE
[Phase 8] Architecture complexity: 185/200 (92% capacity)
[Watchdog] Drift rule: runaway_complexity warning
```

**When to Intervene**: If complexity crosses 190, manually initiate simplification

### 4. AGGRESSIVE_INNOVATION
**When**: System very healthy (<80 complexity, >0.95 stability, positive trend)
**Thresholds**:
- MTTR max: 60s (very permissive)
- Risk tolerance: 0.8 (high)
- Improvement min: 3%
- Rollback freq max: 0.6
- Cycle duration: 30s (rapid experimentation)

**Log Signals**:
```
[Phase 9] Selected strategy: AGGRESSIVE_INNOVATION
[Phase C] Oscillation rate: <0.3 (healthy)
[Phase A] Stability: 0.96+ consistently
```

**When to Intervene**: If any watchdog rule triggers, immediately switch to STABILITY_FIRST

### 5. RECOVERY_MODE
**When**: System degraded (stability < 0.65 OR MTTR > 60s OR rollbacks > 50%)
**Thresholds**:
- MTTR max: 10s (extremely tight)
- Risk tolerance: 0.05 (almost no risk)
- Improvement min: 0% (accept no change)
- Rollback freq max: 0.05 (no rollbacks allowed)
- Cycle duration: 300s (very slow recovery)

**Log Signals**:
```
[Phase 9] CRITICAL: Selected strategy: RECOVERY_MODE
[Phase E] Policy: CRITICAL strictness activated
[Watchdog] VIOLATION: long_term_degradation detected
```

**When to Intervene**: IMMEDIATE - investigate root cause. Recovery mode should only last 2-3 cycles

---

## Critical Logs to Monitor

### Good Health Signals
```
[Phase 9] next_action: SCHEDULE (normal operation)
[Phase C] Rolling improvement: PASSED (positive trend)
[Phase A] Drift analysis: No drifts detected
[Watchdog] Total violations: 0
[Phase E] Governance: well_calibrated
[Phase D] Quality report: EXCELLENT proposals > 50%
```

### Warning Signals (Investigate)
```
[Phase 9] next_action: PAUSE (check oscillation/stagnation reason)
[Phase C] Rolling improvement: FAILED (negative trend)
[Phase A] Drift analysis: IMPROVEMENT metric drifting
[Watchdog] VIOLATION: metric_gaming (declared vs observed gap > 20%)
[Phase E] Governance: overly_strict or overly_lenient
[Phase D] Quality report: Success rate < 60%
```

### Critical Signals (Act Immediately)
```
[Phase 9] next_action: ABORT (check consecutive rollbacks)
[Phase C] Oscillation rate: >0.4 (system thrashing)
[Phase 8] MTTR: >60s (degraded rollback capability)
[Watchdog] VIOLATION: runaway_complexity OR governance_collapse
[Phase E] Policy violations: >3 (governance broken)
```

---

## Cycle Lifecycle

### Phase 9 Cycle Execution
```
1. Readiness Check
   ├─ Rollback rate <= 0.6? [YES]
   ├─ Architecture consistency >= 0.85? [YES]
   └─ Metric drift detected? [NO]

2. Phase 8 Core Execution
   ├─ Scan architecture
   ├─ Register proposals
   ├─ Validate changes
   └─ Implement changes

3. Phase A: Record Telemetry
   ├─ Cycle snapshot
   ├─ Rollback traces
   ├─ Improvement provenance
   └─ Metric drift analysis

4. Phase C: Update Trends
   ├─ Record cycle metrics
   ├─ Validate rolling improvement
   ├─ Detect stagnation
   └─ Detect oscillation

5. Phase 9: Model Intent
   ├─ Compute vision alignment
   ├─ Decide trajectory
   └─ Detect conflicts

6. Phase 9: Select Strategy
   ├─ Evaluate system state
   ├─ Choose mode (5 options)
   └─ Record rationale

7. Phase 9: Check Autonomy
   ├─ Should pause? (oscillation/stagnation/violations)
   ├─ Should abort? (critical failures)
   └─ Should continue? (proceed to watchdog)

8. Phase 9: Watchdog Validation
   ├─ Over-optimization? [NO]
   ├─ Runaway complexity? [NO]
   ├─ Governance collapse? [NO]
   ├─ Oscillation loop? [NO]
   ├─ Metric gaming? [NO]
   └─ Long-term degradation? [NO]

9. Phase 9: Schedule Next
   ├─ If PAUSE: log reason, wait for manual intervention
   ├─ If ABORT: log reason, full system review required
   ├─ If CONTINUE: schedule next cycle (duration = strategy.cycle_duration_target)
   └─ Record next_cycle_scheduled_at
```

**Typical Good Cycle Duration**: 60-120s
**Typical Recovery Cycle Duration**: 300s
**Typical Aggressive Cycle Duration**: 30s

---

## Interpreting Full System Status

```javascript
orchestrator.getFullSystemStatus()
```

Returns:
```json
{
  "orchestrator": {
    "cycles_run": 47,
    "current_strategy": "PERFORMANCE_FIRST",
    "autonomous_mode": true,
    "next_cycle_scheduled": 1739783400000
  },
  "phase_8": {
    "completion_criteria": {
      "selfModelAccuracy": true,
      "changeSuccessRate": true,
      "improvementDemonstrated": true,
      "rollbackMTTR": true,
      ...
    }
  },
  "phase_c": {
    "trend_validation": {
      "passed": true,
      "gates": {
        "rollingImprovement": { "passed": true, "netImprovement": 8.5 },
        "stagnation": { "stagnant": false, "trend": 0.15 },
        "oscillation": { "oscillating": false, "changeCount": 1 },
        "rollbackFrequency": { "healthy": true, "rate": 0.18 }
      }
    }
  },
  ...
}
```

**Key Health Indicators**:
- `orchestrator.autonomous_mode`: true = system in self-management
- `phase_c.trend_validation.passed`: true = multi-cycle trends healthy
- `phase_a.observability`: Check for drift metrics
- `phase_9.watchdog_violations`: Should be 0

---

## Manual Interventions

### Switch Strategy (if auto-selection seems wrong)
```javascript
// Force STABILITY_FIRST even if system thinks PERFORMANCE_FIRST is better
orchestrator.strategy_selector.current_strategy = 'STABILITY_FIRST';
```

### Pause Autonomous Cycles
```javascript
orchestrator.autonomous_mode = false;
// Now cycles only run with explicit `runPhase9Cycle()` calls
```

### Check Watchdog Violations
```javascript
orchestrator.drift_prevention.getWatchdogStatus()
// Returns recent violations and rules being monitored
```

### Reset Quality Scoring (if proposals are stuck)
```javascript
orchestrator.quality_scorer.reset();
// Clears historical performance, starts fresh proposal evaluation
```

---

## Performance Baselines

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Rolling Improvement | >1% | 0-1% | <0% |
| MTTR | <30s | 30-45s | >60s |
| Oscillation Rate | <0.2 | 0.2-0.4 | >0.4 |
| Rollback Frequency | <0.3 | 0.3-0.5 | >0.6 |
| Quality Score (avg) | >70 | 50-70 | <50 |
| Complexity (%) | <70% | 70-90% | >90% |
| Architecture Consistency | >0.95 | 0.85-0.95 | <0.85 |
| Strategy Changes/100 cycles | 2-4 | 5-8 | >10 |

---

## Common Issues & Fixes

### Issue: System Stuck in STABILITY_FIRST
**Cause**: Improvement trend negative or near-zero for prolonged period
**Fix**:
1. Check Phase D quality scores - proposing low-quality changes?
2. Check Phase C trends - is oscillation still happening?
3. Manual intervention: verify architecture health, then reset quality scorer

### Issue: MTTR Keeps Exceeding Threshold
**Cause**: Rollback complexity too high OR inefficient rollback paths
**Fix**:
1. Phase B prediction will flag this (check MTTR forecast)
2. Reduce proposal complexity in Phase D filtering
3. Consider forcing RISK_AVERSE mode temporarily

### Issue: Watchdog Keeps Triggering "metric_gaming"
**Cause**: Declared improvements >> observed improvements
**Fix**:
1. Check proposals being selected (Phase D quality scores might be miscalibrated)
2. Phase E governance will start tightening policy automatically
3. If it persists, proposals are gaming metrics - review source subsystems

### Issue: System Won't Exit RECOVERY_MODE
**Cause**: Fundamental architecture problem OR cascading failures
**Fix**:
1. Likely requires human intervention - stability < 0.65 is critical
2. Review recent Phase 8 changes that caused degradation
3. Consider architectural rollback or circuit breaker

---

## Monitoring Dashboard (What to Watch)

Real-time metrics:
```
Phase 9 Strategy:        [PERFORMANCE_FIRST]
Rolling Improvement:     [↑ 8.4%] ✓
MTTR:                    [→ 18s] ✓
Oscillation Rate:        [↓ 0.15] ✓
Quality (avg):           [→ 82] ✓
Complexity:              [→ 65%] ✓
Watchdog Violations:     [0] ✓
Governance Status:       [well_calibrated] ✓
Next Cycle In:           [52s] ✓
```

Every 10 cycles, check:
```
Strategy History:        [PERF → PERF → PERF → PERF → PERF]
Phase C Trends:          [5 rolling windows, all > 0.5%]
Phase A Observability:   [No metric drift detected]
Phase D Quality Trend:   [Success rate 87%, trending up]
Proposal Lineage:        [Top subsystem: awareness-engine]
```

---

## Success Criteria

System is operating well if:
- ✅ Cycles run autonomously without intervention for 10+ cycles
- ✅ Rolling improvement stays > 0.5% across 3+ overlapping windows
- ✅ MTTR stays within strategy threshold
- ✅ No watchdog violations for 5+ cycles
- ✅ Strategy selection is deterministic for same state
- ✅ Governance self-assessment shows "well_calibrated"
- ✅ Quality scores improving over time (subsystem lineage learning)
- ✅ Architecture consistency > 0.95

If any of these fail, system needs investigation but this is **not** a crash - Phase 9 will self-pause or self-abort to prevent harm.

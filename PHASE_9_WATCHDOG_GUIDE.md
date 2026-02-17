# Phase 9 Watchdog Troubleshooting Guide

## Watchdog Overview

The Phase 9 Watchdog monitors 6 critical drift rules that detect system degradation, gaming, and collapse before they cause failures.

```
Rule 1: OVER_OPTIMIZATION     → Extreme MTTR masking hidden costs
Rule 2: RUNAWAY_COMPLEXITY    → Complexity growing too fast
Rule 3: GOVERNANCE_COLLAPSE   → Policy violations exceeding threshold
Rule 4: OSCILLATION_LOOP      → Direction changes too frequent (thrashing)
Rule 5: METRIC_GAMING         → Declared vs observed improvement gap
Rule 6: LONG_TERM_DEGRADATION → 5-cycle improvement trend declining
```

Each violation is tracked with root cause and recommended response.

---

## Rule 1: OVER_OPTIMIZATION

**What It Detects**:
```
TRIGGER:   mttr < 5s AND improvement_rate > 50%
MEANING:   System optimizing rollbacks so extremely that claimed improvements
           are suspiciously high (may indicate artificial metric inflation)
```

**Example Scenario**:
```
Cycle 42:  MTTR 3s, improvement +65%
Cycle 43:  MTTR 2s, improvement +72%
Cycle 44:  MTTR 1s, improvement +89% ← WATCHDOG VIOLATION

Watchdog: "This looks too good to be true. MTTR < 5s with >50% improvements
           suggests metrics are being manipulated."
```

**Root Causes**:
1. **Metric definition problem**: Improvement metric includes rollback speed (shouldn't)
2. **Proposal gaming**: Proposals optimizing for MTTR at expense of real architecture
3. **Measurement bias**: Only measuring fast paths, ignoring slow rollback scenarios

**What To Do**:

| Severity | Action |
|----------|--------|
| FIRST OCCURRENCE | Review latest proposals. Are they gaming MTTR? Check Phase D quality scores. |
| 2ND OCCURRENCE IN 10 CYCLES | Switch to RISK_AVERSE strategy immediately. This is a warning sign. |
| 3+ OCCURRENCES IN 20 CYCLES | CRITICAL: Audit improvement metric definition. May need to redefine what "improvement" means. |

**Fix Checklist**:
- [ ] Review Phase B predictions - are they flagging unrealistic MTTR?
- [ ] Check Phase D proposal stream - which subsystem is generating these?
- [ ] Verify Phase C trend analysis - is rolling improvement inflated?
- [ ] Read the proposals - are they actually improving architecture or just rollback speed?

**Recovery**:
```javascript
// If convinced it's false alarm
orchestrator.drift_prevention.violations = [];
// But check again next cycle - if triggered 2 more times, it's real

// If it's really happening
orchestrator.strategy_selector.current_strategy = 'RISK_AVERSE';
// Reduce risk tolerance and improvement-min threshold
```

---

## Rule 2: RUNAWAY_COMPLEXITY

**What It Detects**:
```
TRIGGER:   complexity_growth_rate > 0.20 (>20% per cycle)
MEANING:   Complexity increasing too fast. System approaching or may exceed bound.
```

**Example Scenario**:
```
Cycle 40:  Complexity 90/200 (45%)
Cycle 41:  Complexity 100/200 (50%)   [+11% growth]
Cycle 42:  Complexity 115/200 (57.5%) [+15% growth]
Cycle 43:  Complexity 135/200 (67.5%) [+17% growth] ← WATCHDOG VIOLATION

Watchdog: "Complexity growing at 17%+ per cycle. In 2 cycles you'll hit
           90% capacity. In 4 cycles you'll exceed bound."
```

**Root Causes**:
1. **Proposals adding too many interfaces/components**: Phase D not penalizing complexity enough
2. **No simplification cycles**: Evolution always adding, never removing
3. **Architectural tax not modeled**: Proposals don't account for compound complexity

**What To Do**:

| Severity | Action |
|----------|--------|
| FIRST OCCURRENCE | Review proposals in pipeline. Are they all adding complexity? |
| GROWTH RATE 20-30% | Switch to RISK_AVERSE strategy. Reduce improvement-min threshold. |
| GROWTH RATE >30% | CRITICAL: Switch to forced SIMPLIFICATION mode. No new proposals until complexity < 70%. |
| WATCH FOR NEXT 3 CYCLES | If growth continues, trigger system-wide architecture review. |

**Fix Checklist**:
- [ ] Check complexity deltas on proposals being selected
- [ ] Phase D: Are we penalizing complex proposals enough?
- [ ] Phase C: Is rolling window capturing this trend?
- [ ] Phase 9: Have we considered forcing simplification proposals?

**Recovery**:
```javascript
// Reduce proposals by complexity threshold
orchestrator.quality_scorer.maxAcceptableComplexity = 20; // was 50

// Or force lower-complexity subsystems
orchestrator.quality_scorer.reduceComplexityWeighting();

// Or switch to simplification-focused strategy
// (Not auto-available, requires manual override)
orchestrator.strategy_selector.current_strategy = 'SIMPLIFICATION';
```

**Prevention**:
- Ensure Phase 8 proposals include simplification candidates
- Phase D should heavily penalize 50%+ complexity proposals
- Set complexity growth budget: Maximum +5% per cycle

---

## Rule 3: GOVERNANCE_COLLAPSE

**What It Detects**:
```
TRIGGER:   policy_violations > 3 (3+ violations in recent window)
MEANING:   System is repeatedly violating its own governance rules.
           Indicates governance rules are either broken or being ignored.
```

**Example Scenario**:
```
Cycle 40:  Violation: MTTR 35s > threshold 30s  [1 violation]
Cycle 41:  Violation: Risk 0.65 > tolerance 0.5 [2 violations]
Cycle 42:  Violation: No audit ref provided     [3 violations] ← WATCHDOG

Watchdog: "System has violated governance 3+ times. Rules are not being
           enforced or are too strict. Governance is collapsing."
```

**Root Causes**:
1. **Governance thresholds unrealistic**: Policy too strict for achievable system performance
2. **Phase E not adapting fast enough**: Thresholds should have auto-adjusted by now
3. **Bypass in code**: Someone (or Phase 9) is ignoring policy
4. **Cascading failures**: One violation enabled subsequent violations

**What To Do**:

| Severity | Action |
|----------|--------|
| FIRST VIOLATION | Investigate: Is threshold wrong or is system actually violating? |
| 2 VIOLATIONS | Likely threshold issue. Phase E should auto-adapt next cycle. Monitor. |
| 3+ VIOLATIONS | CRITICAL: Governance is broken. Manual intervention required. |

**Fix Checklist**:
- [ ] Review Phase E governance assessment
- [ ] Check adaptive thresholds - did they move at all?
- [ ] Verify MetaGovernanceEngine is being consulted (not bypassed)
- [ ] Is the violation real (actual problem) or false alarm (threshold too strict)?

**Recovery**:
```javascript
// If threshold is wrong
orchestrator.governance.adaptiveThresholds.mttrSeconds = 45; // was 30
orchestrator.governance.adaptiveThresholds.riskScoreMax = 0.65; // was 0.5

// If Phase E adaptation isn't working
orchestrator.governance.assess Governance();
orchestrator.governance.adaptThresholds({}, {
  recommendation: 'relax_thresholds'
});

// If governance engine itself is failing
orchestrator.governance = new MetaGovernanceEngine();  // Reset
```

**Prevention**:
- Phase E should auto-adapt within 1 violation (not wait for 3)
- Set escalation: If 2 violations in any 5-cycle window, auto-switch to STABILITY_FIRST
- Verify constitutional invariants are hard constraints (not soft policy)

---

## Rule 4: OSCILLATION_LOOP

**What It Detects**:
```
TRIGGER:   oscillation_rate > 0.30 (>30% direction changes)
MEANING:   Improvement trend keeps reversing (UP → DOWN → UP → DOWN...)
           System is thrashing, not converging.
```

**Example Scenario**:
```
Cycle 35:  improvement +3.2%  (↑)
Cycle 36:  improvement -1.5%  (↓)
Cycle 37:  improvement +2.8%  (↑)
Cycle 38:  improvement -0.9%  (↓)
Cycle 39:  improvement +4.1%  (↑)  ← 80% direction changes = OSCILLATION

Watchdog: "System is oscillating wildly. Up 3%, down 1.5%, up 2.8%, etc.
           This suggests unstable proposals or interaction effects."
```

**Root Causes**:
1. **Proposal interference**: Changes interact and cancel each other out
2. **Phase C trends: Conflicting proposals in same cycle**: Can't all be good
3. **Learning oscillation**: System learning mechanism overshooting/undershooting
4. **Architecture bifurcation**: System stuck between two stable states

**What To Do**:

| Severity | Action |
|----------|--------|
| OSCILLATION 30-40% | Review proposals from last 3 cycles. Are they conflicting? |
| OSCILLATION 40-50% | Switch to STABILITY_FIRST. Run 2 cycles in stabilization mode. Phase C will detect if better. |
| OSCILLATION >50% | CRITICAL: Pause autonomous cycles. System needs manual intervention (architectural decision). |

**Fix Checklist**:
- [ ] Review Phase D proposal quality - are conflicting proposals being selected together?
- [ ] Check Phase C rolling windows - did net improvement actually improve or just bounce?
- [ ] Phase B predictions - were they accurate or overshooting?
- [ ] Phase 8 changes - did they interact unexpectedly?

**Recovery**:
```javascript
// Reduce proposal selection in short-term
orchestrator.strategy_selector.current_strategy = 'STABILITY_FIRST';

// Run 2 cycles without innovation, just measurement
// This lets Phase C establish stable baseline

// Then gradually return to normal
// If oscillation re-appears, there's a fundamental architecture issue
```

**Prevention**:
- Phase D should flag proposals that conflict (interact poorly) with recent changes
- Phase C should require 2-cycle waiting periods before judging improvements (let system settle)
- Governance should auto-reduce improvement-min when oscillation detected (accept smaller moves)

---

## Rule 5: METRIC_GAMING

**What It Detects**:
```
TRIGGER:   declared_vs_observed_gap > 20%
MEANING:   Proposals claim X% improvement but deliver <X/5% observed improvement.
           Indicates proposals are exaggerating benefits.
```

**Example Scenario**:
```
Proposal 1 DECLARED:   +25% improvement expected
Proposal 1 OBSERVED:   +2% improvement actual improvement
GAP:                   +23% gap = VIOLATION

Watchdog: "Proposal claimed 25% improvement but delivered 2%. This is
           significantly off. Proposal quality metrics are incorrect."
```

**Root Causes**:
1. **Proposal estimation bias**: Proposals systematically overestimate improvements
2. **Missing interactions**: Proposals don't account for negative interactions
3. **Implementation deviation**: Promised improvement never gets coded
4. **Phase D miscalibration**: Quality scoring not penalizing poor predictors

**What To Do**:

| Severity | Action |
|----------|--------|
| GAP 20-30% | Review Phase D subsystem lineage. Which subsystem is over-estimating? |
| GAP 30-40% | Reduce that subsystem's quality score boost. Phase D will deprioritize them. |
| GAP >40% | CRITICAL: That subsystem's proposals should be blocked until they recalibrate. |

**Fix Checklist**:
- [ ] Identify which subsystem is generating the high-gap proposals
- [ ] Check Phase D lineage tracking - is success rate correct?
- [ ] Reduce quality boost for that subsystem
- [ ] Verify Phase B predictions are being checked against actual MTTR

**Recovery**:
```javascript
// Identify offending subsystem
const subsystemLineage = orchestrator.quality_scorer.getSubsystemLineage();
const worst = subsystemLineage[subsystemLineage.length - 1];

// Reduce its proposal weight
orchestrator.quality_scorer.recordProposalOutcome(
  'subsystem-' + worst.subsystem,
  'change-xyz',
  0,  // Assign 0 improvement credit for next reconciliation
  false,
  worst.subsystem
);

// Then monitor - if it improves its estimates, gradually restore weight
```

**Prevention**:
- Phase 9 should track declared vs observed over time per subsystem
- Penalize subsystems with >15% gap (not just 20%)
- Require subsystems to justify estimates (audit trail)

---

## Rule 6: LONG_TERM_DEGRADATION

**What It Detects**:
```
TRIGGER:   5_cycle_improvement_trend < -2
MEANING:   Over the last 5 cycles, improvement is declining. System may be
           approaching a point of stagnation or cascading failure.
```

**Example Scenario**:
```
Cycle 35:  improvement +5.2%
Cycle 36:  improvement +4.1%
Cycle 37:  improvement +2.8%
Cycle 38:  improvement +1.5%
Cycle 39:  improvement -0.3% ← Overall trend: -5.5 over 5 cycles = VIOLATION

Watchdog: "System improvement declining steadily. If trend continues,
           next cycles will show negative improvement. Investigate now."
```

**Root Causes**:
1. **Architecture reaching saturation**: All easy optimizations done
2. **Quality degradation feedback loop**: Proposals getting worse over time
3. **Governance too permissive**: Accepting proposals that create technical debt
4. **Phase 8 changes accumulating bad interactions**: Compound complexity without benefit

**What To Do**:

| Severity | Action |
|----------|--------|
| TREND -2 TO -3 | Switch to STABILITY_FIRST. Pause innovation. Stabilize. |
| TREND -3 TO -5 | CRITICAL: Switch to RECOVERY_MODE. Only implement simplification. |
| TREND < -5 | CRITICAL: Manual intervention. System may need architectural reset. |

**Fix Checklist**:
- [ ] Phase C: Is rolling improvement negative? (This confirms the problem)
- [ ] Phase D: Are proposal quality scores declining?
- [ ] Phase 8: Did a change introduce systemic cost?
- [ ] Phase E: Is governance selection threshold (rejection rate) too low?

**Recovery**:
```javascript
// Immediate: Switch strategy
orchestrator.strategy_selector.current_strategy = 'RECOVERY_MODE';

// Diagnostic: Check Phase D subsystem performance
const quality = orchestrator.quality_scorer.getQualityReport();
console.log(quality.subsystemLineage);  // Who's degrading?

// Remedial: Run simplification-only cycles
// (manually set proposals to simplification-only until trend turns around)

// Verification: Run 5 cycles, check new trend
// If still negative, escalate to manual architectural review
```

**Prevention**:
- Phase E should auto-switch to STABILITY_FIRST when trend < -0.5
- Phase C should alert after 3 consecutive declining cycles (before 5-cycle window)
- Governance should require "improvement reset" cycle every 20 cycles (validate assumptions)

---

## Watchdog Response Matrix

| Rule | Trigger | Yellow Alert | Red Alert | Escalation |
|------|---------|--------------|-----------|-----------|
| Over-Optimization | mttr<5 + improve>50% | Review metrics def | Switch RISK_AVERSE | Audit metric bias |
| Runaway Complexity | growth > 20%/cycle | Review proposals | Switch RISK_AVERSE | Forced simplification |
| Governance Collapse | violations > 3 | Check thresholds | Manual fix | Reset governance engine |
| Oscillation Loop | direction_chg > 30% | Review conflicts | Switch STABILITY | Pause & analyze |
| Metric Gaming | gap > 20% | ID subsystem | Demote subsystem | Block subsystem |
| Long-term Degradation | trend < -2 | Switch STABILITY | Switch RECOVERY | Manual intervention |

---

## Monitoring Watchdog Health

```bash
# Check watchdog status every 10 cycles
orchestrator.drift_prevention.getWatchdogStatus()

# Returns:
{
  "total_violations_history": 2,      # How many total violations lifetime
  "recent_violations": [...],          # Last 5 violations with details
  "rules_monitored": 6,                # All 6 rules active
  "active_alerts": 0                   # Violations in last hour
}
```

**Good** Watchdog State:
```
total_violations:  0-2 (very few)
recent_violations: []
active_alerts:     0
```

**Concerning** Watchdog State:
```
total_violations:  3-5 (some problems recently)
recent_violations: [metric_gaming, runaway_complexity]
active_alerts:     1-2
→ Investigate the 2 rules that triggered
```

**Critical** Watchdog State:
```
total_violations:  >5 (recurring issues)
recent_violations: [rule1, rule2, rule1, rule3, rule2]  (bouncing between rules)
active_alerts:     >2
→ System is degrading. Requires intervention.
```

---

## Quick Reference Cheat Sheet

```
PANIC              → What to do?
─────────────────────────────────────
MTTR skyrocketing  → Check Rule 1 (over-opt), Rule 3 (governance)
                   → Switch to STABILITY_FIRST

Complexity exploding → Check Rule 2 (runaway)
                   → Switch to RISK_AVERSE, force simplification

System oscillating  → Check Rule 4 (oscillation_loop)
                   → Reduce proposal rate, increase cycle duration

Proposals over-promising → Check Rule 5 (metric_gaming)
                   → ID subsystem, reduce its weight

Getting worse slowly → Check Rule 6 (long_term_degradation)
                   → Switch to STABILITY_FIRST, then RECOVERY_MODE

Multiple rules triggering → System is in distress
                   → Switch to RECOVERY_MODE immediately
                   → Manual intervention required within 3 cycles
```

---

## Knowing When to Trust vs Distrust Watchdog

**Trust Watchdog If**:
- Multiple rules triggering (not just one)
- Rule has been triggered >2 times in 20 cycles
- Phase 9 trends confirm (Phase C shows negative, Phase D shows declining quality)
- Visual inspection confirms (review proposals manually and see the problem)

**Distrust/Investigate Watchdog If**:
- Only one rule triggered once
- Phase trends don't confirm the problem
- Manual inspection of proposals shows they're fine
- Recent threshold changes might be causing false positives

**Always Verify By**:
1. Check Phase C trending (do trends confirm?)
2. Check Phase D quality (do scores confirm?)
3. Manual code review (read the proposals)
4. Check timestamps (did it happen after a specific change?)

If only watchdog says it and no other phase confirms, it's likely a false alarm. But investigate anyway - false alarms sometimes reveal subtle issues other phases miss.

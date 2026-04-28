# Safety Invariants

This file is an operational guide for the FreeAgent runtime. Constitutional governance resides in the 4-lane lattice. In case of conflict, lattice rules prevail.

This document defines the non-negotiable safety guarantees of the system.  
All future changes must preserve these invariants.

---

## 1. Global safety guarantees

- No live trading by default.
- Paper mode is the default execution context.
- Risk manager must approve every trade.
- Circuit breaker halts all activity when triggered.

---

## 2. Risk manager invariants

- Minimum position size must always be enforced.
- Daily loss must never exceed the hard cap.
- Max trades per session must be enforced.
- Only one open position allowed when configured.
- Minimum-only sizing must use the exact minimum size.
- Signal/win-rate validation must be respected unless in minimum-only mode.
- Stop-loss and take-profit behavior must remain unchanged.

---

## 3. Orchestrator invariants

- Daily loss limit rejection must activate the circuit breaker.
- Malformed agent responses must halt the system.
- Invalid market data must halt the system.

---

## 4. Executor invariants

- Session trade limits must be enforced.
- Position limits must be enforced.

---

## 5. Configuration invariants

- User config cannot weaken safety.
- Missing or invalid config must fail safe.
- Paper mode must be the default wiring.

---

## 6. Logging and monitoring invariants

- Logging must remain intact.
- Critical events must trigger alerts when configured.

---

## 7. Test suite invariants

All safety tests must remain green:

A: Minimum Position Size  
B: Max Daily Loss  
C: Max Trades Per Session  
D: One-Position Maximum  
E: Minimum-Only Sizing  
F: Risk-Limit Halt  
G: Unexpected Responses  
H: Stop-Loss Logic  
I: Logging Unchanged
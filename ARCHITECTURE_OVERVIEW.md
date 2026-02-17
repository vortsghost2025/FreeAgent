# Architecture Overview

This document provides a high‑level map of the system.  
It describes the major components, how they interact, and the guarantees each part provides.

---

## 1. Core Components

### Agent
- Generates decisions, summaries, and operational reasoning.
- Operates within strict safety and validation boundaries.
- Never executes trades directly.

### Orchestrator
- Central coordinator of the system.
- Receives agent output and validates it.
- Routes decisions to the risk manager and executor.
- Enforces safety gates and halts the system on violations.

### Risk Manager
- Validates every proposed action.
- Enforces minimum sizing, max loss, session limits, and position rules.
- Rejects unsafe or malformed decisions.
- Acts as the final authority before execution.

### Executor
- Handles actual trade placement (paper mode by default).
- Enforces session limits and position constraints.
- Communicates with the exchange interface.

### Data Feeds
- Provides market data to the agent and orchestrator.
- Must fail safe on missing or invalid data.

### Configuration System
- Loads user settings.
- Must never weaken safety.
- Defaults to paper mode.

### Logging and Monitoring
- Records all decisions, validations, and executions.
- Critical events must be logged consistently.
- Supports debugging and post‑session analysis.

### Test Suite
- Validates safety invariants.
- Ensures behavior remains stable across changes.
- Must remain fully green before any deployment.

---

## 2. Component Interaction Flow
Agent → Orchestrator → Risk Manager → Executor → Exchange (paper mode)

Supporting flows:
- Data feeds → Agent + Orchestrator
- Config → All components
- Logging → All components

---

## 3. Responsibilities and Guarantees

### Agent
- Produces structured decisions.
- Never bypasses safety.
- Must tolerate missing or partial data.

### Orchestrator
- Validates agent output.
- Enforces safety gates.
- Halts on malformed or unsafe instructions.

### Risk Manager
- Enforces all risk rules.
- Guarantees no unsafe trade reaches execution.

### Executor
- Executes only validated actions.
- Respects session and position limits.
- Defaults to paper mode.

### Data Feeds
- Must not produce invalid or corrupted data.
- Must fail safe.

### Configuration
- Cannot disable safety.
- Must validate all fields.

### Logging
- Must capture all critical events.
- Must remain intact across updates.

---

## 4. Trade Lifecycle

1. Market data arrives.
2. Agent generates a proposed action.
3. Orchestrator validates structure and intent.
4. Risk manager applies all safety rules.
5. Executor performs the action (paper mode).
6. Logging records the full lifecycle.
7. Monitoring tracks session state.

---

## 5. Safety Anchors

- All components must preserve the invariants defined in `SAFETY_INVARIANTS.md`.
- No module may weaken or bypass safety rules.
- Any violation triggers a halt.

---

## 6. System Philosophy

- Safety first.
- Predictable behavior.
- Clear boundaries between components.
- Human‑controlled execution.
- Transparent logs and reasoning.

---

## 7. Meta-Cognitive Layer (Phase 8)

Phase 8 adds self-architecture capabilities on top of existing safety gates:

- **Meta-Cognitive Awareness**
: `medical/intelligence/meta-cognitive-awareness.js`
- **Autonomous Architectural Evolution**
: `medical/intelligence/autonomous-architectural-evolution.js`
- **Meta-Learning Optimization**
: `medical/intelligence/meta-learning-optimizer.js`
- **Introspective Validation & Meta-Governance**
: `medical/intelligence/introspective-validation.js`
- **Self-Architecture Orchestrator**
: `medical/intelligence/self-architecture-orchestrator.js`

Core guarantees in this layer:

- Constitutional compliance remains mandatory for all self-changes.
- Architectural changes must be reversible and auditable.
- Performance impact is bounded and tracked.
- Rollback MTTR and architectural improvement metrics are enforced in completion criteria.

Primary validation command:

```bash
node test-phase-8-all.js
```

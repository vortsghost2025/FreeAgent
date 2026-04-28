# Testing

## Overview

This document describes how to run tests for the FreeAgent project. Tests are provided for core modules, agents, continuity decision machinery, and federation components.

## Prerequisites

- Python (for agent/unit tests)
- Node.js (for JavaScript tests)
- Any test framework dependencies (e.g., pytest, Jest) should be installed via the project's package managers.

## Running Tests

### Python Tests

For agent and core Python modules:

```bash
pytest tests/
```

### JavaScript/Node Tests

For continuity decision and utility modules:

```bash
npm test
# or, if Jest is used:
npx jest
```

### Continuity Decision Tests

The inert continuity decision machinery has its own tests:

```bash
npm test -- tests/decision_table.test.js
npm test -- tests/hash_determinism.test.js
```

These verify decision table mappings and hash determinism.

## What Is Tested

- Agent orchestration basics
- Risk and execution logic (paper trading mode)
- Continuity decision tables (inert)
- Hash determinism for snapshots
- Federation and mesh utilities (where present)

## Notes

- The continuity gate is **inert** and **not enabled** in runtime. Tests validate decision logic only.
- No Phase 2 features are tested.
- Test results should be reviewed before enabling any runtime enforcement features.

## Adding Tests

- Add tests for new functionality in the appropriate `tests/` subdirectory.
- Keep tests fast and deterministic.
- Update this document if new test suites are added.

--

*Last updated: 2026-04-28*
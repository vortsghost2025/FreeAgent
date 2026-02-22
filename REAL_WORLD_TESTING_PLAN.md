# Real-World Testing Plan - Federation Game

## Overview
This document outlines the strategy for testing the Federation Game platform
outside of synthetic unit tests, including multiplayer sessions, physical
environments, and edge cases found only in real-world conditions.

## Test Environment Categories

### 1. Single-Device Testing (Baseline)
**Goal**: Verify all game phases work end-to-end on a single machine.

**Test Suite**: Run all existing automated tests first.
```bash
cd uss-chaosbringer
python test_anomaly_engine.py       # Phase VII: 40 tests
python test_federation_game_console.py  # Console: 10 tests
python test_mesh_federation_network.py  # Phase VIII: 36 tests

cd ..
python test_phase_ix_narrative.py   # Phase IX: 11 tests
python test_phase_x_politics.py     # Phase X: 16 tests
python test_phase_xi_persistence.py # Phase XI: 9 tests
```

**Manual Verification**:
- [ ] Run `python run_game.py` and play 5 turns
- [ ] Run `python demo_federation_complete_game.py` to completion
- [ ] Open `federation_dashboard.html` and verify all gauges animate

### 2. Local Network Multiplayer (2-4 devices)
**Goal**: Test Phase VIII mesh federation with real devices.

**Setup**:
- All devices on same WiFi network
- Each runs `python run_game.py --mesh-mode`
- One device is FEDERATION_NODE, others are GAME_NODE

**Test Cases**:
```
TC-LAN-01: Node discovery on local network
  - Start device A as host
  - Start device B as peer
  - Verify NodeInfo exchange within 5 seconds

TC-LAN-02: Game state synchronization
  - Device A takes a turn (quest accepted)
  - Verify device B receives GAME_STATE_SYNC within 2 seconds
  - Check conflict resolution if simultaneous moves

TC-LAN-03: Network partition recovery
  - Disconnect device B from WiFi for 30 seconds
  - Reconnect
  - Verify vector clock reconciliation

TC-LAN-04: Performance with 4 players
  - 4 devices active simultaneously
  - Verify routing via MeshRoutingEngine (Dijkstra)
  - Target: < 200ms latency for state sync
```

### 3. Stress Testing
**Goal**: Identify breaking points before public release.

**Automated Load Tests**:
```python
# Generate 1000 game turns programmatically
from federation_game_console import FederationConsole
console = FederationConsole()
for i in range(1000):
    console.process_turn()  # Should not OOM or crash

# Persistent Universe: 100 timeline branches
from persistent_universe import UniverseState
u = UniverseState("stress-test")
for i in range(100):
    u.create_branch(f"branch_{i}", from_turn=i)
u.validate_universe_integrity()  # Should pass
```

**Memory Profiling**:
- Target: < 500MB RAM after 1000 turns
- Use `memory_profiler` or `tracemalloc` to track leaks
- Consciousness engine (morale/identity/anxiety) should not accumulate unbounded state

### 4. Edge Case Scenarios
**Goal**: Find failures that only appear in unusual game states.

| Scenario | Expected Behavior | Priority |
|---|---|---|
| All factions go to war simultaneously | `PoliticalSystem` handles multi-war without deadlock | HIGH |
| Universe save file corruption | `UniverseState.validate_universe_integrity()` catches and reports | HIGH |
| Dialogue engine called with empty context | `DialogueGenerator` returns fallback text, no crash | MEDIUM |
| Mesh node disconnects mid-sync | `ConflictResolutionEngine` applies TIMESTAMP_BASED strategy | HIGH |
| 0 resources remaining | Quest system gracefully handles depletion | MEDIUM |
| Turn counter overflow (> 10,000) | All turn-based systems handle large integers | LOW |

### 5. User Acceptance Testing (UAT)

**Target Testers**: 3-5 people unfamiliar with the codebase

**Session Protocol**:
1. Provide `QUICKSTART.txt` only (no additional help)
2. Ask tester to play a 10-turn game
3. Record any confusion, errors, or unexpected behaviors
4. Collect feedback on narrative quality (Phase IX) and political intrigue (Phase X)

**Success Criteria**:
- Tester can start a game without help within 5 minutes
- No unhandled exceptions during normal play
- Narrative dialogue feels coherent and contextual
- Mesh multiplayer connects within 2 minutes on same network

### 6. Long-Running Stability Test

**Duration**: 72 hours continuous operation

**Setup**:
```bash
# Run the game server continuously
python run_game.py --daemon --log-file stability_test.log

# Run a bot player that takes turns every 60 seconds
python tools/start_boss_mode.py --auto-turns --interval=60
```

**Monitoring**:
- CPU usage should stay < 10% at idle
- Memory should not grow more than 50MB per 24 hours
- No crashes or unhandled exceptions in log

## Reporting

### Bug Report Template
```
Title: [Phase] Brief description
Severity: Critical / High / Medium / Low
Reproduce: Step 1, Step 2, Step 3
Expected: What should happen
Actual: What happened instead
Log output: (paste relevant lines)
Platform: Windows 11 / Python 3.10
```

### Test Results Dashboard
After each test run, update `test_results_history.json` with:
- Timestamp
- Pass/fail counts per test file
- Any new failures with reproduce steps
- Performance metrics (turn latency, memory usage)

## Key Files Under Test
- [federation_game_console.py](federation_game_console.py) - Core game engine
- [mesh_federation_network.py](uss-chaosbringer/mesh_federation_network.py) - P2P networking
- [dialogue_engine.py](dialogue_engine.py) - Phase IX narrative
- [political_system.py](political_system.py) - Phase X politics
- [persistent_universe.py](persistent_universe.py) - Phase XI persistence
- [run_game.py](run_game.py) - Entry point for all testing scenarios

---
*Created: 2026-02-22 | Federation Game Platform*

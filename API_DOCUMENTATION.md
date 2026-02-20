# API DOCUMENTATION

This document describes the public API for the major subsystems.

## Narrative Engine
- `generate(event_type, context)`
- `set_personality(personality)`

## Political System
- `negotiate(f1, f2, policy_type, delta)`
- `simulate_event(event)`

## Universe State
- `update(key, value)`
- `track_progression(milestone, data)`
- `save(filename)`
- `load(filename)`

## Mobile Extension
- `enable_offline()`
- `connect_mesh()`
- `sync()`
- `status()`

## See also
- ARCHITECTURE_GUIDE.md
- DEPLOYMENT_GUIDE.md

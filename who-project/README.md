WHO Project
============

Purpose
-------
This branch is a sandbox for building a WHO‑aligned ensemble toolkit. It contains modular components, docs, and tests intended for public‑good health applications.

Structure
---------
- core/        - core orchestration and shared utilities
- modules/     - reusable modules and domain logic
- agents/      - agent implementations and contracts
- ui/          - user interface or demo frontends
- api/         - API server / adapters
- data/        - sample datasets and ingestion scripts
- docs/        - architecture and onboarding docs
- tests/       - unit and integration tests

Getting started
---------------
1. Install dev tools: Node, npm, TypeScript, ESLint, Prettier
2. Run tests: `npm test` (once scaffolded)
3. Keep commits small and document every import from swarm projects

Contribution notes
------------------
- Keep sensitive or private artifacts in `workspace_private/` (gitignored)
- Document each folded-in module with its provenance and reason

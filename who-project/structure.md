Ensemble Roadmap — Folder Structure

Follow this structure when adding modules to `who-project`:

project-root/who-project
  core/
    orchestrator.js (or .ts)  # core orchestration
    utils/                    # shared helpers
  modules/
    ingestion/
    processing/
    analytics/
  agents/
    risk_manager/
    data_fetcher/
    monitor/
  ui/
    demo/
  api/
    adapters/
  data/
    samples/
  docs/
    architecture.md
    onboarding.md
  tests/
    unit/
    integration/

Recommended tools:
- ESLint, Prettier
- TypeScript (optional but recommended)
- Jest or Vitest for tests
- Git with small atomic commits

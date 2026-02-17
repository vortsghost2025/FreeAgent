# ENSEMBLE_RUNBOOK

Purpose: run multiple AI sessions safely with a human orchestrator.

## Core Model

- Session A: implementer (code changes)
- Session B: verifier (tests only)
- Session C: reviewer (risk + regression checks)
- Session D: integrator (merge/cherry-pick + release notes)

## Non-Negotiables

1. Single-writer rule: only one session edits a given file at once.
2. Branch isolation: each session works on its own branch.
3. Gate workflow: Plan -> Patch -> Test -> Report.
4. Evidence required for every claim.

## Branch Pattern

- `sess-a/<task>`
- `sess-b/<task>`
- `sess-c/<task>`
- `sess-d/<task>`

## Command Discipline

- Do not run stress loops in parallel with edits.
- Prefer deterministic test mode for flaky suites.
- Avoid chained destructive commands.

## Required Report Format (every run)

- Command:
- Exit code:
- Pass/fail summary:
- Changed files:
- Risks:

## Merge/Handoff Checklist

1. Rebase on target branch.
2. Re-run relevant tests.
3. Update `WORKLOCK.md` (release locks).
4. Post handoff note with next exact command.

## Crash Loop Response

1. Stop repeated reruns.
2. Capture last failing command and output.
3. Switch to single-run diagnostic mode.
4. Enable deterministic mode in test path if randomness exists.
5. Resume normal pipeline after 3 consecutive clean runs.


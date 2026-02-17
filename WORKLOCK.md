# WORKLOCK

Purpose: prevent collisions when multiple AI sessions edit the same repo.

## Rules

1. One writer per file at a time.
2. Claim lock before edit.
3. Release lock after commit or handoff.
4. Readers do not need locks.
5. If a lock is stale for more than 2 hours, mark `STALE` and re-claim.

## Active Locks

| Owner | Session | Branch | Files/Paths | Started (UTC) | Status | Next Step |
|---|---|---|---|---|---|---|
| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |

## Lock Template

Copy one row per active work item:

| Owner | Session | Branch | Files/Paths | Started (UTC) | Status | Next Step |
|---|---|---|---|---|---|---|
| your-name | sess-a | sess-a/phase6-3-fix | medical/intelligence/federated-learning-coordination.js | 2026-02-17T00:00:00Z | ACTIVE | patch + tests |

## Handoff Note Template

- Owner:
- Session:
- Branch:
- Last commit:
- Files touched:
- Tests run:
- Open risks:
- Next command:


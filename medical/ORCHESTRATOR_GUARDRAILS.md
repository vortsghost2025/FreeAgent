# Orchestrator Guardrails

## Files I Must NOT Edit

I am FORBIDDEN from modifying these files:
- `launcher.js` (main orchestrator - class-based state machine)
- `executor.js` / `core/SwarmExecutor.js` (trade execution)
- `pool-watcher.js` (opportunity finding)
- Any file in `core/` that handles state

## Why

I struggle with:
- Class-based state machines
- Async flow in orchestrators
- Cross-method state management
- Placing code in correct scopes

When I try to edit these, I often:
- Insert code in wrong scopes
- Break async flow
- Crash the bot

## What I CAN Do

- ✅ Review these files
- ✅ Check syntax
- ✅ Verify structure
- ✅ Modify documentation
- ✅ Create new helper scripts

## What To Do Instead

For orchestrator edits:
1. Make changes manually
2. Use a different model (Claude Sonnet, GPT-4)
3. Ask me to verify after

## How to Bypass (If Needed)

If you really need me to edit orchestrator files:
1. Run `node --check` after each change
2. Have me verify structure before running
3. Test in small increments

# REMOVED: sensitive data redacted by automated security cleanup
# Baseline Recovery Reference

Date: 2026-03-19

This document pulls together the historical reconstruction, the current launcher status, and the clean recovery path so we can stop depending on scattered notes.

## What We Proved

- There was a real historical trading path on Ethereum mainnet.
- The strongest verified window was late March 2, 2026 into March 3, 2026.
- The current MCP-orchestrated path in `LAUNCH_SEQUENCE.js` is not the same thing as that historical live path.
- The current solver layer in `core/mcp/solver-tools.js` still uses mocked opportunity and profit values, so its profit outputs are not safe to trust for live capital decisions.

## Wallet And Contract Map

- Funding / staging wallet: `REDACTED_ADDRESS`
- Historical trading wallet: `REDACTED_ADDRESS`
- Later signer / WETH-holding wallet: `REDACTED_ADDRESS`
- Active executor contract: `REDACTED_ADDRESS`
- Older contract seen in the repo history: `REDACTED_ADDRESS`

## Historical Timeline

- February 27, 2026:
  - first confirmed KuCoin funding into `0x3476...`
  - tx: `REDACTED_PRIVATE_KEY`
- March 2, 2026:
  - setup / funding / deployment activity
  - transition into real executor activity later that day
- Late March 2 into early March 3, 2026:
  - repeated successful `executeArbitrage(...)` calls from `0x29F7...` to `0x4FF5...`
  - repeated pattern of WETH going into the executor and USDC coming back out
- Later:
  - ETH and WETH moved from `0x29F7...` to `0xC649...`
  - after wallet exposure and key churn, the historical path and the current repo paths drifted apart

## Real Trade Evidence

Examples of real historical executor calls:

- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`

What those prove:

- the bot was not imagined
- direct executor transactions were really being sent
- token flow around those transactions looked like actual WETH -> executor -> USDC trading activity

What they do not prove by themselves:

- exact net profitability on every trade after gas and slippage

## Current Repo Reality

## Architectural Origin

The original architectural idea appears to have come from the same multi-agent orchestration pattern used in the Elasticsearch swarm project:

- warmed-up parallel agents
- shared communication layer
- persistent memory
- coordinated execution across multiple roles

That idea makes sense for MEV:

- one layer watches mempool and pools
- one layer scores opportunities
- one layer prepares execution parameters
- one layer handles submission timing and safety gates

What the repo shows today is a split between that architectural intention and what actually traded on-chain:

- the swarm / orchestration idea survived in the MCP and launcher documents
- the historical real trades most closely match the simpler direct wallet -> executor path
- the current orchestration branch drifted into a mix of real components and mocked solver outputs

So the parallel swarm-injection concept is likely the design origin, but it is not the path we should treat as the current live baseline.

## Watcher Branch

The watcher files belong to a separate but related branch of the system:

- mempool monitoring
- DEX activity detection
- cross-DEX opportunity discovery
- signal generation for a downstream executor

Representative files:

- `block-watcher.js`
- `websocket-watcher.js`
- watcher upgrade / explanation docs

What they are good for:

- understanding the intended discovery layer
- preserving the swarm / signal-generation side of the architecture
- explaining why the direct-wallet test harness would not see real arbitrage by itself

What they are not:

- proof of historical live execution on their own
- the same thing as the executor-contract path that actually appears on-chain

Best way to think about them:

- watcher branch = opportunity detection / orchestration side
- executor-contract branch = historical live execution side
- direct-router branch = safety/testing bypass side

## Setup / Runbook Branch

There is also a cluster of operator-facing setup and safety documents:

- `IDIOT_PROOF_SETUP.md`
- `IDIOT_PROOF_SECURITY.md`
- `SAFE_TO_PROCEED.md`
- related safety / checklist docs

What they are good for:

- key handling guidance
- startup/runbook guidance
- kill switch and dry-run operating procedures
- explaining how the "safe start" layer was supposed to reduce operator mistakes

What they are not:

- chain-backed evidence of what historically traded
- proof that every safety claim was fully true in production

Best way to think about them:

- setup/runbook branch = operator instructions and safety posture
- helpful for cleanup and onboarding
- separate from historical truth and separate from the live baseline itself

### Historical direct path

The files that best match the historical on-chain behavior are:

- `historical-baseline-launcher.js`
- `core/SwarmExecutor.js`
- `working-launcher.js`
- `abi/Executor.json`

This is the path to treat as the recovery baseline:

- `codex-route-recovery.js` (new wrapper script for non-visual workflow)

This script is now included as a convenience to run the safe recovery path from a single command:

```bash
cd C:\\Users\\seand\\OneDrive\\workspace\\_root\\mev-swarm-temp
npm run codex-recovery
```

- one signing wallet
- one executor contract
- direct wallet -> executor contract call flow

Current survivor decision:

- primary recovery executable: `historical-baseline-launcher.js`
- primary shared executor module: `core/SwarmExecutor.js`
- historical comparison file: `working-launcher.js`

Why:

- `historical-baseline-launcher.js` is the safest direct fit for the recovered baseline because it:
  - targets the deployed executor directly
  - verifies network, signer, balances, gas, and on-chain executor state
  - defaults to inspect mode instead of live execution
- `working-launcher.js` is historically important, but it still:
  - mixes discovery and execution in one file
  - assumes immediate live looping behavior
  - uses simplified opportunity logic that is not a clean recovery baseline

### Experimental / mixed path

These files are still useful for reference, but they should not be treated as the historical truth:

- `LAUNCH_SEQUENCE.js`
- `core/mcp/solver-tools.js`
- `simple-launcher.js`
- `launcher-v4-adaptive-final.js`
- `flashbots-executor.js`

Reason:

- this branch mixes real components with mocked or unfinished solver / orchestration behavior

## Baseline Launcher

Use:

- `historical-baseline-launcher.js`

Behavior:

- loads `.env` and `.env.local`
- uses the direct executor ABI through `core/SwarmExecutor.js`
- verifies network, signer, executor code, ETH balance, WETH balance, gas, and executor stats
- performs a lightweight live pool spread scan against the WETH/USDC Uniswap V2 and Sushi pools
- defaults to inspect-only mode
- only allows a live send if `BASELINE_EXECUTE=true`

This keeps the historical path available without accidentally trading while we are still stabilizing the system.

## Environment That Matters

- `MAINNET_RPC_URL` or `ETHEREUM_RPC_URL`
- `PRIVATE_KEY`
- `EXECUTOR_ADDRESS`
- optional:
  - `TEST_AMOUNT`
  - `MIN_NET_PROFIT`
  - `MAX_GAS_PRICE_GWEI`
  - `BASELINE_EXECUTE`

## Current Cautions

- The executor contract may still need separate funding depending on the strategy path.
- The current MCP solver path is still mocked.
- Historical trading activity is real, but that does not make the current codebase production-ready.
- No more money should move based on the mocked profit outputs from `LAUNCH_SEQUENCE.js`.

## About COMPLETE_PICTURE_FINAL.md

`COMPLETE_PICTURE_FINAL.md` looks like a shutdown-era diagnostic note written when you were close to the problem.

Parts that line up well with what we verified:

- there was a real trade path
- WETH wraps are operational steps, not losses by themselves
- there were contract calls that burned gas without establishing a clean proof of profit
- stopping the bot until the execution path was understood was the right move

Parts that should be treated more cautiously:

- the claim of exactly one clean profitable trade
- the exact net-profit math in ETH and dollars
- the specific root-cause claims about slippage, minOut, and stale pool data being the primary culprit

Why the caution matters:

- our verified reconstruction proves real executor activity and token movement
- it does not yet fully prove the exact PnL attribution written in that file
- it also does not prove those specific execution-parameter failures were the only reason the system went bad

Best way to treat that file:

- useful historical diagnosis
- likely close to the moment you shut it down
- not as authoritative as the chain-backed reconstruction documents

## About PATCH_APPLIED_DIRECT_WALLET_EXECUTOR.md

`PATCH_APPLIED_DIRECT_WALLET_EXECUTOR.md` looks like an earlier fix attempt on the direct wallet -> executor branch.

What lines up well with the current reconstruction:

- it focuses on the direct executor path, not the MCP path
- it identifies ETH/WETH handling confusion as a real problem area
- it adds WETH balance checks before execution
- it adds a net-profit guardrail before sending a trade

Why that matters:

- those are the same kinds of protections we would expect on the historical baseline
- they are much more relevant than the mocked solver outputs in `LAUNCH_SEQUENCE.js`
- it supports the idea that you had already zeroed in on the direct-wallet branch as the real place to fix things

Important caution:

- the note references `direct-wallet-executor.js`, while the current repo baseline we rebuilt is centered on:
  - `historical-baseline-launcher.js`
  - `core/SwarmExecutor.js`
  - `working-launcher.js`
- so the patch note is useful evidence of intent, but not necessarily proof that the current file set still contains that exact patched code path

Best way to treat that file:

- historical evidence that you had already found the right branch of the problem
- useful for identifying the kinds of guardrails that belong in the direct executor path
- supportive context, not sole source of truth

## About EXECUTOR_TEST_RESULTS.md

`EXECUTOR_TEST_RESULTS.md` appears to be the companion verification note for that same direct-wallet branch.

What is useful about it:

- it records a dry-run test on `direct-wallet-executor.js`
- it shows the historical trading wallet `0x29F7...` with both ETH and WETH at the time
- it reinforces the same three themes:
  - WETH contract initialization
  - correct WETH balance checks
  - net-profit guardrails before execution

Why that matters:

- unlike some of the MCP-oriented docs, this one is pointed at the same direct path that best matches the historical trades
- it also tells us `direct-wallet-executor.js` is not just a phantom reference in a note; it was a real branch that was being tested

Important distinction:

- `direct-wallet-executor.js` bypasses the executor contract and trades directly through the router
- the strongest historical on-chain pattern we reconstructed is wallet -> executor contract (`0x4FF5...`) -> token flows
- so `direct-wallet-executor.js` belongs to the same practical debugging family, but it is not the exact same runtime path as the historical executor-contract baseline

Important caution:

- the document still makes strong claims like "overnight losses are now impossible"
- those claims should be treated as optimistic verification notes, not final proof
- we have not yet revalidated that exact file end-to-end in the current repo state

Best way to treat that file:

- useful evidence that the direct-wallet executor branch had active fixes and dry-run validation
- relevant to cleanup decisions, because that branch should be preserved or compared before archiving anything

## About WATCHER_EXPLANATION.md

`WATCHER_EXPLANATION.md` is useful because it explicitly describes the watcher/executor separation.

What it helps clarify:

- the watcher branch was meant to scan multiple DEXes and generate arbitrage signals
- the direct-wallet executor was being used as a safety or harness path, not as the full cross-DEX arbitrage system
- there was a conceptual pipeline of:
  - watcher
  - solver
  - executor

Why it matters:

- this supports your memory that the swarm / warmed-up injection layer was supposed to feed execution
- it also explains why a single-path direct test harness could look "slow" or always unprofitable on its own

Important caution:

- the watcher documents describe intended architecture, not a full proof that watcher signals were correctly wired into the historical live contract path

Best way to treat that file:

- architectural context for the discovery layer
- useful for preserving the swarm-side branch during cleanup

## About EMERGENCY_RECOVERY.md

`EMERGENCY_RECOVERY.md` looks like a crash-era operational note for the watcher branch.

What it describes:

- zombie Node processes
- duplicate polling in `block-watcher.js`
- unbounded pending-transaction processing
- memory / RPC blow-up from watcher-side overload

Why it matters:

- it provides a plausible explanation for the crash/reset moment you remember
- it fits the watcher/discovery side of the system, not the executor-contract path itself
- it supports the idea that part of the system failure was operational instability in the swarm / watcher layer, not just bad trade math

Best way to treat that file:

- evidence of a real watcher-branch crash and emergency shutdown
- likely close to the point where the system became unstable enough to stop and reset
- important for the watcher branch, but not proof about direct trade profitability by itself

## About IDIOT_PROOF_SETUP.md

`IDIOT_PROOF_SETUP.md` is an operator runbook, not a reconstruction document.

What it is useful for:

- showing how you tried to simplify private-key handling
- documenting `.env.local`, `KILL_SWITCH`, and `SAFE_START_*` usage
- preserving the intended "safe startup" workflow for non-expert operation

What to be careful about:

- it uses strong language and absolute claims like "never" and "forever"
- those claims should be read as operating guidance, not audited guarantees
- it references a specific setup workflow that may have drifted from the current recovered baseline

Best way to treat that file:

- operator-facing setup guidance
- part of the setup/runbook branch
- useful to preserve, but not a source of historical truth

## Documents To Keep

- `BASELINE_RECOVERY_REFERENCE.md`
- `HISTORICAL_BASELINE_RECONSTRUCTION.md`
- `TIMELINE_FEB23_MAR04.md`
- `TRANSACTION_RECON_REPORT.md`
- `COMPLETE_PICTURE_FINAL.md` as a historical diagnostic note, not as sole ground truth
- `PATCH_APPLIED_DIRECT_WALLET_EXECUTOR.md` as evidence of a prior direct-executor fix attempt
- `EXECUTOR_TEST_RESULTS.md` as evidence of prior dry-run validation on the direct-wallet branch
- `WATCHER_EXPLANATION.md` as context for the watcher / signal-generation branch
- `EMERGENCY_RECOVERY.md` as evidence of a watcher-branch crash / shutdown event
- `IDIOT_PROOF_SETUP.md` as operator setup/runbook guidance

## Cleanup Candidates Later

Do not delete anything yet. When we do cleanup, the likely first pass is to quarantine or archive files that overlap in confusing ways:

- `simple-launcher.js`
- `launcher-v4-adaptive-final.js`
- `flashbots-executor.js`
- old status docs that claim final readiness while pointing at mocked paths

The cleanup goal should be:

- one baseline launcher
- one experimental branch
- one short operator reference

Before cleanup, preserve and compare these direct-path files together:

- `historical-baseline-launcher.js`
- `core/SwarmExecutor.js`
- `working-launcher.js`
- `direct-wallet-executor.js`
- `direct-wallet-executor-continuous.js`

When comparing them, keep two sub-branches separate:

- executor-contract branch:
  - `historical-baseline-launcher.js`
  - `core/SwarmExecutor.js`
  - `working-launcher.js`
- direct-router branch:
  - `direct-wallet-executor.js`
  - `direct-wallet-executor-continuous.js`

Survivor recommendation after comparison:

- keep `historical-baseline-launcher.js` as the main executable recovery path
- keep `working-launcher.js` as a historical reference / secondary comparison file
- keep `direct-wallet-executor*.js` only as router-bypass safety harnesses, not as the main recovery path

Preserve the watcher branch separately as discovery infrastructure:

- `block-watcher.js`
- `websocket-watcher.js`
- watcher docs and upgrade notes

Preserve the setup/runbook branch separately:

- `IDIOT_PROOF_SETUP.md`
- `IDIOT_PROOF_SECURITY.md`
- `SAFE_TO_PROCEED.md`
- related safe-start / checklist docs

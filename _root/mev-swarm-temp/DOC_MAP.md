# MEV Swarm Doc Map

Date: 2026-03-19

This file is the shortest useful map of the documentation in this folder.

There are 61 markdown files here. They are not random, but they do mix:

- historical reconstruction
- direct executor fixes
- watcher/swarm architecture
- operator runbooks
- optimistic "ready" notes from the March 3 debugging period

Use this map to decide what to trust first.

## 1. Ground Truth First

Start here if the question is "what actually happened?"

- `BASELINE_RECOVERY_REFERENCE.md`
  - Current master reference tying the branches together.
- `TIMELINE_FEB23_MAR04.md`
  - Date-ordered chain-backed timeline.
- `TRANSACTION_RECON_REPORT.md`
  - Wallet/contract reconstruction and real tx patterns.
- `HISTORICAL_BASELINE_RECONSTRUCTION.md`
  - Which launcher/runtime path best matches the historical live system.
- `ACCURATE_WALLET_ROLES.md`
  - Good wallet-role breakdown that aligns with the reconstruction.

Trust level:

- highest in this folder

## 2. Historical Diagnostic Notes

Use these as "what we thought at the time" documents, not final truth.

- `COMPLETE_PICTURE_FINAL.md`
- `FINAL_ACCURATE_ANALYSIS.md`
- `REAL_TRADE_ANALYSIS.md`
- `TRADE_ANALYSIS_0x23d19670.md`
- `TRADE_ANALYSIS_17_TRADES.md`
- `TRADE_ANALYSIS_YESTERDAY.md`
- `TRUE_PROFIT_ANALYSIS.md`
- `TRUE_PROBLEM_GAS_BURNING.md`

What they add:

- close-in thinking from the shutdown/fix period
- profit/loss hypotheses
- trade-by-trade interpretations

Caution:

- several make stronger PnL claims than the currently verified evidence supports

## 3. Executor-Contract Branch

This is the branch that best matches the historical on-chain trading loop.

Key code:

- `historical-baseline-launcher.js`
- `core/SwarmExecutor.js`
- `working-launcher.js`
- `abi/Executor.json`

Supporting docs:

- `PATCH_APPLIED_DIRECT_WALLET_EXECUTOR.md`
- `EXECUTOR_TEST_RESULTS.md`
- `EXECUTOR_FIX_APPLIED.md`
- `ARB_EXECUTOR_ISSUES.md`

What this branch is:

- wallet -> executor contract -> token flows

What matters most:

- the historical live trades point here, not to the mocked MCP branch

Survivor in this branch:

- `historical-baseline-launcher.js`

Secondary reference:

- `working-launcher.js`

## 4. Direct-Router Branch

This is a practical test/safety branch, but it is not the exact historical executor-contract runtime.

Key code:

- `direct-wallet-executor.js`
- `direct-wallet-executor-continuous.js`

Supporting docs:

- `SAFETY_VALIDATION_CHECKLIST.md`
- `SAFE_TO_PROCEED.md`
- `PRE_LIVE_SANITY_CHECK.md`
- `READY_TO_TEST.md`

What this branch is:

- direct swaps through router code
- safety harness / dry-run validation

What it is not:

- the exact historical contract path that appears on-chain

Recommended role:

- keep as safety/test harness only
- do not treat as the main recovered runtime

## 5. Watcher / Swarm Branch

This is the discovery/orchestration side.

Key code:

- `block-watcher.js`
- `websocket-watcher.js`
- `block-watcher-upgraded.js`

Supporting docs:

- `WATCHER_EXPLANATION.md`
- `WATCHER_ANALYSIS_COMPLETE.md`
- `WATCHER_CONFIG.md`
- `PROFIT_LOGGING_ADDED.md`
- `WATCHER_UPGRADE_PATCH.md`
- `WATCHER_UPGRADE_COMPLETE.md`
- `EMERGENCY_RECOVERY.md`
- `CRASH_PREVENTION.md`
- `SYSTEM_CLEANUP_STATUS.md`
- `STRESS_TEST_RESULTS.md`

What this branch is:

- mempool and DEX activity monitoring
- intended signal-generation layer for a downstream executor

Important:

- this branch likely explains the crash/reset memory you have
- it is real and important, but it is not direct proof of profitable execution

## 6. Setup / Runbook Branch

These are operator-facing docs.

- `IDIOT_PROOF_SETUP.md`
- `IDIOT_PROOF_SECURITY.md`
- `ACTUAL_SECURITY_STATUS.md`
- `KEY-FIX.md`
- `PRIVATE_KEY_FIX.md`
- `SECURITY-INCIDENT-REPORT.md`
- `QUICK_REFERENCE.md`
- `START_TESTING.md`

What they are:

- setup guidance
- key-handling instructions
- kill-switch and dry-run procedures

What they are not:

- proof that the system was historically profitable

## 7. Aspirational / Status Docs

These explain why the folder feels misleading.

- `README.md`
- `READY_TO_DEPLOY.md`
- `FINAL_READY_STATUS.md`
- `PRODUCTION_SUMMARY.md`
- `DEPLOYMENT_STATUS.md`
- `LAUNCH_STATUS_REPORT.md`
- `MAINNET_LAUNCH_CHECKLIST.md`
- `IMPLEMENTATION_SUMMARY.md`
- `STATUS.md`
- `CRITICAL_PATH.md`

What they are:

- architecture/status narratives
- deployment optimism
- branch-specific readiness claims

Caution:

- several of these describe the MCP/orchestration path as if it were the live truth
- that does not match the mocked solver state we verified

## 8. What To Trust When Docs Conflict

Use this priority order:

1. `BASELINE_RECOVERY_REFERENCE.md`
2. chain-backed reconstruction docs
3. code that currently exists and runs
4. historical diagnostic notes
5. setup/runbook docs
6. "ready / final / production" docs

## 9. Practical Reading Order

If you want the shortest path through the docs:

1. `BASELINE_RECOVERY_REFERENCE.md`
2. `TIMELINE_FEB23_MAR04.md`
3. `TRANSACTION_RECON_REPORT.md`
4. `HISTORICAL_BASELINE_RECONSTRUCTION.md`
5. `ACCURATE_WALLET_ROLES.md`
6. `WATCHER_EXPLANATION.md`
7. `EMERGENCY_RECOVERY.md`
8. `PATCH_APPLIED_DIRECT_WALLET_EXECUTOR.md`
9. `EXECUTOR_TEST_RESULTS.md`
10. `IDIOT_PROOF_SETUP.md`

## 10. Cleanup Direction

Do not delete broadly yet.

When cleanup starts, preserve these groups separately:

- historical truth docs
- executor-contract baseline
- direct-router test branch
- watcher/swarm branch
- setup/runbook docs

Likely first quarantine targets:

- duplicate "final ready" docs
- duplicate launch-status docs
- older launcher notes that point at mocked paths as if they were production

# REMOVED: sensitive data redacted by automated security cleanup
# Historical Baseline Reconstruction

Date: 2026-03-19

This note identifies the file/env/runtime combination that most closely matches the historical real trading window from late March 2, 2026 into March 3, 2026.

## Historical On-Chain Baseline

The strongest historical execution path was:

- Trading wallet: `REDACTED_ADDRESS`
- Active executor contract: `REDACTED_ADDRESS`

On-chain evidence:

- repeated successful calls from `0x29F7...` to `0x4FF5...`
- function signature: `executeArbitrage(address firstPairAddress,address secondPairAddress,uint256 percentageToPayToCoinbase)`
- repeated token flow pattern:
  - WETH from trading wallet -> executor
  - USDC from executor -> trading wallet

This is the closest verified baseline for "the period when it was actually trading."

## What It Was Not

It was almost certainly not the current MCP orchestration path in `LAUNCH_SEQUENCE.js`.

Reasons:

- `core/mcp/solver-tools.js` currently returns mock opportunities, profits, success probabilities, and optimization results
- the historical trades are direct contract calls, not the current mocked solver pipeline
- the current launcher's bundle/submission path is structurally different from the historical chain pattern

## Closest Matching Code Paths In Repo

### Best conceptual match

- `working-launcher.js`
- `core/SwarmExecutor.js`
- `SwarmExecutor.js`
- `launcher.js.disabled`

These files match the old model better because they assume:

- one signing wallet
- one executor contract
- direct `executeArbitrage(...)` calls
- direct balance checks on the wallet and contract
- no dependency on the mocked MCP solver path

### Why not `LAUNCH_SEQUENCE.js`

- It is architecturally more ambitious, but currently mixes real transaction-building with mocked solver outputs.
- It reaches a "ready for Flashbots submission" state, but it is not the path that explains the historical direct executor calls.

## Important ABI Mismatch

The historical on-chain function signature seen in transaction history is:

- `executeArbitrage(address firstPairAddress,address secondPairAddress,uint256 percentageToPayToCoinbase)`

Many current repo launchers assume a different ABI, for example:

- `executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn)`

This means the current codebase likely drifted away from the exact historical contract interface.

That is a major reason the repo feels inconsistent: old chain history reflects one contract interface, while several current launcher files assume a different one.

## Likely Historical Progression

1. Funding wallet `0x3476...` received ETH from KuCoin.
2. Funding wallet deployed/funded contracts.
3. Trading wallet `0x29F7...` was funded and began wrapping ETH to WETH.
4. Trading wallet executed repeated direct contract calls against `0x4FF5...`.
5. Later, WETH and ETH were migrated from `0x29F7...` to `0xC649...`.
6. After exposure/key churn, the active mental model, wallets, and repo code paths diverged.

## Practical Baseline To Recreate

If the goal is to recreate the old behavior as closely as possible, the baseline should be defined as:

- Wallet model: historical trading wallet pattern, not funding wallet pattern
- Execution model: direct wallet -> executor contract
- Contract model: executor ABI must match the historical `executeArbitrage(firstPairAddress, secondPairAddress, percentageToPayToCoinbase)` path, or at minimum the exact deployed contract at `0x4FF5...` must be decoded and targeted correctly
- Solver model: do not rely on the current mocked MCP solver path

## Recommendation

Treat the historical direct executor path as the real baseline.

That means:

- use the historical chain activity as truth
- use `LAUNCH_SEQUENCE.js` only as a separate experimental/orchestration branch
- do not assume the current "final" launcher reproduces the historical trades

The next technical task should be:

- decode the exact ABI of the deployed `0x4FF5...` contract from on-chain behavior / verified source / local ABI files
- then align one direct launcher to that exact ABI

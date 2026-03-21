# REMOVED: sensitive data redacted by automated security cleanup
# Timeline: Feb 23, 2026 to Mar 4, 2026

Date: 2026-03-19

This timeline reconstructs the main activity window around the suspected live-trading period.

Addresses:

- Funding / deployment wallet: `REDACTED_ADDRESS`
- Historical trading wallet: `REDACTED_ADDRESS`
- Later WETH-holding wallet: `REDACTED_ADDRESS`
- Old contract: `REDACTED_ADDRESS`
- New executor contract: `REDACTED_ADDRESS`

## Main Findings

- No meaningful tracked activity was found before Feb 27, 2026 in the fetched window.
- Feb 27 to early Mar 2 is mostly funding and setup.
- Mar 2 is the transition day: deployment/funding/setup first, then the trading wallet becomes active.
- Late Mar 2 into Mar 3 shows real executor activity on the new contract `0x4FF5...272f`.
- Mar 3 late evening shows WETH and ETH being moved from the historical trading wallet to `0xC649...BA2F`.

## Chronological Timeline

### Feb 27, 2026

- `2026-02-27T08:22:35Z`
  Funding wallet receives `0.01318929 ETH`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-02-27T09:46:11Z`
  Funding wallet receives unrelated token airdrop noise (`OpenClaw`)

### Mar 1, 2026

- `2026-03-01T02:46:35Z`
  Funding wallet receives `0.04320835 ETH`
  Tx: `REDACTED_PRIVATE_KEY`

### Mar 2, 2026: Setup / Deployment / Funding

- `2026-03-02T07:15:23Z`
  Contract creation from funding wallet
  Tx: `REDACTED_PRIVATE_KEY`
  This strongly matches deployment/setup behavior.

- `2026-03-02T07:20:23Z`
  Funding wallet sends `0.025 ETH` to old contract `0xaC9d...`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-02T07:45:47Z`
  Funding wallet sends about `0.031156 ETH` to trading wallet `0x29F7...`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-02T10:56:47Z`
- `2026-03-02T11:10:23Z`
- `2026-03-02T17:16:11Z`
  Funding wallet calls `withdrawETH()` on old contract `0xaC9d...`
  Txs:
  - `REDACTED_PRIVATE_KEY`
  - `REDACTED_PRIVATE_KEY`
  - `REDACTED_PRIVATE_KEY`

- `2026-03-02T16:52:35Z`
  Trading wallet sends `0.001 ETH` back to funding wallet
  Tx: `REDACTED_PRIVATE_KEY`

### Mar 2, 2026: Trading Wallet Becomes Active

- `2026-03-02T17:57:59Z`
  Trading wallet approves WETH
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-02T18:21:11Z`
  Trading wallet wraps ETH to WETH via `deposit()`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-02T18:38:23Z` onward
  Repeated approvals and setup calls begin from trading wallet.

### Mar 2 to Mar 3: Real Executor Activity Window

This is the strongest evidence that the bot was actually executing.

- `2026-03-02T20:07:47Z`
  Successful `executeArbitrage(...)` call to new executor
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-02T23:58:59Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`
  Observed USDC out to trading wallet.

- `2026-03-03T03:26:59Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`
  WETH in from trading wallet, USDC back out.

- `2026-03-03T03:27:23Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T03:34:59Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T03:35:23Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T03:35:47Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T03:36:11Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T05:51:23Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T05:51:59Z`
  Successful `executeArbitrage(...)`
  Tx: `REDACTED_PRIVATE_KEY`

Across these transactions, the repeated pattern is:

- WETH leaves `0x29F7...`
- WETH enters `0x4FF5...`
- USDC leaves `0x4FF5...`
- USDC returns to `0x29F7...`

This is real on-chain execution behavior, not imagination and not just funding transfers.

### Mar 3, 2026: Additional Swap Activity Outside Executor

- `2026-03-03T17:06:59Z`
  Trading wallet performs an external aggregator swap
  Tx: `REDACTED_PRIVATE_KEY`
  Pattern:
  - USDC out from trading wallet
  - WETH back to trading wallet

This suggests some of the later activity may have moved outside the executor contract path.

### Mar 3 to Mar 4, 2026: Migration To Later Wallet

- `2026-03-03T23:53:35Z`
  Trading wallet transfers `0.097183855391451821 WETH` to `0xC649...BA2F`
  Tx: `REDACTED_PRIVATE_KEY`

- `2026-03-03T23:53:59Z`
  Trading wallet transfers `0.013111823158851464 ETH` to `0xC649...BA2F`
  Tx: `REDACTED_PRIVATE_KEY`

This is the cleanest evidence of the migration from the old trading wallet to the later WETH-holding wallet.

## What This Means

- The live-trading window was real.
- The strongest cluster is from late Mar 2 into early Mar 3, 2026.
- The historical real path centered on:
  - trading wallet `0x29F7...`
  - new executor `0x4FF5...`
- The current repo's mocked MCP solver path is not the thing that generated these historical executions.
- The likely divergence happened after the wallet exposure/key changes and the later migration of ETH/WETH to `0xC649...`.

## Important Caution

- This timeline proves execution attempts and token flows happened.
- It does not by itself prove every one of those trades was net profitable after gas.
- Existing repo files like `TRADE_ANALYSIS_17_TRADES.md` appear more confident than the currently verified evidence supports.
- The current codebase still mixes real historical artifacts with mocked solver logic.

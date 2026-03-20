# Timeline: Feb 23, 2026 to Mar 4, 2026

Date: 2026-03-19

This timeline reconstructs the main activity window around the suspected live-trading period.

Addresses:

- Funding / deployment wallet: `0x34769bE7087F1fE5B9ad5C50cC1526BC63217341`
- Historical trading wallet: `0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F`
- Later WETH-holding wallet: `0xC649A2F94AFc4E5649D3d575d16E739e70B2BA2F`
- Old contract: `0xaC9d24032F5375625661fADA31902D10D25c55e7`
- New executor contract: `0x4FF5eF5d185195173b0B178eDe4A7679E7De272f`

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
  Tx: `0x87604f90584f286f2d25fa1eb37441e56578b6a59d96d6e3f5f3b4221b91c6d7`

- `2026-02-27T09:46:11Z`
  Funding wallet receives unrelated token airdrop noise (`OpenClaw`)

### Mar 1, 2026

- `2026-03-01T02:46:35Z`
  Funding wallet receives `0.04320835 ETH`
  Tx: `0x1079dc6bbfa0fada2e2893e8b08470ea3bacc2be43b64baf06589c624d511cae`

### Mar 2, 2026: Setup / Deployment / Funding

- `2026-03-02T07:15:23Z`
  Contract creation from funding wallet
  Tx: `0xccb113cb375ce6d229a38cb1397c9f329ae03f97228d9901d91ef262ac739cfc`
  This strongly matches deployment/setup behavior.

- `2026-03-02T07:20:23Z`
  Funding wallet sends `0.025 ETH` to old contract `0xaC9d...`
  Tx: `0x9c5481c395522414dc0a20bd01caee9c28cddc6188e79ddc6931b52fc4b7e6d0`

- `2026-03-02T07:45:47Z`
  Funding wallet sends about `0.031156 ETH` to trading wallet `0x29F7...`
  Tx: `0x48f9e508f74cf68e6110ca4d2486dcc316c8f8204b9a927656c1aa8d8aa9112d`

- `2026-03-02T10:56:47Z`
- `2026-03-02T11:10:23Z`
- `2026-03-02T17:16:11Z`
  Funding wallet calls `withdrawETH()` on old contract `0xaC9d...`
  Txs:
  - `0xdf503f3ee710e4eea7b8323eb5823234a09e4453c937e7e7966c7368323fac32`
  - `0xd54383dc02791b55d212b99fb0ed23821672eb6c1f1eeaa355781264328d2edc`
  - `0xad37171e35ad677b6f51934487d99362979353854fbd929891342b74730f9ded`

- `2026-03-02T16:52:35Z`
  Trading wallet sends `0.001 ETH` back to funding wallet
  Tx: `0x82eb8ef13faef8fbead844d4eb05802a0382a30e24f305756fef98e9ddbcbfb3`

### Mar 2, 2026: Trading Wallet Becomes Active

- `2026-03-02T17:57:59Z`
  Trading wallet approves WETH
  Tx: `0x99a2db57b73c281d2df1327b3e570198bfa595280dd025c8e0721c0bcd6c8c04`

- `2026-03-02T18:21:11Z`
  Trading wallet wraps ETH to WETH via `deposit()`
  Tx: `0xcefb911b2e90c8221249498aac5534a565e32f237ac405489c4a3d7337be83b5`

- `2026-03-02T18:38:23Z` onward
  Repeated approvals and setup calls begin from trading wallet.

### Mar 2 to Mar 3: Real Executor Activity Window

This is the strongest evidence that the bot was actually executing.

- `2026-03-02T20:07:47Z`
  Successful `executeArbitrage(...)` call to new executor
  Tx: `0x916da5a6201aeb0a5512eb1b16d883d9330f97b80f9a1719229d07666835d78d`

- `2026-03-02T23:58:59Z`
  Successful `executeArbitrage(...)`
  Tx: `0x915b804b066e362041bbdc21a4cf71bee17c3eeace49c07beea509891a0ebc98`
  Observed USDC out to trading wallet.

- `2026-03-03T03:26:59Z`
  Successful `executeArbitrage(...)`
  Tx: `0xae9d09243146988f5a2a951b36143418f6f4b3fa0acd6d3d2dddad57f3e0d940`
  WETH in from trading wallet, USDC back out.

- `2026-03-03T03:27:23Z`
  Successful `executeArbitrage(...)`
  Tx: `0x74083a89eff535381c2752b45380a1a9ffa465a4adefeb9945e7dc31874419a6`

- `2026-03-03T03:34:59Z`
  Successful `executeArbitrage(...)`
  Tx: `0x39102ef0bc955d9325c68bfedfa36cc6d30e97cea8b5b822f7b262a849aeffbc`

- `2026-03-03T03:35:23Z`
  Successful `executeArbitrage(...)`
  Tx: `0xba31844e15c9489945d139f537489ec5ce3b43ec4cc544853aeddf68ee389ec8`

- `2026-03-03T03:35:47Z`
  Successful `executeArbitrage(...)`
  Tx: `0x85d0a120f9f21eb5ee1d2fc2d93c1c708fa5a5fc55f24439ad4d994f2ff5d906`

- `2026-03-03T03:36:11Z`
  Successful `executeArbitrage(...)`
  Tx: `0x57a7656530875af333b7c50f6096ac3924ce271b1bcc3652f3c04aff293e89bd`

- `2026-03-03T05:51:23Z`
  Successful `executeArbitrage(...)`
  Tx: `0xe59a8ab9a5d81c08db4e84637ea6db0904e64163e94a66889ba1574053dffcd2`

- `2026-03-03T05:51:59Z`
  Successful `executeArbitrage(...)`
  Tx: `0x23d19670d2042df4b53205d52374babc3d595b77b000ed2bf83b68b149fd6e1d`

Across these transactions, the repeated pattern is:

- WETH leaves `0x29F7...`
- WETH enters `0x4FF5...`
- USDC leaves `0x4FF5...`
- USDC returns to `0x29F7...`

This is real on-chain execution behavior, not imagination and not just funding transfers.

### Mar 3, 2026: Additional Swap Activity Outside Executor

- `2026-03-03T17:06:59Z`
  Trading wallet performs an external aggregator swap
  Tx: `0xfa97d86a205e9d3198fad4d9be931ee27546545fb7954601e167f65b706c2a51`
  Pattern:
  - USDC out from trading wallet
  - WETH back to trading wallet

This suggests some of the later activity may have moved outside the executor contract path.

### Mar 3 to Mar 4, 2026: Migration To Later Wallet

- `2026-03-03T23:53:35Z`
  Trading wallet transfers `0.097183855391451821 WETH` to `0xC649...BA2F`
  Tx: `0x2d6d9caa381660f4c5f893d08df0b8463ab4b4a1069c3209bae0cf7b634a2a83`

- `2026-03-03T23:53:59Z`
  Trading wallet transfers `0.013111823158851464 ETH` to `0xC649...BA2F`
  Tx: `0x68bdf8e0f1a17ed3986c449a1c916c3d70b16ca95e7399a26d3bfaeceef85fb7`

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

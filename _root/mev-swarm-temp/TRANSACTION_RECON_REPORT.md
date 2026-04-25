# REMOVED: sensitive data redacted by automated security cleanup
# Transaction Recon Report

Date: 2026-03-19

This report separates likely funding/setup activity from likely trade activity for the four addresses involved in the MEV Swarm setup.

## Wallet Roles

- Funding / deployment wallet: `REDACTED_ADDRESS`
- Trading wallet: `REDACTED_ADDRESS`
- Old signer / WETH holding wallet: `REDACTED_ADDRESS`
- Executor contract: `REDACTED_ADDRESS`

## High Confidence Findings

- `0x3476...7341` is mostly a funding/deployment wallet.
- `0x29F7...9E0F` is the wallet that shows real trade-like activity.
- `0x4FF5...272f` is the executor contract receiving `executeArbitrage(...)` calls from `0x29F7...9E0F`.
- `0xC649...BA2F` appears to have been funded with WETH from the trading wallet later, but it does not show the main historical trade loop.

## Funding / Setup Transactions

These look like funding, deployment, or admin/setup activity rather than arbitrage execution.

- `REDACTED_PRIVATE_KEY`
  `0x29F7...9E0F -> 0x3476...7341`
  Simple transfer of `0.001 ETH` on March 2, 2026.

- `REDACTED_PRIVATE_KEY`
  From `0x3476...7341`
  Contract creation transaction. This matches the deployment-wallet role.

- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
  From `0x3476...7341` to `REDACTED_ADDRESS`
  Function: `withdrawETH()`
  These look like contract admin/fund movement, not live trade execution.

## Real Trade-Like Activity

These are the strongest indicators of actual trading behavior.

### Executor Calls

The executor contract shows multiple successful calls from the trading wallet:

- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`
- `REDACTED_PRIVATE_KEY`

All of these show:

- from: `0x29F7...9E0F`
- to: `0x4FF5...272f`
- function: `executeArbitrage(address firstPairAddress,address secondPairAddress,uint256 percentageToPayToCoinbase)`
- status: success

This is the clearest on-chain evidence that actual bot execution attempts were made.

### Token Flows Around Executor Calls

These transactions show the trading wallet sending WETH into the executor and receiving USDC back:

- `REDACTED_PRIVATE_KEY`
  WETH from `0x29F7...9E0F` to executor
  USDC from executor back to `0x29F7...9E0F`

- `REDACTED_PRIVATE_KEY`
  WETH from `0x29F7...9E0F` to executor
  USDC from executor back to `0x29F7...9E0F`

- `REDACTED_PRIVATE_KEY`
  WETH from `0x29F7...9E0F` to executor
  USDC from executor back to `0x29F7...9E0F`

These are not just gas-funding transfers. They look like actual trade/execution cycles.

### External Swap Activity

- `REDACTED_PRIVATE_KEY`
  From `0x29F7...9E0F`
  Function: `swap(string aggregatorId, address tokenFrom, uint256 amount, bytes data)`
  This also shows:
  - USDC leaving `0x29F7...9E0F`
  - WETH returning to `0x29F7...9E0F`

This looks like direct swap/aggregation activity outside the executor contract.

## WETH Migration To Old Signer

These transactions suggest the trading wallet later moved WETH and ETH to `0xC649...BA2F`:

- `REDACTED_PRIVATE_KEY`
  WETH transfer from `0x29F7...9E0F` to `0xC649...BA2F`

- `REDACTED_PRIVATE_KEY`
  ETH transfer from `0x29F7...9E0F` to `0xC649...BA2F`

This explains why `0xC649...BA2F` ended up holding the visible WETH balance even though the older trade loop appears tied to `0x29F7...9E0F`.

## Practical Conclusion

- If you are trying to reconstruct "which wallet actually traded", the answer is primarily `0x29F7...9E0F`.
- If you are trying to reconstruct "which wallet currently holds the WETH you were looking at", the answer was `0xC649...BA2F`.
- If you are trying to reconstruct "which wallet deployed/funded the system", the answer is `0x3476...7341`.

## Limits

- Etherscan API rate limits prevented a full exhaustive export in one pass.
- This report is based on the most relevant recent normal tx and ERC-20 transfer history plus existing project notes.
- The current MCP launcher's profit outputs are mocked, so this report should be treated as historical reconstruction, not proof that the current code can reproduce those trades today.

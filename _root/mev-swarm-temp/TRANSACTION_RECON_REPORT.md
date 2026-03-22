# Transaction Recon Report

Date: 2026-03-19

This report separates likely funding/setup activity from likely trade activity for the four addresses involved in the MEV Swarm setup.

## Wallet Roles

- Funding / deployment wallet: `0x34769bE7087F1fE5B9ad5C50cC1526BC63217341`
- Trading wallet: `0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F`
- Old signer / WETH holding wallet: `0xC649A2F94AFc4E5649D3d575d16E739e70B2BA2F`
- Executor contract: `0x4FF5eF5d185195173b0B178eDe4A7679E7De272f`

## High Confidence Findings

- `0x3476...7341` is mostly a funding/deployment wallet.
- `0x29F7...9E0F` is the wallet that shows real trade-like activity.
- `0x4FF5...272f` is the executor contract receiving `executeArbitrage(...)` calls from `0x29F7...9E0F`.
- `0xC649...BA2F` appears to have been funded with WETH from the trading wallet later, but it does not show the main historical trade loop.

## Funding / Setup Transactions

These look like funding, deployment, or admin/setup activity rather than arbitrage execution.

- `0x82eb8ef13faef8fbead844d4eb05802a0382a30e24f305756fef98e9ddbcbfb3`
  `0x29F7...9E0F -> 0x3476...7341`
  Simple transfer of `0.001 ETH` on March 2, 2026.

- `0xccb113cb375ce6d229a38cb1397c9f329ae03f97228d9901d91ef262ac739cfc`
  From `0x3476...7341`
  Contract creation transaction. This matches the deployment-wallet role.

- `0xad37171e35ad677b6f51934487d99362979353854fbd929891342b74730f9ded`
- `0xd54383dc02791b55d212b99fb0ed23821672eb6c1f1eeaa355781264328d2edc`
- `0xdf503f3ee710e4eea7b8323eb5823234a09e4453c937e7e7966c7368323fac32`
  From `0x3476...7341` to `0xaC9d24032F5375625661fADA31902D10D25c55e7`
  Function: `withdrawETH()`
  These look like contract admin/fund movement, not live trade execution.

## Real Trade-Like Activity

These are the strongest indicators of actual trading behavior.

### Executor Calls

The executor contract shows multiple successful calls from the trading wallet:

- `0x23d19670d2042df4b53205d52374babc3d595b77b000ed2bf83b68b149fd6e1d`
- `0xe59a8ab9a5d81c08db4e84637ea6db0904e64163e94a66889ba1574053dffcd2`
- `0x57a7656530875af333b7c50f6096ac3924ce271b1bcc3652f3c04aff293e89bd`
- `0x85d0a120f9f21eb5ee1d2fc2d93c1c708fa5a5fc55f24439ad4d994f2ff5d906`
- `0xba31844e15c9489945d139f537489ec5ce3b43ec4cc544853aeddf68ee389ec8`
- `0x39102ef0bc955d9325c68bfedfa36cc6d30e97cea8b5b822f7b262a849aeffbc`
- `0x74083a89eff535381c2752b45380a1a9ffa465a4adefeb9945e7dc31874419a6`
- `0xae9d09243146988f5a2a951b36143418f6f4b3fa0acd6d3d2dddad57f3e0d940`

All of these show:

- from: `0x29F7...9E0F`
- to: `0x4FF5...272f`
- function: `executeArbitrage(address firstPairAddress,address secondPairAddress,uint256 percentageToPayToCoinbase)`
- status: success

This is the clearest on-chain evidence that actual bot execution attempts were made.

### Token Flows Around Executor Calls

These transactions show the trading wallet sending WETH into the executor and receiving USDC back:

- `0x23d19670d2042df4b53205d52374babc3d595b77b000ed2bf83b68b149fd6e1d`
  WETH from `0x29F7...9E0F` to executor
  USDC from executor back to `0x29F7...9E0F`

- `0xe59a8ab9a5d81c08db4e84637ea6db0904e64163e94a66889ba1574053dffcd2`
  WETH from `0x29F7...9E0F` to executor
  USDC from executor back to `0x29F7...9E0F`

- `0x57a7656530875af333b7c50f6096ac3924ce271b1bcc3652f3c04aff293e89bd`
  WETH from `0x29F7...9E0F` to executor
  USDC from executor back to `0x29F7...9E0F`

These are not just gas-funding transfers. They look like actual trade/execution cycles.

### External Swap Activity

- `0xfa97d86a205e9d3198fad4d9be931ee27546545fb7954601e167f65b706c2a51`
  From `0x29F7...9E0F`
  Function: `swap(string aggregatorId, address tokenFrom, uint256 amount, bytes data)`
  This also shows:
  - USDC leaving `0x29F7...9E0F`
  - WETH returning to `0x29F7...9E0F`

This looks like direct swap/aggregation activity outside the executor contract.

## WETH Migration To Old Signer

These transactions suggest the trading wallet later moved WETH and ETH to `0xC649...BA2F`:

- `0x2d6d9caa381660f4c5f893d08df0b8463ab4b4a1069c3209bae0cf7b634a2a83`
  WETH transfer from `0x29F7...9E0F` to `0xC649...BA2F`

- `0x68bdf8e0f1a17ed3986c449a1c916c3d70b16ca95e7399a26d3bfaeceef85fb7`
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

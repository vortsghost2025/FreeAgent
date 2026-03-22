# MEV Swarm - Active Watcher Configuration

## Entry Point
Run the main watcher:
```bash
cd mev-swarm && node index.js
# or directly
cd mev-swarm && node block-watcher.js
```

## Watcher Architecture

| File | Role |
|------|------|
| [`block-watcher.js`](block-watcher.js:1) | Primary - monitors blocks & pending txs |
| [`pool-watcher.js`](pool-watcher.js:1) | Fetches live Uniswap V3 pool prices |
| [`arb-agent.js`](arb-agent.js:1) | Analyzes arbitrage opportunities |
| [`live-reserves-graph.js`](live-reserves-graph.js:1) | Wires graph to live prices |

## Expected Output
When running, you should see logs like:
```
[WATCHER] Opportunity detected: WETH → USDC → WETH
Spread: +0.82%
Expected profit: $3.12
```

## Configuration Required
Add to `.env`:
```
BOT_WALLET_PRIVATE_KEY=0xYOUR_64_CHAR_PRIVATE_KEY
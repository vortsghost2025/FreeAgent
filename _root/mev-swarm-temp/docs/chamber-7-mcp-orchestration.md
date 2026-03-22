# Chamber 7: MCP Orchestration Layer

## Overview
Chamber 7 transforms Kilo from code reviewer to full orchestrator by providing a Model Context Protocol (MCP) interface to MEV Swarm's core intelligence. This layer enables persistent storage, task execution, and multi-agent coordination without managing complex dependencies.

## Architecture
```
Kilo (Code Reviewer/Orchestrator)
    ↓
MCP Interface (Standardized Tools)
    ↓
MEV Swarm Core Engine (Chambers 1-4)
    ↓
Apify Backend (Storage + Execution)
```

## Core Contract
**MCP Server ↔ MEV Swarm ↔ Kilo** as a clean typed interface.

---

## MCP Tool Specifications

### Core Solver Tools

#### `simulatePath(pathId, amountInHuman)`
Simulates a single arbitrage path with precise trade amount.

**Parameters:**
- `pathId`: String identifier of the path (e.g., "v2→v3→sushi")
- `amountInHuman`: Human-readable amount (e.g., "10 ETH", "5000 USDC")

**Returns:**
```json
{
  "pathId": "v2→v3→sushi",
  "amountIn": "10000000000000000000",
  "amountOut": "10080000000000000000",
  "profit": "800000000000000000",
  "profitBps": 80,
  "gasCost": "9030000000000000",
  "edges": 3,
  "slippage": 0.008,
  "timestamp": "2026-03-01T23:00:00Z"
}
```

**Implementation:** Calls `core/graph/swappable-edge.js` → `core/math/simulate-v2.js` / `core/math/simulate-v3.js`

---

#### `optimizeTradeSize(pathId, minAmount, maxAmount, strategy)`
Finds optimal trade size using Chamber 3 optimizer.

**Parameters:**
- `pathId`: Path identifier
- `minAmount`: Minimum amount in human format (e.g., "0.1 ETH")
- `maxAmount`: Maximum amount in human format (e.g., "100 ETH")
- `strategy`: Optimization strategy ("ternary", "golden-section", "curve")

**Returns:**
```json
{
  "pathId": "v2→v3→sushi",
  "optimalAmount": "45000000000000000000",
  "optimalAmountHuman": "45.0 ETH",
  "maxProfit": "324000000000000000",
  "maxProfitHuman": "0.0324 ETH",
  "profitBps": 72,
  "iterations": 15,
  "converged": true,
  "tradeOffs": {
    "smallAmount": "0.1 ETH",
    "smallProfit": "0.001 ETH",
    "largeAmount": "100 ETH",
    "largeProfit": "0.015 ETH"
  }
}
```

**Implementation:** Calls `core/optimizer/trade-size-optimizer.js`

---

#### `refreshGraph(forceUpdate)`
Updates live reserves graph with fresh on-chain data.

**Parameters:**
- `forceUpdate`: Boolean - bypass cache and fetch fresh data

**Returns:**
```json
{
  "poolsUpdated": 47,
  "timestamp": "2026-03-01T23:00:00Z",
  "blockNumber": 24567287,
  "updateDuration": 2340,
  "cachesCleared": ["reserves", "prices", "slippage"]
}
```

**Implementation:** Calls `live-reserves-graph.js` → fetch fresh pool data

---

#### `evaluateAllPaths(minProfitBps, maxGasCost)`
Evaluates all known arbitrage paths with profitability filtering.

**Parameters:**
- `minProfitBps`: Minimum profit threshold in basis points (default: 10)
- `maxGasCost`: Maximum gas cost in ETH (default: "0.02 ETH")

**Returns:**
```json
{
  "totalPaths": 1247,
  "profitablePaths": 23,
  "topOpportunities": [
    {
      "pathId": "v2→v3→sushi",
      "rank": 1,
      "netProfit": "92970000000000000",
      "netProfitHuman": "0.09297 ETH",
      "profitBps": 61,
      "gasCost": "9030000000000000",
      "flashLoanFee": "9000000000000000",
      "qualityScore": 85,
      "qualityLabel": "Good"
    }
  ],
  "evaluationTime": 456
}
```

**Implementation:** Batch calls `core/gas/profitability-calculator.js`

---

#### `rankOpportunities({ limit, minProfit, sortBy })`
Ranks opportunities by multiple criteria and returns top results.

**Parameters:**
- `limit`: Maximum number of results (default: 10)
- `minProfit`: Minimum profit threshold (default: "0.01 ETH")
- `sortBy`: Sort criteria ("profit", "profitBps", "gasEfficiency")

**Returns:**
```json
{
  "totalRanked": 23,
  "returned": 10,
  "opportunities": [
    {
      "rank": 1,
      "path": "v2→v3→sushi",
      "netProfit": "92970000000000000",
      "netProfitHuman": "0.09297 ETH",
      "profitBps": 61,
      "gasEfficiency": "0.0103 ETH/gas",
      "qualityScore": 85,
      "riskAdjustedProfit": "92970000000000000",
      "meetsThreshold": true
    }
  ]
}
```

**Implementation:** Calls `core/gas/profitability-calculator.js` → ranking logic

---

### Advanced Tools

#### `getLiveReserves(poolId)`
Fetches current reserves for a specific pool.

**Parameters:**
- `poolId`: Pool address or identifier

**Returns:**
```json
{
  "poolId": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
  "poolType": "uniswap_v3",
  "token0": "USDC",
  "token1": "ETH",
  "reserve0": "12500000000000",
  "reserve1": "6335000000000000000000",
  "sqrtPriceX96": "3519112622101281472851725",
  "tick": 200456,
  "liquidity": "234567890123456789",
  "timestamp": "2026-03-01T23:00:00Z"
}
```

**Implementation:** Direct pool contract call via ethers.js

---

#### `simulateSwapV3({ poolId, amountInHuman, tickRange })`
Simulates V3 swap with tick-walking precision.

**Parameters:**
- `poolId`: V3 pool address
- `amountInHuman`: Input amount (e.g., "10 ETH")
- `tickRange`: Optional tick range constraint (e.g., {"min": 200000, "max": 201000})

**Returns:**
```json
{
  "poolId": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
  "amountIn": "10000000000000000000",
  "amountOut": "19711085720",
  "ticksCrossed": 23,
  "tickRange": {"min": 200456, "max": 200479},
  "slippage": 0.008,
  "feeBps": 30,
  "gasEstimate": 141000
}
```

**Implementation:** Calls `core/math/simulate-v3.js`

---

#### `getGasEstimates(pathId)`
Returns detailed gas cost breakdown for a path.

**Parameters:**
- `pathId`: Path identifier

**Returns:**
```json
{
  "pathId": "v2→v3→sushi",
  "gasUnits": 301000,
  "gasCostWei": "9030000000000000",
  "gasCostEth": "0.00903 ETH",
  "gasCostWithMargin": "0.01084 ETH",
  "breakdown": [
    {"hop": 1, "type": "uniswap_v2", "gas": 71000},
    {"hop": 2, "type": "uniswap_v3", "gas": 141000},
    {"hop": 3, "type": "sushiswap", "gas": 89000}
  ],
  "flashLoanOverhead": 230000
}
```

**Implementation:** Calls `core/gas/gas-estimator.js`

---

#### `evaluateMempoolImpact(pendingTxId)`
Predicts how pending transactions will affect arbitrage opportunities.

**Parameters:**
- `pendingTxId`: Transaction hash or identifier

**Returns:**
```json
{
  "pendingTxId": "0x123abc...",
  "affectedPools": [
    {
      "poolId": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
      "currentReserves": {"reserve0": "12500000000000", "reserve1": "6335000000000000000000"},
      "predictedReserves": {"reserve0": "12450000000000", "reserve2": "6340000000000000000000"},
      "impact": {"priceImpact": 0.004, "liquidityChange": -0.004}
    }
  ],
  "opportunitiesLost": 3,
  "opportunitiesGained": 1,
  "reevaluationRequired": true
}
```

**Implementation:** Chamber 5 mempool prediction logic

---

## Integration Points

### 1. Kilo ↔ MCP Tools
```json
{
  "mcpServers": {
    "mev-swarm": {
      "command": "node",
      "args": ["mcp-server/mev-tools.js"],
      "env": {
        "MEV_SWARM_PATH": "/path/to/mev-swarm",
        "APIFY_TOKEN": "your_apify_token"
      }
    }
  }
}
```

### 2. MCP Tools ↔ MEV Swarm Core
```javascript
// tools/mev-tools.js
import { ArbitrageGraph } from './core/graph/arbitrage-graph.js';
import { TradeSizeOptimizer } from './core/optimizer/trade-size-optimizer.js';
import { ProfitabilityCalculator } from './core/gas/profitability-calculator.js';

export const tools = {
  simulatePath: async ({ pathId, amountInHuman }) => {
    const graph = new ArbitrageGraph();
    const edges = graph.getEdges(pathId);
    const result = await graph.simulatePath(edges, amountInHuman);
    return result;
  },

  optimizeTradeSize: async ({ pathId, minAmount, maxAmount, strategy }) => {
    const optimizer = new TradeSizeOptimizer();
    const result = await optimizer.optimizePath(pathId, minAmount, maxAmount, strategy);
    return result;
  }
};
```

### 3. Storage via Apify
```javascript
// Store solver artifacts
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// Profit curves dataset
await client.dataset('profit-curves').pushItems({
  pathId: 'v2→v3→sushi',
  curve: [...samples],
  timestamp: Date.now()
});

// Key-value store for rankings
await client.keyValueStore('rankings').setValue('top-opportunities', {
  opportunities: ranked,
  timestamp: Date.now()
});
```

---

## Storage Schema

### Datasets
1. **profit-curves** - Historical profit curves for analysis
2. **path-evaluations** - All path evaluation results
3. **gas-estimates** - Historical gas cost data
4. **opportunity-rankings** - Ranked opportunity history

### Key-Value Stores
1. **current-state** - Latest graph reserves and prices
2. **top-opportunities** - Current best opportunities
3. **gas-prices** - Current gas price data
4. **config** - Solver configuration and thresholds

---

## Task Execution Patterns

### Periodic Graph Refresh
```javascript
// Kilo schedules: "refreshGraph every 5 minutes"
setInterval(() => {
  mcp.tools.refreshGraph({ forceUpdate: false });
}, 300000);
```

### Batch Optimization Sweep
```javascript
// Kilo triggers: "optimize all profitable paths"
const paths = await mcp.tools.evaluateAllPaths({ minProfitBps: 10 });
for (const path of paths.topOpportunities) {
  const optimized = await mcp.tools.optimizeTradeSize({
    pathId: path.pathId,
    minAmount: "0.1 ETH",
    maxAmount: "100 ETH",
    strategy: "ternary"
  });
}
```

### Predictive Re-evaluation
```javascript
// Kilo monitors: "high-value pending transactions"
const pending = await mcp.tools.watchMempool({ minValue: "10 ETH" });
for (const tx of pending) {
  const impact = await mcp.tools.evaluateMempoolImpact(tx.hash);
  if (impact.reevaluationRequired) {
    await mcp.tools.evaluateAllPaths({ minProfitBps: 10 });
  }
}
```

---

## Error Handling
All MCP tools must return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_LIQUIDITY",
    "message": "Trade amount exceeds available liquidity",
    "details": {"available": "5 ETH", "requested": "100 ETH"},
    "timestamp": "2026-03-01T23:00:00Z"
  }
}
```

---

## Performance Targets
- **Tool response time**: < 500ms for single operations
- **Batch operations**: < 2s for 100 path evaluations
- **Graph refresh**: < 5s for full pool update
- **Storage writes**: < 100ms per dataset item

---

## Security Considerations
1. **API Key Management**: Use Apify token via environment variables
2. **Rate Limiting**: Implement request throttling for RPC calls
3. **Input Validation**: Sanitize all human-readable inputs
4. **Access Control**: Restrict MCP tools to authorized agents

---

## Next Steps
1. ✅ Chamber 7 spec complete
2. 🔄 Chamber 5: Mempool Integration (next)
3. 🔄 Chamber 6: Solver → Executor Pipeline
4. 🔄 Fork Apify MCP server + MEV tools implementation

---

**Status**: Specification complete, ready for implementation after Chamber 5/6 completion.
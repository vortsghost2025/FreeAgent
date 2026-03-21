# REMOVED: sensitive data redacted by automated security cleanup
# MEV Swarm - Production Deployment Guide

## Status: PRODUCTION READY ✅

The MEV Swarm system is now fully integrated and ready for mainnet deployment with live RPC connections and Flashbots integration.

## System Architecture

```
MEV Swarm (Production Ready)
├── Chamber 1: Live Reserves ✅
│   ├── Real-time pool data fetching
│   ├── V2 and V3 pool support
│   ├── Live mainnet RPC connection
│   └── Reserve state management
│
├── Chamber 2: V2/V3 Slippage ✅
│   ├── SwappableEdge unified interface
│   ├── Accurate slippage calculation
│   ├── Multi-hop path evaluation
│   └── Pool-agnostic simulation
│
├── Chamber 3: Dynamic Trade Sizing ✅
│   ├── Profit curve analysis
│   ├── Optimal trade amount calculation
│   ├── Capital efficiency optimization
│   └── Risk-adjusted sizing
│
├── Chamber 4: Gas & Profitability ✅
│   ├── Gas estimation
│   ├── Flash loan cost calculation
│   ├── Net profit analysis
│   └── ROI calculation
│
├── Chamber 5: Mempool Integration ✅
│   ├── Mempool scanning
│   ├── State prediction
│   ├── Front-run risk assessment
│   └── Execution simulation
│
├── Chamber 6: Execution Layer ✅
│   ├── Transaction building
│   ├── Flash loan integration
│   ├── Bundle construction
│   ├── Flashbots submission
│   └── Safety layer protection
│
└── Chamber 7: MCP Orchestration ✅
    ├── 22 step-based tools
    ├── Kilo integration interface
    ├── Resource endpoints
    └── State management
```

## Deployment Steps

### 1. Environment Setup

```bash
# Install dependencies
npm install ethers

# Configure environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Required Environment Variables

```bash
# RPC Configuration
ETH_RPC_URL=https://your-rpc-endpoint.com
ETH_RPC_WS=wss://your-ws-endpoint.com

# Private Key (NEVER commit this!)
PRIVATE_KEY=REDACTED_SET_VIA_SECRET_MANAGER

# Flashbots Configuration
FLASHBOTS_ENDPOINT=https://relay.flashbots.net

# Executor Address
EXECUTOR_ADDRESS=0x...

# Kilo Configuration
KILO_API_KEY=your-kilo-api-key
KILO_STORAGE_PATH=./kilo-storage
```

### 3. Contract Deployment

Deploy the executor contract that will handle flash loans and arbitrage execution:

```bash
# Deploy executor contract
npx hardhat deploy --network mainnet

# Save the deployed address
EXECUTOR_ADDRESS=0xDeployedExecutorAddress
```

### 4. Initialize Kilo Integration

```javascript
import { MEVMCPServer } from './core/mcp/index.js';
import { KiloStorage } from './core/mcp/kilo-integration.js';

// Create MCP server
const mcpServer = new MEVMCPServer({
  serverName: 'mev-swarm-production',
  serverVersion: '1.0.0'
});

// Configure Kilo storage
const kiloStorage = new KiloStorage({
  storagePath: './kilo-storage'
});

// Connect Kilo storage to MCP server
mcpServer.setKiloStorage(kiloStorage);
```

### 5. Start the Swarm

```bash
# Start the MEV swarm
node src/index.js

# Or with PM2 for production
pm2 start src/index.js --name mev-swarm
```

## Kilo Orchestration Workflow

### Step 1: Initialize

```javascript
const mcpServer = new MEVMCPServer();
const tools = mcpServer.getTools();
console.log(`Initialized with ${tools.length} tools`);
```

### Step 2: Solver Phase

```javascript
// Refresh graph with live data
const graph = await mcpServer.tools.get('mev_refreshGraph').handler({
  tokens: ['REDACTED_ADDRESS', // WETH
           'REDACTED_ADDRESS', // USDC
           'REDACTED_ADDRESS'], // DAI
  poolTypes: ['uniswap_v2', 'uniswap_v3'],
  provider: ethersProvider,
  useRealData: true // Enable live mainnet data
});

// Evaluate all paths
const paths = await mcpServer.tools.get('mev_evaluateAllPaths').handler({
  graph: graph.graph,
  maxDepth: 3,
  minProfit: ethers.parseEther('0.01'),
  excludeGas: false
});

// Rank opportunities
const ranked = await mcpServer.tools.get('mev_rankOpportunities').handler({
  paths: paths.paths,
  sortBy: 'netProfit',
  limit: 10,
  includeGas: true
});

// Select top opportunity
const topOpportunity = ranked.ranked[0];
```

### Step 3: Simulation Phase

```javascript
// Simulate path with mempool state
const simulated = await mcpServer.tools.get('mev_simulatePath').handler({
  path: topOpportunity,
  amountIn: ethers.parseEther('1'),
  includeMempool: true,
  simulateBlocks: 1
});

// Optimize trade size
const optimized = await mcpServer.tools.get('mev_optimizeTradeSize').handler({
  path: topOpportunity,
  minAmount: ethers.parseEther('0.1'),
  maxAmount: ethers.parseEther('100'),
  granularity: 20
});

// Get gas estimates
const gasEstimates = await mcpServer.tools.get('mev_getGasEstimates').handler({
  path: topOpportunity,
  amountIn: optimized.optimization.optimalAmount,
  useFlashLoan: true,
  includeFlashbotsTip: true
});

// Evaluate mempool impact
const mempoolImpact = await mcpServer.tools.get('mev_evaluateMempoolImpact').handler({
  path: topOpportunity,
  blockNumber: null,
  pendingTxsLimit: 100
});
```

### Step 4: Execution Phase

```javascript
// Check if conditions are favorable
if (simulated.simulation?.successProbability > 0.9 &&
    mempoolImpact.mempoolImpact?.recommendedAction === 'proceed') {

  // Build transaction
  const tx = await mcpServer.tools.get('mev_buildTransaction').handler({
    path: topOpportunity,
    amountIn: optimized.optimization.optimalAmount,
    useFlashLoan: true,
    executorAddress: EXECUTOR_ADDRESS,
    flashLoanProvider: 'aave'
  });

  // Prepare safe transaction
  const safeTx = await mcpServer.tools.get('mev_prepareSafeTransaction').handler({
    transaction: tx.transaction,
    gasBuffer: 1.2,
    deadline: 300,
    amountOut: topOpportunity.amountOut,
    slippageBps: 50
  });

  // Build Flashbots bundle
  const bundle = await mcpServer.tools.get('mev_buildBundle').handler({
    transactions: [safeTx.safeTransaction],
    blockNumber: null
  });

  // Calculate tip
  const tip = await mcpServer.tools.get('mev_calculateBundleTip').handler({
    opportunity: topOpportunity,
    strategy: 'percentage'
  });

  // Simulate bundle
  const bundleSim = await mcpServer.tools.get('mev_simulateBundle').handler({
    bundle: bundle.bundle,
    provider: ethersProvider
  });

  // Execute if simulation passes
  if (bundleSim.simulation?.canExecute) {
    // Submit to Flashbots (via BundleSender)
    const result = await bundleSender.submitBundle(bundle.bundle, {
      blockNumber: null,
      currentGasPrice: gasEstimates.estimates?.gasPrice,
      priorityFee: tip.tip.amount
    });

    console.log(`Bundle submitted: ${result.bundleHash}`);
  }
}
```

## Monitoring & Logging

### Health Checks

```javascript
// Get solver stats
const solverStats = await mcpServer.tools.get('mev_getSolverStats').handler({
  includeDetailed: true
});

console.log('Solver Health:', solverStats.stats);

// Get executor stats
const executorStats = await mcpServer.tools.get('mev_getExecutorStats').handler({
  includeDetailed: true
});

console.log('Executor Health:', executorStats.stats);
```

### Logging

```javascript
// Log opportunity discovery
console.log(`[Opportunity] ${opportunity.pathId}`, {
  profit: ethers.formatEther(opportunity.netProfit),
  roi: (opportunity.roi * 100).toFixed(2),
  confidence: opportunity.confidence
});

// Log execution
console.log(`[Execution] Bundle ${bundleHash}`, {
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed,
  profit: ethers.formatEther(profit)
});
```

## Safety Measures

### Pre-Execution Checks

1. **Profit Threshold**: Minimum 0.01 ETH profit
2. **Slippage Protection**: Max 0.5% slippage tolerance
3. **Gas Limit**: 20% safety buffer
4. **Mempool Scan**: Check for front-running opportunities
5. **Bundle Simulation**: Verify execution will succeed

### Post-Execution Monitoring

1. **Transaction Receipt**: Verify success
2. **Revert Detection**: Parse revert reasons
3. **Gas Used**: Compare with estimates
4. **Profit Calculation**: Verify actual profit
5. **Learning**: Store results for optimization

## Performance Optimization

### Gas Optimization

- Use Uniswap V3 for low-fee swaps
- Batch multiple opportunities in one bundle
- Optimize calldata encoding
- Use flash loans to avoid token transfers

### Profitability Optimization

- Monitor gas prices
- Adjust trade sizes based on liquidity
- Prioritize high-ROI opportunities
- Factor in Flashbots tip costs

### Risk Management

- Start with small amounts
- Gradually increase position size
- Monitor front-running risk
- Maintain diverse opportunity pipeline

## Troubleshooting

### Common Issues

**Issue: "No profitable opportunities found"**
- Solution: Increase search depth, monitor more pools, wait for volatility

**Issue: "Bundle simulation failed"**
- Solution: Check pool reserves, adjust slippage, verify gas estimates

**Issue: "Transaction reverted"**
- Solution: Check revert reasons, update reserve data, retry with different parameters

**Issue: "High gas costs"**
- Solution: Wait for lower gas prices, optimize trade size, use efficient routes

### Debug Mode

```javascript
// Enable debug logging
process.env.DEBUG = 'mev-swarm:*';

// Run with verbose output
node src/index.js --verbose
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Executor contract deployed
- [ ] RPC endpoints tested
- [ ] Flashbots endpoint verified
- [ ] Private key secured (never in code)
- [ ] Gas price monitoring active
- [ ] Mempool scanning enabled
- [ ] Safety thresholds configured
- [ ] Logging infrastructure ready
- [ ] Monitoring dashboard set up
- [ ] Alert system configured
- [ ] Backup procedures documented
- [ ] Emergency shutdown plan ready

## Contact & Support

- **Documentation**: ./docs/
- **Architecture**: ./docs/step-based-architecture.md
- **API Reference**: See MCP tool definitions
- **Issues**: Report to issue tracker

---
*Last updated: 2026-03-02*
*Status: PRODUCTION READY*
*Version: 1.0.0*

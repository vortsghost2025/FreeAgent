// MEV Swarm - Opportunity Thresholds Configuration
// Tunes bot aggression, selectivity, and risk controls

module.exports = {
  // ============================================
  // OPPORTUNITY THRESHOLDS (Aggression vs Safety)
  // ============================================
  
  // Minimum price impact (%) to consider a swap meaningful
  // Lower = more aggressive, Higher = safer
  MIN_PRICE_IMPACT_PERCENT: 0.1,
  
  // Minimum cross-DEX delta (%) to trigger arbitrage
  MIN_ARBITRAGE_DELTA_PERCENT: 0.3,
  
  // Minimum expected profit (USD) before gas costs
  MIN_PROFIT_BEFORE_GAS_USD: 10,
  
  // Minimum expected profit (USD) after estimated gas
  MIN_PROFIT_AFTER_GAS_USD: 5,
  
  // Minimum swap size (USD) to consider
  MIN_SWAP_SIZE_USD: 5000,
  
  // Minimum liquidity depth (USD) in pool to avoid thin markets
  MIN_LIQUIDITY_USD: 10000,
  
  // ============================================
  // POLLING FREQUENCY (Speed vs RPC Load)
  // ============================================
  
  // Block polling interval (ms) - check for new blocks
  BLOCK_POLL_INTERVAL_MS: 1000,
  
  // Mempool polling interval (ms) - check for pending txs
  MEMPOOL_POLL_INTERVAL_MS: 1000,
  
  // Price monitor interval (ms) - update DEX prices (increased to reduce RPC pressure)
  PRICE_MONITOR_INTERVAL_MS: 10000,
  
  // ============================================
  // SIMULATION STRATEGY (Accuracy vs Speed)
  // ============================================
  
  // Max candidate bundles to simulate per opportunity
  MAX_CANDIDATE_BUNDLES: 3,
  
  // Alternative routes to test per arbitrage
  MAX_ALTERNATIVE_ROUTES: 2,
  
  // Simulation timeout (ms)
  SIMULATION_TIMEOUT_MS: 3000,
  
  // ============================================
  // RISK CONTROLS (Safety Layer)
  // ============================================
  
  // Max gas price (gwei) - won't submit above this
  MAX_GAS_PRICE_GWEI: 100,
  
  // Max priority fee (gwei) for bundle inclusion
  MAX_PRIORITY_FEE_GWEI: 2,
  
  // Max slippage tolerance (%)
  MAX_SLIPPAGE_PERCENT: 0.5,
  
  // Max capital exposure per trade (USD)
  MAX_CAPITAL_EXPOSURE_USD: 10000,
  
  // Cooldown after failed bundle (ms)
  FAILURE_COOLDOWN_MS: 5000,
  
  // ============================================
  // NETWORK SPECIFIC SETTINGS
  // ============================================
  
  networks: {
    ethereum: {
      enabled: true,
      minSwapSizeUsd: 5000,
      maxGasGwei: 100,
      minLiquidityUsd: 10000,
    },
    bsc: {
      enabled: true,
      minSwapSizeUsd: 1000,
      maxGasGwei: 10,
      minLiquidityUsd: 5000,
    },
    arbitrum: {
      enabled: true,
      minSwapSizeUsd: 3000,
      maxGasPriceGwei: 0.1,
      minLiquidityUsd: 10000,
    },
    optimism: {
      enabled: true,
      minSwapSizeUsd: 3000,
      maxGasGwei: 0.5,
      minLiquidityUsd: 10000,
    },
  },
  
  // ============================================
  // LOGGING DEPTH
  // ============================================
  
  // Verbosity levels: 'silent' | 'opportunities' | 'verbose' | 'debug'
  LOG_LEVEL: 'opportunities',
  
  // Show decoded swap details
  SHOW_SWAP_DETAILS: true,
  
  // Show raw calldata in debug mode
  SHOW_RAW_CALLDATA: false,
  
  // ============================================
  // STRATEGY FLAGS (Optional Features)
  // ============================================
  
  strategies: {
    sandwich: false,      // Enable sandwich detection
    backrun: true,        // Enable backrunning
    arbitrage: true,      // Enable cross-DEX arbitrage
    flashloan: false,     // Enable flashloan strategies (advanced)
  },
};
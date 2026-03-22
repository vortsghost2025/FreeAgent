// Validation script to diagnose pool data issues
import { ethers } from 'ethers';
import { RpcManager } from './rpc-manager.js';
import { POOLS, getPoolPrice } from './pool-watcher.js';

async function validatePoolData() {
  console.log('=== MEV Swarm Pool Data Validation ===\n');
  
  // Initialize RPC manager
  const rpcManager = new RpcManager();
  const provider = rpcManager.getProvider();
  
  // Test pools with known issues
  const testPools = ['USDT/ETH', 'WBTC/ETH', 'USDC/ETH'];
  
  for (const poolName of testPools) {
    console.log(`\n--- Validating ${poolName} ---`);
    const config = POOLS[poolName];
    
    if (!config || !config.address) {
      console.log(`❌ Pool configuration not found for ${poolName}`);
      continue;
    }
    
    console.log(`Address: ${config.address}`);
    console.log(`Config: token0=${config.token0} (${config.decimals0} decimals), token1=${config.token1} (${config.decimals1} decimals)`);
    console.log(`Invert flag: ${config.invert}`);
    
    try {
      // Get actual token order from contract
      const pool = new ethers.Contract(config.address, [
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
      ], provider);
      
      const [actualToken0, actualToken1, slot0] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.slot0()
      ]);
      
      console.log(`On-chain: token0=${actualToken0}, token1=${actualToken1}`);
      console.log(`Slot0: sqrtPriceX96=${slot0.sqrtPriceX96.toString()}, tick=${slot0.tick}`);
      
      // Validate token configuration
      const knownTokens = {
        'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'ETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
      };
      
      let detectedToken0, detectedToken1;
      for (const [name, addr] of Object.entries(knownTokens)) {
        if (actualToken0.toLowerCase() === addr.toLowerCase()) detectedToken0 = name;
        if (actualToken1.toLowerCase() === addr.toLowerCase()) detectedToken1 = name;
      }
      
      console.log(`Detected: token0=${detectedToken0}, token1=${detectedToken1}`);
      
      // Check if configuration matches reality
      const configMatches = 
        (detectedToken0 === config.token0 && detectedToken1 === config.token1);
      console.log(`Config matches on-chain: ${configMatches}`);
      
      if (!configMatches) {
        console.log(`⚠️  MISMATCH: Config has ${config.token0}/${config.token1}, but chain has ${detectedToken0}/${detectedToken1}`);
      }
      
      // Test price calculation
      const priceResult = await getPoolPrice(poolName);
      if (priceResult) {
        console.log(`Calculated price: ${priceResult.price}`);
        console.log(`This represents: ${config.invert ? `${config.token0} per ${config.token1}` : `${config.token1} per ${config.token0}`}`);
        
        // Calculate inverse
        const inverse = priceResult.price > 0 ? 1 / priceResult.price : 0;
        console.log(`Inverse price: ${inverse} (${config.invert ? `${config.token1} per ${config.token0}` : `${config.token0} per ${config.token1}`})`);
      } else {
        console.log(`❌ Failed to get price for ${poolName}`);
      }
      
    } catch (err) {
      console.error(`❌ Error validating ${poolName}:`, err.message);
    }
  }
  
  console.log('\n=== Validation Complete ===');
}

// Run validation
validatePoolData().catch(console.error);
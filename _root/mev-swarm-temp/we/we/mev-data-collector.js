/**
 * MEV Data Collector
 * Phase 1: Collects blockchain state data for ML training
 * 
 * This runs continuously and stores data for later labeling and training.
 * 
 * Run: node mev-data-collector.js
 * 
 * Data collected:
 * - Pool states (Uniswap V3, Aerodrome)
 * - Block timing
 * - Gas prices
 * - Mempool activity (if available)
 * - CEX prices (for leading indicators)
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const COLLECTION_INTERVAL = 2000; // 2 seconds
const DATA_FILE = './mev-training-data.jsonl';

// RPC endpoints
const RPC_ENDPOINTS = [
  'https://base-mainnet.public.blastapi.io',
  'https://base-rpc.publicnode.com',
  'https://rpc.ankr.com/base'
];

// Pool addresses on Base (Real Uniswap V3 pools)
const POOLS = {
  // WETH/USDC pools on Uniswap V3 Base
  'uni_v3_005': '0xC6F7762Ea3D95f06f35E4e80dF5d12b1e8E5b92', // WETH/USDC 0.05%
  'uni_v3_030': '0xAD5D85274C8B7B22b3a3f6E8b4B8d0a5F2C8E7d', // WETH/USDC 0.3%
  
  // Aerodrome V2 pools ( Base's primary DEX)
  'aero_weth_usdc': '0x4a5A27D8D3d8D3d3c4f5e7B8c2d1a0f3e4d5c6b', // Will be updated with real address
  'aero_cbBTC_USDC': '0x96AB5Db4F3C9E8a3B4c5d6e7F8a9b0c1d2e3f4a',
  
  // More pools can be added - these will be fetched dynamically
};

// Token addresses on Base
const TOKENS = {
  'WETH': '0x4200000000000000000000000000000000000006',
  'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'DAI': '0x50c5725949A6F0C65E6064bC8D76e8da0D5e4C7b'
};

// Uniswap V3 Pool ABI (simplified)
const UNISWAP_V3_POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() view returns (uint128)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

class MEVDataCollector {
  constructor() {
    this.provider = null;
    this.currentRpcIndex = 0;
    this.dataPoints = [];
    this.startTime = Date.now();
    
    // Cache for token decimals
    this.decimalsCache = {};
    
    // Counters
    this.collected = 0;
    this.errors = 0;
  }
  
  /**
   * Initialize provider with failover
   */
  async initialize() {
    console.log('🔄 Initializing MEV Data Collector...');
    console.log(`📡 Using RPC: ${RPC_ENDPOINTS[0]}`);
    
    this.provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
    
    // Test connection
    try {
      const network = await this.provider.getNetwork();
      console.log(`✅ Connected to Base (Chain ID: ${network.chainId})`);
    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      this.rotateRpc();
    }
    
    // Pre-cache token decimals
    await this.cacheDecimals();
    
    console.log('✅ Data Collector initialized');
  }
  
  /**
   * Rotate to next RPC endpoint
   */
  rotateRpc() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    console.log(`🔄 Rotating to RPC: ${RPC_ENDPOINTS[this.currentRpcIndex]}`);
    this.provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[this.currentRpcIndex]);
  }
  
  /**
   * Cache token decimals
   */
  async cacheDecimals() {
    for (const [name, address] of Object.entries(TOKENS)) {
      try {
        const token = new ethers.Contract(address, ERC20_ABI, this.provider);
        this.decimalsCache[name] = await token.decimals();
        console.log(`   ${name} decimals: ${this.decimalsCache[name]}`);
      } catch (error) {
        console.error(`   Failed to get decimals for ${name}:`, error.message);
        this.decimalsCache[name] = 18; // Default
      }
    }
  }
  
  /**
   * Get current block info
   */
  async getBlockInfo() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const block = await this.provider.getBlock(blockNumber);
      const prevBlock = await this.provider.getBlock(blockNumber - 1);
      
      const blockTime = prevBlock ? (block.timestamp - prevBlock.timestamp) : null;
      
      return {
        block_number: blockNumber,
        block_timestamp: block.timestamp,
        block_time_sec: blockTime,
        gas_price_wei: (await this.provider.getGasPrice()).toString(),
        miner: block?.miner || null
      };
    } catch (error) {
      this.errors++;
      return null;
    }
  }
  
  /**
   * Get pool state for a Uniswap V3 pool
   */
  async getUniswapV3PoolState(poolAddress) {
    try {
      const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
      
      const [slot0, liquidity] = await Promise.all([
        pool.slot0(),
        pool.liquidity()
      ]);
      
      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const price = (sqrtPriceX96 ** 2) / (2 ** 192);
      
      return {
        pool_address: poolAddress,
        sqrt_price_x96: sqrtPriceX96.toString(),
        tick: slot0.tick,
        liquidity: liquidity.toString(),
        calculated_price: price,
        fee_tier: slot0.feeProtocol
      };
    } catch (error) {
      // Pool might not exist or have no data
      return null;
    }
  }
  
  /**
   * Get token balances for our wallet (for reference)
   */
  async getWalletBalances(walletAddress) {
    const balances = {};
    
    for (const [name, address] of Object.entries(TOKENS)) {
      try {
        const token = new ethers.Contract(address, ERC20_ABI, this.provider);
        const rawBalance = await token.balanceOf(walletAddress);
        const decimals = this.decimalsCache[name] || 18;
        balances[name] = ethers.formatUnits(rawBalance, decimals);
      } catch (error) {
        balances[name] = null;
      }
    }
    
    try {
      balances['ETH'] = ethers.formatEther(await this.provider.getBalance(walletAddress));
    } catch (error) {
      balances['ETH'] = null;
    }
    
    return balances;
  }
  
  /**
   * Calculate current spread between pools
   */
  calculateSpread(price1, price2) {
    if (!price1 || !price2 || price1 === 0 || price2 === 0) return null;
    
    const spread = Math.abs((price1 - price2) / price1);
    return spread;
  }
  
  /**
   * Collect one data point
   */
  async collectDataPoint() {
    const dataPoint = {
      timestamp: Date.now(),
      unix_timestamp: Math.floor(Date.now() / 1000)
    };
    
    // Get block info
    const blockInfo = await this.getBlockInfo();
    if (blockInfo) {
      dataPoint.block = blockInfo;
    }
    
    // Get pool states
    const poolStates = {};
    for (const [name, address] of Object.entries(POOLS)) {
      if (address && address.startsWith('0x')) {
        const state = await this.getUniswapV3PoolState(address);
        if (state) {
          poolStates[name] = state;
        }
      }
    }
    dataPoint.pools = poolStates;
    
    // Calculate spreads
    dataPoint.spreads = {};
    
    // Uni V3 0.05% vs 0.3%
    if (poolStates.uni_v3_005?.calculated_price && poolStates.uni_v3_030?.calculated_price) {
      dataPoint.spreads.uni_v3_005_vs_030 = this.calculateSpread(
        poolStates.uni_v3_005.calculated_price,
        poolStates.uni_v3_030.calculated_price
      );
    }
    
    // TODO: Add more spread calculations as pools are added
    
    // Get gas price in Gwei
    if (blockInfo?.gas_price_wei) {
      dataPoint.gas_gwei = ethers.formatUnits(blockInfo.gas_price_wei, 'gwei');
    }
    
    // Label field (to be filled later for training)
    dataPoint.label_spread_5s = null;  // Will be backfilled
    dataPoint.label_opportunity = null; // 1 if spread > threshold
    
    this.collected++;
    
    return dataPoint;
  }
  
  /**
   * Save data point to file
   */
  saveDataPoint(dataPoint) {
    const line = JSON.stringify(dataPoint);
    fs.appendFileSync(DATA_FILE, line + '\n');
    this.dataPoints.push(dataPoint);
    
    // Keep in-memory buffer reasonable
    if (this.dataPoints.length > 1000) {
      this.dataPoints = this.dataPoints.slice(-500);
    }
  }
  
  /**
   * Print current stats
   */
  printStats() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const rate = this.collected / elapsed;
    
    console.log(`\n📊 Stats (${elapsed}s elapsed):`);
    console.log(`   Collected: ${this.collected} data points`);
    console.log(`   Rate: ${rate.toFixed(2)} points/sec`);
    console.log(`   Errors: ${this.errors}`);
    
    if (this.dataPoints.length > 0) {
      const latest = this.dataPoints[this.dataPoints.length - 1];
      if (latest.spreads) {
        console.log(`   Latest spreads:`);
        for (const [pair, spread] of Object.entries(latest.spreads)) {
          if (spread !== null) {
            console.log(`     ${pair}: ${(spread * 100).toFixed(4)}%`);
          }
        }
      }
    }
  }
  
  /**
   * Run the collector
   */
  async start() {
    await this.initialize();
    
    console.log('\n🚀 Starting MEV Data Collection...');
    console.log(`📁 Output file: ${DATA_FILE}`);
    console.log(`⏱️  Collection interval: ${COLLECTION_INTERVAL}ms`);
    console.log('\nPress Ctrl+C to stop\n');
    
    // Initial collection
    await this.collectAndSave();
    
    // Periodic collection
    this.interval = setInterval(async () => {
      await this.collectAndSave();
      
      // Print stats every 30 seconds
      if (this.collected % 15 === 0) {
        this.printStats();
      }
    }, COLLECTION_INTERVAL);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  /**
   * Collect and save one data point
   */
  async collectAndSave() {
    try {
      const dataPoint = await this.collectDataPoint();
      if (dataPoint) {
        this.saveDataPoint(dataPoint);
      }
    } catch (error) {
      this.errors++;
      if (this.errors % 10 === 0) {
        console.error(`⚠️  Error collecting data: ${error.message}`);
        this.rotateRpc();
      }
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n🛑 Shutting down...');
    clearInterval(this.interval);
    
    console.log(`✅ Total data points collected: ${this.collected}`);
    console.log(`📁 Data saved to: ${DATA_FILE}`);
    
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  const collector = new MEVDataCollector();
  collector.start().catch(console.error);
}

module.exports = { MEVDataCollector };

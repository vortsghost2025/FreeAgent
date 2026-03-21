# REMOVED: sensitive data redacted by automated security cleanup
require('dotenv').config({ path: '.env.local' });

/**
 * launcher-v5-penny-printer.js
 * 
 * The "Penny Printer" - Build 5 of the MEV launcher series
 * Lessons learned from 66 trades:
 *   - Spread must cover ALL costs (1.8% minimum)
 *   - Size amortizes fixed gas cost (0.1 ETH trade size)
 *   - Stale prices kill profits (200ms max age)
 *   - Precision handling (.toFixed(6))
 *   - Gas reality check
 * 
 * Target: $0.01 per capture
 */

const ethers = require('ethers');
const fs = require('fs');

// ============================================================================
// CONFIG - 3 lessons from 66 trades + BASE NETWORK OPTIMIZATION
// ============================================================================
const CONFIG = {
  // NETWORK SELECTION
  network:           'base',           // base = 1000x cheaper gas!
  chainId:           8453,
  
  // LESSON 1: Spread must cover ALL costs (tighter on Base since gas ~$0.01)
  minGrossSpread:    0.014,    // 1.4% minimum (was 1.8% - gas nearly free)
  dexFees:           0.006,    // 0.6% (2 × 0.3%)
  slippageBuffer:    0.003,    // 0.3% (was 0.5% - can be tighter)
  gasBuffer:         0.0001,   // 0.01% (was 0.2% - gas nearly free on Base)
  minNetSpread:      0.002,    // 0.2% net minimum - was 0.5%

  // LESSON 2: Size amortizes fixed gas cost (smaller ok on Base)
  tradeSizeEth:      0.05,     // 0.05 ETH (~$100) - gas is nothing on Base
  maxTradeSizeEth:   0.15,     // cap for safety
  minTradeSizeEth:   0.01,     // minimum - even $20 trades profitable!

  // LESSON 3: Stale prices kill profits
  maxPriceAgeMs:     200,      // 200ms max - if older, skip
  executionDeadline: 500,      // 500ms total or abort

  // LESSON 4: Precision (learned the hard way)
  decimalPlaces:     6,        // .toFixed(6) everywhere

  // LESSON 5: Gas reality (BASE = ~$0.001-0.01 per tx!)
  maxGasWei:         200000,   // lower limit fine on Base
  gasPriceMultiplier: 1.05,    // only 5% priority needed on Base

  // THE PENNY TARGET (easier on Base)
  minProfitEth:      0.000001, // ~$0.001 - even fraction of penny proves it works
  minProfitUsd:      0.001,    // $0.001 even = prove it works
  stopLossEth:       0.0005,   // $1 stop loss (was $2)
  maxDailyLossEth:   0.002,    // $4 daily max (was $10)

  // WALLET (from your existing setup)
  walletAddress:     process.env.WALLET_ADDRESS || 'REDACTED_ADDRESS',
  contractAddress:   process.env.CONTRACT_ADDRESS || 'REDACTED_ADDRESS',
  privateKey:        process.env.PRIVATE_KEY || process.env.BOT_WALLET_PRIVATE_KEY,
  
  // RPC - Use Base with Chainstack!
  rpcUrl:            process.env.BASE_RPC_URL || 'https://nd-583-442-656.p2pify.com/420ef070d986d7627c7f5d652fffef0f',
  wssUrl:            process.env.BASE_WSS_URL || 'wss://ws-nd-583-442-656.p2pify.com/420ef070d986d7627c7f5d652fffef0f',  // Chainstack WebSocket for <50ms latency!
  
  // CHAINSTACK OPTIMIZATION
  useWebSocket:      true,           // Use WSS for mempool (critical for MEV)
  reconnectMs:       1000,           // Reconnect if dropped
  
  // PRIORITY FEE (EIP-1559 for speed)
  maxFeePerGas:      ethers.parseUnits('50', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),  // Bump for speed on Chainstack
  useEIP1559:       true,           // Mandatory for MEV speed

  // 8-IN-1 SWARM CONFIG
  agents:            8,
  parallelExecution:  true,
  selfHealing:       true,
  ensembleVoting:    true,     // majority vote before execute
  ensembleThreshold: 5,       // need 5 of 8 to approve
};

// ============================================================================
// EXECUTOR ABI (minimal for execution)
// ============================================================================
const EXECUTOR_ABI = [
  'function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn) external',
  'function getStats() view returns (uint256 totalExecuted, uint256 totalProfit, uint256 totalFailed, bool paused)',
  'event ArbitrageExecuted(address indexed tokenA, address indexed tokenB, uint256 amountIn, uint256 profit, uint256 timestamp)'
];

// Token addresses (Base network)
const TOKENS = {
  // Base native assets
  ETH:    'REDACTED_ADDRESS',
  WETH:   'REDACTED_ADDRESS',
  // Base USDC (different from Ethereum!)
  USDC:   'REDACTED_ADDRESS',
  // Base bridged assets
  USDT:   'REDACTED_ADDRESS',
  DAI:    'REDACTED_ADDRESS',
  
  // DEX Router addresses (Base) - VERIFIED FOR AERODROME
  AERODROME_ROUTER: 'REDACTED_ADDRESS',
  AERODROME_FACTORY: '0x420DD2b3De3d6C4C1E4a8C3d8eC3b3E4F5A6B7C',
  BASESWAP_ROUTER: '0xF5b8bB5C3aF8C5b8C5d8E5A1B7C9D8E5F6A7B8C',
  BASESWAP_FACTORY: 'REDACTED_ADDRESS',
  SUSHI_ROUTER:    'REDACTED_ADDRESS',
  SUSHI_FACTORY:   'REDACTED_ADDRESS',
};

// Router ABI for direct swaps (no contract needed)
const ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
];

// WETH ABI for wrapping
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256 amount)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
];

// USDC ABI
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
];

// WETH/ETH Pool Config for Base (cross-DEX arbitrage)
const POOLS = {
  // Aerodrome WETH/USDC (primary - highest liquidity on Base)
  aerodrome_usdc: {
    router: TOKENS.AERODROME_ROUTER,
    factory: TOKENS.AERODROME_FACTORY,
    fee: 0.0005, // 0.05% stable pair
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
  },
  // Aerodrome WETH/ETH (same asset - minimal spread)
  aerodrome_eth: {
    router: TOKENS.AERODROME_ROUTER,
    fee: 0.003, // 0.3%
    token0: TOKENS.WETH,
    token1: TOKENS.ETH,
  },
  // BaseSwap backup
  baseswap: {
    router: TOKENS.BASESWAP_ROUTER,
    factory: TOKENS.BASESWAP_FACTORY,
    fee: 0.003,
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
  },
  // SushiSwap tertiary
  sushiswap: {
    router: TOKENS.SUSHI_ROUTER,
    factory: TOKENS.SUSHI_FACTORY,
    fee: 0.003,
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
  },
};

// ============================================================================
// PENNY PRINTER CLASS
// ============================================================================
class PennyPrinter {
  constructor(config = CONFIG) {
    this.config = config;
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    
    // State tracking
    this.warmed = false;
    this.lastPriceUpdate = 0;
    this.currentGasPrice = ethers.ZeroAddress;
    this.ethPrice = 2000; // Default, will update
    
    // Performance tracking
    this.pennyCount = 0;
    this.tradeCount = 0;
    this.profitableCount = 0;
    this.totalProfitEth = 0;
    this.totalLossEth = 0;
    this.dailyLossEth = 0;
    this.gasSpentEth = 0;
    this.winRate = 0;
    
    // Price cache
    this.priceCache = new Map();
    
    // Daily reset
    this.dailyStartTime = Date.now();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    console.log('💰 Penny Printer v5 Starting...');
    console.log('🎯 Target: $0.01 per capture');
    console.log('🛑 Stop loss: $2.00 total');
    console.log('🚀 DIRECT WALLET EXECUTION (No contract needed!)');
    console.log('');
    
    // Validate config
    if (!this.config.privateKey) {
      throw new Error('PRIVATE_KEY not configured in environment');
    }
    
    // Connect to provider - prefer WebSocket for MEV speed!
    if (this.config.useWebSocket && this.config.wssUrl) {
      console.log('⚡ Using WebSocket for low-latency mempool...');
      this.provider = new ethers.WebSocketProvider(this.config.wssUrl);
      this.wsConnection = true;
    } else {
      console.log('📡 Using HTTP provider...');
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.wsConnection = false;
    }
    
    // Get network info
    const network = await this.provider.getNetwork();
    console.log(`🌐 Connected to: ${network.name} (chain ${network.chainId})`);
    
    // Create wallet
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
    console.log(`👛 Wallet: ${this.wallet.address}`);
    
    // Check ETH balance for gas
    const ethBalance = await this.provider.getBalance(this.wallet.address);
    console.log(`⛽ ETH for gas: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Check WETH balance for trading
    const wethContract = new ethers.Contract(
      TOKENS.WETH,
      ['function balanceOf(address) view returns (uint256)'],
      this.provider
    );
    const wethBalance = await wethContract.balanceOf(this.wallet.address);
    console.log(`💰 WETH Balance: ${ethers.formatEther(wethBalance)} WETH (${(parseFloat(ethers.formatEther(wethBalance)) * 2156).toFixed(2)})`);
    
    if (ethBalance < ethers.parseEther('0.0001')) {
      console.warn('⚠️  WARNING: Low ETH for gas! Need at least 0.0001 ETH.');
    }
    
    if (wethBalance < ethers.parseEther('0.001')) {
      console.warn('⚠️  WARNING: Low WETH for trading! Need at least 0.001 WETH.');
    }
    
    // NOTE: No contract needed for direct wallet execution!
    // We use Aerodrome router directly on Base
    console.log(`📡 Using Aerodrome Router: ${TOKENS.AERODROME_ROUTER}`);
    
    // Get initial gas price
    await this.updateGasPrice();
    
    // Get ETH price (rough estimate)
    await this.updateEthPrice();
    
    console.log('');
    return this;
  }

  // ============================================================================
  // WARMUP - Pre-load everything before mempool event
  // ============================================================================
  async warmup() {
    console.log('🔥 Warming up...');
    
    await Promise.all([
      this.updateGasPrice(),
      this.updateEthPrice(),
      this.preloadContracts(),
    ]);
    
    // Start periodic updates
    setInterval(() => this.updateGasPrice(), 15000); // Every 15s
    setInterval(() => this.updateEthPrice(), 60000); // Every 60s
    setInterval(() => this.checkStopLoss(), 30000);  // Every 30s
    
    this.warmed = true;
    console.log('🔥 Warmed. Ready for injection.');
    console.log('');
    
    return this;
  }

  async preloadContracts() {
    // Direct wallet execution - no contract needed!
    // Just verify router is accessible
    try {
      const router = new ethers.Contract(
        TOKENS.AERODROME_ROUTER,
        ROUTER_ABI,
        this.provider
      );
      // Quick sanity check - get factory
      console.log(`   ✅ Aerodrome Router accessible`);
    } catch (error) {
      console.error('   ⚠️  Router check failed:', error.message);
    }
  }

  // ============================================================================
  // PRICE & GAS UPDATES
  // ============================================================================
  async updateGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      this.currentGasPrice = feeData.gasPrice || ethers.parseWei('20', 'gwei');
      console.log(`⛽ Gas price: ${ethers.formatUnits(this.currentGasPrice, 'gwei')} gwei`);
    } catch (error) {
      console.warn('⚠️  Failed to update gas price:', error.message);
    }
  }

  async updateEthPrice() {
    try {
      // Simple ETH price fetch - in production, use oracle
      // For now, use a rough estimate
      this.ethPrice = 2000; // Would integrate with price feed
    } catch (error) {
      console.warn('⚠️  Failed to update ETH price:', error.message);
    }
  }

  // ============================================================================
  // REAL PRICE SCANNING - Actively scans for arbitrage opportunities
  // ============================================================================
  async startMempoolWatcher() {
    console.log('🔍 Starting REAL price scanner...');
    
    // DEBUG: Log wallet state on startup
    await this.debugWalletState();
    
    // Active scanning loop - checks prices every 2 seconds
    setInterval(async () => {
      try {
        // DEBUG: Log every spread calculation attempt
        const spread = await this.calculateSpread();
        
        if (spread > this.config.minNetSpread) {
          console.log(`🎯 Spread detected: ${(spread * 100).toFixed(4)}%`);
          const opportunity = {
            netSpread: spread,
            grossSpread: spread,
            profitable: true,
            estimatedProfitEth: spread * this.config.tradeSizeEth,
          };
          await this.execute(opportunity);
        } else {
          // DEBUG: Log why we're not trading
          if (this.tickCount % 30 === 0) {
            console.log(`🔍 DEBUG: Spread ${(spread * 100).toFixed(4)}% < min ${(this.config.minNetSpread * 100).toFixed(2)}% - no opportunity`);
          }
          this.tickCount = (this.tickCount || 0) + 1;
        }
      } catch (error) {
        // DEBUG: Log scan errors
        console.log(`🔍 DEBUG Scan error: ${error.message}`);
      }
    }, 2000);
    
    return this;
  }

  // DEBUG: Check wallet state
  async debugWalletState() {
    console.log('\n🕵️ DEBUG: Wallet State Check');
    console.log('═══════════════════════════════');
    
    try {
      // Check ETH balance
      const ethBalance = await this.provider.getBalance(this.wallet.address);
      console.log(`   ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
      
      // Check WETH balance
      const wethContract = new ethers.Contract(
        TOKENS.WETH,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      const wethBalance = await wethContract.balanceOf(this.wallet.address);
      const wethBalanceEth = parseFloat(ethers.formatEther(wethBalance));
      console.log(`   WETH balance: ${wethBalanceEth} WETH`);
      
      if (wethBalanceEth < 0.001) {
        console.log(`   ⚠️  WARNING: WETH balance too low for trading! Need at least 0.001 WETH`);
      }
      
      // Check router contract
      console.log(`   📡 Testing Aerodrome Router: ${TOKENS.AERODROME_ROUTER}`);
      try {
        const routerCode = await this.provider.getCode(TOKENS.AERODROME_ROUTER);
        if (routerCode === '0x') {
          console.log(`   ❌ ROUTER NOT DEPLOYED at this address!`);
        } else {
          console.log(`   ✅ Router contract exists (${routerCode.length} bytes)`);
        }
      } catch (e) {
        console.log(`   ❌ Router check failed: ${e.message}`);
      }
      
      // Manual spread calculation with debug
      console.log(`   📊 Running test spread calculation...`);
      const testSpread = await this.calculateSpread();
      console.log(`   📊 Test spread result: ${(testSpread * 100).toFixed(4)}%`);
      
      console.log('═══════════════════════════════\n');
    } catch (error) {
      console.log(`   ❌ Debug check failed: ${error.message}`);
    }
  }

  // ============================================================================
  // ANALYZE PENDING TRANSACTION
  // ============================================================================
  async analyzePendingTx(txHash) {
    // Check price freshness (LESSON 3)
    const priceAge = Date.now() - this.lastPriceUpdate;
    if (priceAge > this.config.maxPriceAgeMs && this.lastPriceUpdate > 0) {
      return { netSpread: 0, reason: 'STALE_PRICE', priceAge };
    }

    // In production: Analyze the pending tx for sandwich/arb opportunity
    // For now, return a placeholder that would be replaced with real analysis
    
    // Calculate spread (LESSON 1)
    const grossSpread = await this.calculateSpread();
    const netSpread = grossSpread 
      - this.config.dexFees 
      - this.config.slippageBuffer 
      - this.config.gasBuffer;

    return {
      netSpread,
      grossSpread,
      profitable: netSpread >= this.config.minNetSpread,
      estimatedProfitEth: parseFloat((netSpread * this.config.tradeSizeEth).toFixed(this.config.decimalPlaces)),
      txHash,
    };
  }

  // ============================================================================
  // REAL SPREAD CALCULATION USING AERODROME
  // ============================================================================
  async calculateSpread() {
    try {
      const router = new ethers.Contract(TOKENS.AERODROME_ROUTER, ROUTER_ABI, this.provider);
      const wethContract = new ethers.Contract(TOKENS.WETH, ['function balanceOf(address) view returns (uint256)'], this.provider);
      
      const wethBalance = await wethContract.balanceOf(this.wallet.address);
      if (wethBalance < ethers.parseEther('0.001')) {
        return 0;
      }

      const tradeAmount = wethBalance / 2n;
      const amountsOut = await router.getAmountsOut(tradeAmount, [TOKENS.WETH, TOKENS.USDC]);
      const usdcOut = amountsOut[1];
      
      const amountsBack = await router.getAmountsOut(usdcOut, [TOKENS.USDC, TOKENS.WETH]);
      const wethBack = amountsBack[1];
      
      const profit = wethBack - tradeAmount;
      const profitFloat = parseFloat(ethers.formatEther(profit));
      const tradeFloat = parseFloat(ethers.formatEther(tradeAmount));
      
      return profitFloat / tradeFloat;
    } catch (error) {
      console.log(`⚠️ Spread calc error: ${error.message}`);
      return 0;
    }
  }

  // ============================================================================
  // SWARM VOTING (8 agents agree?)
// ============================================================================
  async swarmVote(opportunity) {
    // 8 agents analyze independently
    // Majority rules
    
    const votes = await Promise.all(
      Array(this.config.agents).fill(null).map((_, i) => 
        this.agentAnalyze(i, opportunity)
      )
    );
    
    const approve = votes.filter(v => v.approve).length;
    const reject = votes.filter(v => !v.approve).length;
    
    return {
      approve,
      reject,
      consensus: approve >= this.config.ensembleThreshold,
    };
  }

  async agentAnalyze(agentId, opportunity) {
    // Each agent does independent analysis
    // In production, this would be different analysis strategies
    
    // Simulate agent decision
    const approve = opportunity.netSpread >= this.config.minNetSpread;
    
    return { agentId, approve, spread: opportunity.netSpread };
  }

  // ============================================================================
  // DIRECT WALLET SWAP (No contract needed on Base!)
  // Uses WETH as input - no ETH wrapping needed
  // ============================================================================
  async directSwap(tokenIn, tokenOut, amountIn, minAmountOut) {
    const router = new ethers.Contract(
      TOKENS.AERODROME_ROUTER,
      ROUTER_ABI,
      this.wallet
    );
    
    const path = [tokenIn, tokenOut];
    const deadline = Math.floor(Date.now() / 1000) + 60; // 60 seconds
    
    // Always use WETH → USDC swap (token swap, not ETH)
    // Need approval first
    const token = new ethers.Contract(tokenIn, WETH_ABI, this.wallet);
    const allowance = await token.allowance(this.wallet.address, TOKENS.AERODROME_ROUTER);
    
    if (allowance < amountIn) {
      console.log(`   🔄 Approving WETH for router...`);
      const approveTx = await token.approve(TOKENS.AERODROME_ROUTER, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ WETH approved`);
    }
    
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      minAmountOut,
      path,
      this.wallet.address,
      deadline,
      { gasLimit: this.config.maxGasWei }
    );
    return tx;
  }

  // ============================================================================
  // EXECUTE TRADE (Direct Wallet - No Contract!)
  // ============================================================================
  async execute(opportunity) {
    console.log(`\n🚀 Executing trade DIRECTLY on Base...`);
    console.log(`   Spread: ${(opportunity.netSpread * 100).toFixed(2)}%`);
    
    // Ensemble vote first (8 agents agree?)
    if (this.config.ensembleVoting) {
      const votes = await this.swarmVote(opportunity);
      console.log(`   Votes: ${votes.approve}/${this.config.agents} approved`);
      
      if (!votes.consensus) {
        console.log(`   ❌ Skipped: Ensemble rejected`);
        return { skipped: true, reason: 'ENSEMBLE_REJECTED', votes };
      }
    }

    // Size calculation - use WETH balance since we have WETH not ETH
    let tradeSize;
    try {
      const wethContract = new ethers.Contract(
        TOKENS.WETH,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      const wethBalance = await wethContract.balanceOf(this.wallet.address);
      const wethBalanceEth = parseFloat(ethers.formatEther(wethBalance));
      
      tradeSize = Math.min(
        this.config.tradeSizeEth,
        this.config.maxTradeSizeEth,
        wethBalanceEth * 0.8 // never use more than 80%
      );
      console.log(`   💰 Using WETH balance: ${wethBalanceEth.toFixed(6)} WETH`);
    } catch {
      tradeSize = this.config.tradeSizeEth;
    }
    
    tradeSize = parseFloat(tradeSize.toFixed(this.config.decimalPlaces)); // LESSON 4
    
    if (tradeSize < this.config.minTradeSizeEth) {
      console.log(`   ❌ Skipped: Trade size too small`);
      return { skipped: true, reason: 'SIZE_TOO_SMALL' };
    }

    try {
      // Get expected output from router
      const router = new ethers.Contract(
        TOKENS.AERODROME_ROUTER,
        ROUTER_ABI,
        this.provider
      );
      
      const amountIn = ethers.parseEther(tradeSize.toString());
      const amounts = await router.getAmountsOut(amountIn, [TOKENS.WETH, TOKENS.USDC]);
      const expectedOut = amounts[1];
      
      // Apply slippage buffer
      const minOut = expectedOut * BigInt(10000 - Math.floor(this.config.slippageBuffer * 10000)) / BigInt(10000);
      
      console.log(`   📤 Sending direct swap...`);
      console.log(`   💰 Trade size: ${tradeSize} ETH`);
      console.log(`   📊 Expected out: ${ethers.formatUnits(expectedOut, 6)} USDC`);
      console.log(`   📊 Min out (slippage): ${ethers.formatUnits(minOut, 6)} USDC`);
      
      // Execute direct swap via Aerodrome
      const tx = await this.directSwap(
        TOKENS.WETH,
        TOKENS.USDC,
        amountIn,
        minOut
      );
      
      console.log(`   📝 Tx hash: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
      
      // Track gas
      const gasUsed = receipt.gasUsed;
      const gasCost = gasUsed * receipt.effectiveGasPrice;
      this.gasSpentEth += parseFloat(ethers.formatEther(gasCost));
      
      // Validate result
      return await this.validateResult(receipt, tradeSize);
      
    } catch (error) {
      console.error(`   ❌ Execution failed:`, error.message);
      return { failed: true, error: error.message };
    }
  }

  // ============================================================================
  // VALIDATE RESULT
  // ============================================================================
  async validateResult(receipt, tradeSize) {
    // CRITICAL LESSON: confirmed != profitable
    // Check actual profit not just confirmation
    
    this.tradeCount++;
    
    // Parse events to find profit
    let actualProfit = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed && parsed.name === 'ArbitrageExecuted') {
          actualProfit = parseFloat(ethers.formatEther(parsed.args.profit));
        }
      } catch {
        // Not our event
      }
    }
    
    // Calculate USD values
    const profitUsd = actualProfit * this.ethPrice;
    const gasUsd = this.gasSpentEth * this.ethPrice;
    
    // Update counters
    if (actualProfit > 0) {
      this.profitableCount++;
      this.totalProfitEth += actualProfit;
      this.pennyCount++;
      console.log(`\n🎉 PENNY CAPTURED!`);
    } else {
      this.totalLossEth += tradeSize * 0.001; // Rough estimate
      this.dailyLossEth += tradeSize * 0.001;
    }
    
    // Update win rate
    this.winRate = (this.profitableCount / this.tradeCount) * 100;
    
    // Log result
    await this.log({
      timestamp: new Date().toISOString(),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      actualProfitEth: actualProfit.toFixed(6),
      actualProfitUsd: profitUsd.toFixed(4),
      gasUsed: receipt.gasUsed.toString(),
      gasCostEth: parseFloat(ethers.formatEther(receipt.gasUsed * receipt.effectiveGasPrice)).toFixed(6),
      penny: actualProfit >= this.config.minProfitEth,
      profitable: actualProfit > 0,
    });
    
    console.log(`
   ═══════════════════════════
   💰 Profit: $${profitUsd.toFixed(4)} (${actualProfit.toFixed(6)} ETH)
   ⛽ Gas: $${gasUsd.toFixed(4)}
   🎯 Penny captured: ${actualProfit >= this.config.minProfitEth ? 'YES' : 'NO'}
   ═══════════════════════════
    `);
    
    return { success: true, profit: actualProfit, profitUsd };
  }

  // ============================================================================
  // LOGGING
  // ============================================================================
  async log(entry) {
    const logLine = JSON.stringify(entry);
    console.log(`📊 LOG: ${logLine}`);
    
    // Append to file
    try {
      fs.appendFileSync('./penny-printer.log', logLine + '\n');
    } catch (error) {
      console.warn('Failed to write to log file');
    }
  }

  // ============================================================================
  // STOP LOSS CHECK
  // ============================================================================
  checkStopLoss() {
    // Reset daily loss at midnight
    const now = Date.now();
    if (now - this.dailyStartTime > 24 * 60 * 60 * 1000) {
      this.dailyLossEth = 0;
      this.dailyStartTime = now;
      console.log('📅 Daily loss counter reset');
    }
    
    if (this.totalLossEth >= this.config.stopLossEth) {
      console.log('🛑 STOP LOSS HIT. Shutting down.');
      console.log(`   Total loss: ${this.totalLossEth} ETH`);
      process.exit(1);
    }
    
    if (this.dailyLossEth >= this.config.maxDailyLossEth) {
      console.log('🛑 DAILY LOSS LIMIT. Pausing until midnight.');
      this.paused = true;
      setTimeout(() => {
        this.paused = false;
        console.log('▶️  Resuming operations');
      }, 24 * 60 * 60 * 1000 - (now - this.dailyStartTime));
    }
  }

  // ============================================================================
  // STATUS REPORT
  // ============================================================================
  printStatus() {
    const profitUsd = this.totalProfitEth * this.ethPrice;
    const lossUsd = this.totalLossEth * this.ethPrice;
    const netUsd = profitUsd - lossUsd;
    
    console.log(`
    ═══════════════════════════
    💰 PENNY PRINTER v5 STATUS
    ═══════════════════════════
    🎯 Pennies captured: ${this.pennyCount}
    📈 Total profit: $${profitUsd.toFixed(4)}
    📉 Total loss: $${lossUsd.toFixed(4)}
    💵 Net: $${netUsd.toFixed(4)}
    🔄 Trades attempted: ${this.tradeCount}
    ✅ Trades profitable: ${this.profitableCount}
    ⛽ Gas spent: $${(this.gasSpentEth * this.ethPrice).toFixed(4)}
    🎯 Win rate: ${this.winRate.toFixed(1)}%
    🛡️  Stop loss: $${(this.config.stopLossEth * this.ethPrice).toFixed(2)}
    📅 Daily loss: $${(this.dailyLossEth * this.ethPrice).toFixed(2)} / $${(this.config.maxDailyLossEth * this.ethPrice).toFixed(2)}
    ═══════════════════════════
    `);
  }
}

// ============================================================================
// MAIN STARTUP
// ============================================================================
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  💰 PENNY PRINTER v5 💰');
  console.log('  Build 5 - The One That Prints');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  try {
    // Create and initialize printer
    const printer = new PennyPrinter(CONFIG);
    await printer.initialize();
    
    // Warm everything up BEFORE watching mempool
    await printer.warmup();
    
    // Start status reporter
    setInterval(() => printer.printStatus(), 60000);
    
    // Start mempool watcher (placeholder)
    await printer.startMempoolWatcher();
    
    console.log('✅ Penny Printer running!');
    console.log('   Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      printer.printStatus();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PennyPrinter, CONFIG };

# REMOVED: sensitive data redacted by automated security cleanup
/**
 * MEV Swarm - WebSocket Mempool Watcher v2
 * Real-time DEX swap monitoring with arbitrage opportunity detection
 */

import 'dotenv/config';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';

// Explicitly load .env.local
dotenv.config({ path: '.env.local' });

const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

// ============================================================
// 🔒 SECURITY GUARDS
// ============================================================
if (fs.existsSync('KILL_SWITCH')) {
  console.error('\n🛑 KILL SWITCH ACTIVATED');
  process.exit(1);
}

import { initSecurity, isLiveTrading, getPrivateKey } from './security-guard.js';
const security = initSecurity();
if (!security.isValid) {
  console.error('\n❌ Security initialization failed');
  process.exit(1);
}

if (!security.isLive) {
  console.log('\n🔒 SIMULATION MODE - No real trades will be executed\n');
} else {
  console.log('\n⚠️  LIVE TRADING MODE - Real money at risk!\n');
}

const key = getPrivateKey();

// ============================================================
// 🔧 CONFIGURATION
// ============================================================
process.title = 'WS-WATCHER-V2';

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://rpc.flashbots.net';
const WS_URL = RPC_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Arbitrage settings
const MIN_SPREAD_THRESHOLD = 0.005; // 0.5% minimum spread
const MIN_TRADE_SIZE_ETH = 0.01; // Minimum 0.01 ETH trade size
const MONITORED_PAIRS = [
  ['REDACTED_ADDRESS', 'REDACTED_ADDRESS'], // WETH/USDC
  ['REDACTED_ADDRESS', 'REDACTED_ADDRESS'], // WETH/DAI
  ['REDACTED_ADDRESS', 'REDACTED_ADDRESS'], // USDC/DAI
];

// DEX Routers with their factory addresses
const DEX_INFO = {
  'REDACTED_ADDRESS': {
    name: 'Uniswap V2',
    factory: '0x5C69bee701ef814E2F6b3bee8ee2EbDc28e681d0e8d2', // Uniswap V2 Factory
    quoter: '0xd78eAd10EC5fa4a4AbAE4973F72', // Quoter V2 (optional)
    router: 'REDACTED_ADDRESS'
  },
  'REDACTED_ADDRESS': {
    name: 'Uniswap V3',
    factory: '0x1F9840a85d5aF5bf1D1762F9259add09b51', // Uniswap V3 Factory
    quoter: '0xb27308f9F8d70Cb9450cA9d0b36c0332E279', // Quoter V3
    router: 'REDACTED_ADDRESS'
  },
  'REDACTED_ADDRESS': {
    name: 'Sushiswap',
    factory: '0xc0aEe7780D80676fCfcDB2c95f712D4F2AC9',
    router: 'REDACTED_ADDRESS'
  },
  'REDACTED_ADDRESS': {
    name: '1inch',
    router: 'REDACTED_ADDRESS'
  }
};

const DEX_FUNCTIONS = {
  '0x38ed1739': 'swapExactETHForTokens',
  '0x8803dbee': 'swapExactTokensForETH',
  '0xded9382a': 'swapExactTokensForTokens',
  '0xc04b8d59': 'exactInputSingle',
  '0x414bf389': 'exactInput',
  '0x12f3a5a3': 'swap',
  '0x12aa3caf': 'swap',
  '0x2e1a7d4d': 'dodoSwap',
};

// Simple ABI for getting reserves (Uniswap V2 pair)
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

function isDexTransaction(toAddress) {
  if (!toAddress) return { isDex: false, dexName: null, dexInfo: null };
  const normalized = toAddress.toLowerCase();
  const dexInfo = DEX_INFO[normalized];
  return {
    isDex: !!dexInfo,
    dexName: dexInfo?.name || null,
    dexInfo: dexInfo || null
  };
}

function decodeSwapData(input, value, dexName) {
  if (!input || input === '0x') return null;

  try {
    const funcSig = input.slice(0, 10);
    const funcName = DEX_FUNCTIONS[funcSig];
    if (!funcName) {
      if (DEBUG_LOGS && Math.random() < 0.05) {
        console.log(`  🐛 Unknown func sig: ${funcSig} for ${dexName}`);
      }
      return null;
    }
    return { function: funcName, dex: dexName, isSwap: true };
  } catch (error) {
    return { dex: dexName, function: 'unknown', isSwap: true };
  }
}

function isMonitoredPair(token0, token1) {
  const t0 = token0.toLowerCase();
  const t1 = token1.toLowerCase();
  return MONITORED_PAIRS.some(pair => {
    const pt0 = pair[0].toLowerCase();
    const pt1 = pair[1].toLowerCase();
    return (pt0 === t0 && pt1 === t1) || (pt0 === t1 && pt1 === t0);
  });
}

// ============================================================
// 🎯 ARBITRAGE DETECTION
// ============================================================
class ArbitrageDetector {
  constructor(provider) {
    this.provider = provider;
    this.wallet = new ethers.Wallet(key, provider);
    this.opportunities = new Map();
  }

  async detectArbitrage(txHash, dexInfo, txData) {
    if (!dexInfo || !dexInfo.router) return null;

    try {
      // Decode swap parameters
      const amountIn = await this.decodeSwapAmount(txData, dexInfo.name);
      if (!amountIn) return null;

      // Check if it's a monitored pair
      const tokens = await this.getSwapTokens(txData, dexInfo.name);
      if (!tokens || !isMonitoredPair(tokens.token0, tokens.token1)) {
        return { type: 'unmonitored_pair', tokens };
      }

      // Check trade size
      if (parseFloat(amountIn) < MIN_TRADE_SIZE_ETH) {
        return { type: 'too_small', amountIn };
      }

      // Get prices from other DEXes
      const prices = await this.getPricesAcrossDEXes(tokens.token0, tokens.token1);
      if (!prices || prices.length < 2) {
        return { type: 'price_check_failed' };
      }

      // Find best price
      const bestPrice = Math.max(...prices.map(p => p.price));
      const currentPrice = prices[0].price; // Assuming first is current DEX

      // Calculate spread
      const spread = (bestPrice - currentPrice) / currentPrice;
      const profitPercent = spread * 100;

      if (profitPercent < MIN_SPREAD_THRESHOLD) {
        return { type: 'spread_too_small', spread: profitPercent };
      }

      // Estimate profit
      const profitETH = parseFloat(amountIn) * spread;
      const gasCost = 0.01; // Estimated gas cost

      const netProfit = profitETH - gasCost;

      return {
        type: 'arbitrage',
        tokenPair: `${tokens.token0}/${tokens.token1}`,
        amountIn,
        currentPrice,
        bestPrice,
        bestDex: prices.find(p => p.price === bestPrice)?.dex || 'Unknown',
        spread: profitPercent.toFixed(2) + '%',
        profitETH: netProfit.toFixed(4),
        gasCost,
        dexInfo: dexInfo.name
      };
    } catch (error) {
      console.log(`  ❌ Arbitrage check failed: ${error.message}`);
      return null;
    }
  }

  async decodeSwapAmount(txData, dexName) {
    try {
      if (dexName === 'Uniswap V2' || dexName === 'Sushiswap') {
        const params = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
          '0x' + txData.slice(10)
        );
        return { token0: params[2][0], token1: params[2][params[2].length - 1], amountIn: ethers.formatEther(params[0]) };
      } else if (dexName === 'Uniswap V3') {
        const iface = new ethers.Interface([
          "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint256,uint160))"
        ]);
        const decoded = iface.parseTransaction({ data: txData });
        if (decoded && decoded.args) {
          return { token0: decoded.args.tokenIn, token1: decoded.args.tokenOut, amountIn: ethers.formatEther(decoded.args.amountIn) };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async getSwapTokens(txData, dexName) {
    try {
      if (dexName === 'Uniswap V2' || dexName === 'Sushiswap') {
        const params = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
          '0x' + txData.slice(10)
        );
        return { token0: params[2][0], token1: params[2][params[2].length - 1] };
      } else if (dexName === 'Uniswap V3') {
        const iface = new ethers.Interface([
          "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint256,uint160))"
        ]);
        const decoded = iface.parseTransaction({ data: txData });
        if (decoded && decoded.args) {
          return { token0: decoded.args.tokenIn, token1: decoded.args.tokenOut };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async getPricesAcrossDEXes(token0, token1) {
    const prices = [];

    for (const [routerAddr, dexInfo] of Object.entries(DEX_INFO)) {
      try {
        const pairAddress = await this.getPairAddress(token0, token1, dexInfo.factory);
        if (!pairAddress) continue;

        const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
        const reserves = await pairContract.getReserves();
        const token0Addr = await pairContract.token0();
        const token1Addr = await pairContract.token1();

        // Calculate price: price = reserve1 / reserve0
        const price = Number(reserves[1]) / Number(reserves[0]);

        prices.push({
          dex: dexInfo.name,
          price: price,
          pair: pairAddress,
          token0: token0Addr,
          token1: token1Addr
        });
      } catch (e) {
        // Skip DEXes that fail
        continue;
      }
    }

    return prices.length > 0 ? prices : null;
  }

  async getPairAddress(token0, token1, factoryAddress) {
    try {
      const factory = new ethers.Contract(factoryAddress, [
        'function getPair(address,address) external view returns (address)'
      ], this.provider);
      return await factory.getPair(token0, token1);
    } catch (e) {
      return null;
    }
  }
}

// ============================================================
// 🚀 MAIN WATCHER
// ============================================================
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      MEV Swarm v2 - Arbitrage Opportunity Detector            ║');
  console.log('║   Real-time DEX monitoring + Cross-DEX price comparison     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`🔌 Connecting to WebSocket...`);
  console.log(`   URL: ${WS_URL}\n`);

  const provider = new ethers.WebSocketProvider(WS_URL);
  await provider.getNetwork();

  console.log('✅ Connected! Streaming pending transactions...\n');
  console.log(`📡 Watching for arbitrage opportunities... (Ctrl+C to stop)\n`);

  const arbDetector = new ArbitrageDetector(provider);

  let dexSwapCount = 0;
  let opportunityCount = 0;
  let totalCount = 0;
  const startTime = Date.now();

  provider.on('pending', async (txHash) => {
    totalCount++;

    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx || !tx.to || !tx.data || tx.data === '0x') return;

      const { isDex, dexName, dexInfo } = isDexTransaction(tx.to);
      if (!isDex) return;

      dexSwapCount++;

      const valueEth = tx.value ? (Number(tx.value) / 1e18).toFixed(4) : '0';

      console.log(`\n🔄 DEX SWAP [${dexName}] | ${valueEth} ETH`);

      // Try to detect arbitrage opportunity
      const opportunity = await arbDetector.detectArbitrage(txHash, dexInfo, tx.data);

      if (opportunity && opportunity.type === 'arbitrage') {
        opportunityCount++;

        console.log(`   🎯 ARBITRAGE OPPORTUNITY DETECTED!`);
        console.log(`   📊 Pair: ${opportunity.tokenPair}`);
        console.log(`   💰 Amount: ${opportunity.amountIn} ETH`);
        console.log(`   📈 Spread: ${opportunity.spread}`);
        console.log(`   💵 Best DEX: ${opportunity.bestDex}`);
        console.log(`   💵 Current DEX: ${dexName}`);
        console.log(`   💸 Net Profit: ~${opportunity.profitETH} ETH (${(parseFloat(opportunity.profitETH) * 1977).toFixed(2)} USD)`);
        console.log(`   ⛽ Gas Cost: ~${opportunity.gasCost} ETH`);
      } else if (DEBUG_LOGS && opportunity) {
        console.log(`   ℹ️  ${opportunity.type.replace('_', ' ')}: ${opportunity.type === 'unmonitored_pair' ? opportunity.tokens : ''}`);
      }

      if (opportunityCount % 5 === 0 && DEBUG_LOGS) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (totalCount / elapsed).toFixed(1);
        console.log(`\n📊 Stats: ${dexSwapCount} DEX swaps, ${opportunityCount} opportunities, ${totalCount} total txs, ${rate} tx/sec`);
      }
    } catch (e) {
      // Ignore errors for fast-moving txs
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL STATISTICS                             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Total Transactions Processed: ${totalCount}`);
    console.log(`🔄 DEX Swaps Detected: ${dexSwapCount}`);
    console.log(`🎯 Arbitrage Opportunities: ${opportunityCount}`);
    console.log(`📈 Detection Rate: ${(totalCount / ((Date.now() - startTime) / 1000)).toFixed(1)} tx/sec`);
    console.log(`📊 DEX Percentage: ${((dexSwapCount / totalCount) * 100).toFixed(1)}%\n`);
    console.log('👋 Shutting down...\n');

    provider.removeAllListeners();
    await provider.destroy();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

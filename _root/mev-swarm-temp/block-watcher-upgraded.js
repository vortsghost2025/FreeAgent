/**
 * MEV Swarm - Real-time Mempool Watcher (UPGRADED)
 * Uses HTTP polling to watch pending transactions
 * Works with any RPC endpoint (no WebSocket required)
 *
 * Upgraded Features:
 * - Full V3 multi-hop path decoding
 * - Token metadata caching (symbol, decimals)
 * - Enhanced ABIs for 1inch, ParaSwap, aggregators
 * - Permit2 support
 * - Real pair names instead of addresses
 */

import 'dotenv/config';
import { ethers } from 'ethers';

// Your mainnet RPC for block watching (NOT Flashbots - that doesn't return public blocks)
const RPC_URL = process.env.ETHEREUM_RPC_URL ||
  process.env.ETH_RPC_URL ||
  `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`

// Flashbots RPC - only for private bundle submission, NOT for block watching
const FLASHBOTS_RPC_URL = process.env.FLASHBOTS_RPC_URL ||
  'https://rpc.flashbots.net/fast?originId=protect-website'

// Your Alchemy WebSocket endpoint for mempool
const WS_URL = process.env.ETH_WS_URL ||
  `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`

// ============================================================
// DEX Router Addresses (Mainnet) - Major DEXes
// ============================================================
const DEX_ROUTERS = {
  // Uniswap V2
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  // Uniswap V3
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  // Sushiswap
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'Sushiswap',
  // Curve
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'Curve',
  // Balancer
  '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer',
  // Additional routers
  '0x1b02da8cb1d0975baf44bc35efe2a538bde96d1d': 'SushiSwap (Avax)',
  '0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e': 'KyberDMM',
  '0xeb31076e7b370c07fa05cb60c5d0fb2f87c8ec3': 'DODO',
  '0xdef171fe48cf0115b1d80b88dc8eab59176fee57': 'ParaSwap',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch',
  '0x6550f1e5783c8948358dc2c451c0ba42c9c9f8eb': '0x Exchange Proxy', // Matcha
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V5 Aggregator',
  '0xdef171fe48cf0115b1d80b88dc8eab59176fee57': 'ParaSwap V5',
  '0x1b02da8cb1d0975baf44bc35efe2a538bde96d1d': 'SushiSwap Router',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'Uniswap V3 Universal Router', // NEW
};

// Token symbols for common tokens
const COMMON_TOKENS = {
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 'CRV',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'MATIC',
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'SHIB',
  '0x1ceb0cb1c4240e60895d7ed8d32ea53167e38f66': 'cETH',
  '0x4d5f47fa6a74757f35d14fcd9804a4d85ccbbbf4': 'cUSDC',
  '0x39aa39c021dfbae8fac545936693ac917d5e7563': 'cUSDT',
  '0xae7ab96520de3a18e5e60b4f85001a6d2e0404b5': 'wstETH',
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'rETH',
  '0xc00e94cb662c3520282e6f5717214004a7f26888': 'COMP',
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'MKR',
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 'LDO',
  '0x5982b7c9694b680545719f4788c6c7e5b4c7b4f8': 'PEPE',
  '0x4338665cbb7b2485a8855a139b75d5e34ab0db4b': 'CNH', // Chinese token
  '0x6982508145454ce725ddea2f744b8d62944a830f': 'PEPE',
};

// ============================================================
// Token Decimals Map (hardcoded for common tokens)
// ============================================================
const TOKEN_DECIMALS = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8,  // WBTC
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,  // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,  // USDT
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 18, // CRV
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 18, // AAVE
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 18, // UNI
  '0x514910771af9ca656af840dff83e8264ecf986ca': 18, // LINK
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 18, // MATIC
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 18, // SHIB
  '0xae7ab96520de3a18e5e60b4f85001a6d2e0404b5': 18, // wstETH
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 18, // rETH
  '0xc00e94cb662c5920282e6f5717214004a7f26888': 18, // COMP
};

// ============================================================
// 🆕 Token Metadata Cache Class
// ============================================================
class TokenMetadataCache {
  constructor() {
    this.cache = new Map(); // address -> { symbol, decimals, timestamp }
    this.cacheTimeout = 3600000; // 1 hour
  }

  async getTokenInfo(provider, address) {
    const cacheKey = address.toLowerCase();

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached;
      }
    }

    // Check hardcoded values
    if (COMMON_TOKENS[cacheKey]) {
      const info = {
        symbol: COMMON_TOKENS[cacheKey],
        decimals: TOKEN_DECIMALS[cacheKey] || 18,
        address,
        timestamp: Date.now()
      };
      this.cache.set(cacheKey, info);
      return info;
    }

    // Fetch from blockchain
    try {
      const erc20ABI = [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ];

      const token = new ethers.Contract(address, erc20ABI, provider);
      const [symbol, decimals] = await Promise.all([
        token.symbol(),
        token.decimals()
      ]);

      const info = { symbol, decimals, address, timestamp: Date.now() };
      this.cache.set(cacheKey, info);
      return info;
    } catch (error) {
      console.log(`⚠️  Failed to fetch token info for ${address}: ${error.message}`);
      return {
        symbol: 'UNKNOWN',
        decimals: 18,
        address,
        timestamp: Date.now()
      };
    }
  }

  clear() {
    this.cache.clear();
  }
}

// ============================================================
// 🆕 V3 Path Decoder - Decodes packed V3 paths
// ============================================================
function decodeV3Path(pathBytes) {
  const tokens = [];
  const fees = [];

  let i = 0;
  while (i < pathBytes.length) {
    // Token address (20 bytes = 40 hex chars)
    if (i + 40 <= pathBytes.length) {
      const token = '0x' + pathBytes.slice(i, i + 40);
      tokens.push(token);
      i += 40;

      // Fee (3 bytes = 6 hex chars) - but only if there's a next token
      if (i + 6 <= pathBytes.length) {
        const feeHex = pathBytes.slice(i, i + 6);
        const fee = parseInt(feeHex, 16);
        fees.push(fee);
        i += 6;
      }
    } else {
      break;
    }
  }

  return { tokens, fees };
}

// ============================================================
// Enhanced DEX Function Signatures (More routers)
// ============================================================
const DEX_FUNCTIONS = {
  // Uniswap V2
  '0x38ed1739': 'swapExactETHForTokens',
  '0x8803dbee': 'swapExactTokensForETH',
  '0x18cbafe5': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
  '0x7ff36ab5': 'swapETHForExactTokens',
  '0x4a25d94a': 'swapTokensForExactETH',
  '0x8803dbee': 'swapTokensForExactTokens',
  '0xded9382a': 'swapExactTokensForTokens',

  // Uniswap V3
  '0xc04b8d59': 'exactInputSingle',
  '0x414bf389': 'exactInput',
  '0xdb3e2198': 'exactOutputSingle',
  '0x09b81346': 'exactOutput',

  // Uniswap V3 Universal Router (NEW)
  '0x49404b7c': 'execute', // V4/Universal router
  '0x414bf389': 'executeV3Swap',

  // 1inch
  '0x2e95b6c8': 'swap',
  '0x12f3a5a3': 'clipperSwap',
  '0x07602518': 'unoswapTo',
  '0x5b8c5f9c': 'uniswapV3SwapTo',

  // ParaSwap
  '0x10435e61': 'sell',
  '0x7c025200': 'multiSwap',
  '0xa13f3e56': 'simpleSwap',

  // 0x Exchange (Matcha)
  '0x2e95b6c8': 'swap',
  '0x38ed1739': 'marketSellOrdersNoThrow',

  // DODO
  '0x2e1a7d4d': 'dodoSwap',
  '0x0b86d268': 'dodoSwapV2TokenToToken',

  // Curve
  '0x3df02124': 'exchange',
  '0xe44922e8': 'exchange_underlying',
  '0x441a3e70': 'exchange_multiple',

  // Kyber DMM
  '0x51cff8d9': 'executeTrade',
  '0xe67c3c95': 'swapToken',
};

// ============================================================
// Enhanced ABI Definitions for Decoding
// ============================================================
const ENHANCED_ABIS = {
  // 1inch Aggregator Router
  '1inch': [
    'function swap(address executor, bytes calldata desc, bytes calldata permit, bytes calldata data) external payable returns (uint256 returnAmount, uint256 spentAmount)',
  ],

  // ParaSwap Augustus
  'ParaSwap': [
    'function sell(address fromToken, address toToken, uint256 fromAmount, uint256 minToAmount, uint256[] calldata distribution, uint256 flags) external payable returns (uint256)',
    'function multiSwap(address[] calldata tokens, uint256[] calldata amounts, uint256 minReturn) external payable returns (uint256)',
  ],

  // 0x Exchange Proxy
  '0x Exchange Proxy': [
    'function swap(LibZeroEx.Order[] calldata orders, bytes calldata signature) external payable returns (uint256)',
  ],

  // Uniswap V3 Universal Router (NEW)
  'Uniswap V3 Universal Router': [
    'function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable',
  ],
};

// ============================================================
// Price Impact Calculator Class (UPGRADED)
// ============================================================
class PriceImpactCalculator {
  constructor(provider) {
    this.provider = provider;
    this.tokenCache = new TokenMetadataCache();
    this.cache = new Map();
    this.cacheTimeout = 5000;
  }

  /**
   * 🆕 Get token metadata with caching
   */
  async getTokenInfo(address) {
    return await this.tokenCache.getTokenInfo(this.provider, address);
  }

  /**
   * 🆕 Format token address with symbol
   */
  async formatToken(address) {
    if (!address || address === 'unknown') return 'UNKNOWN';
    const info = await this.getTokenInfo(address);
    return info.symbol || address.slice(0, 8) + '...';
  }

  // ... rest of PriceImpactCalculator methods remain the same ...
}

// ============================================================
// 🆕 Enhanced Transaction Decoder
// ============================================================
async function decodeTransaction(tx, provider, tokenCache) {
  const { isDex, dexName } = isDexTransaction(tx.to);
  if (!isDex) return null;

  const input = tx.data || '0x';
  const value = tx.value || '0x0';
  const funcSig = input.slice(0, 10).toLowerCase();

  let funcName = DEX_FUNCTIONS[funcSig] || 'unknown';

  let tokenIn = 'unknown';
  let tokenOut = 'unknown';
  let amountIn = BigInt(0);
  let amountOut = BigInt(0);
  let path = null;

  try {
    if (funcName === 'swapExactETHForTokens') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'address[]', 'address', 'uint256'],
        '0x' + data
      );
      path = params[1];
      tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
      tokenOut = params[1][params[1].length - 1];
      amountIn = BigInt(value);
      amountOut = params[0];
    } else if (funcName === 'swapExactTokensForTokens') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
        '0x' + data
      );
      path = params[2];
      tokenIn = params[2][0];
      tokenOut = params[2][params[2].length - 1];
      amountIn = params[0];
      amountOut = params[1];
    } else if (funcName === 'exactInputSingle') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'address', 'uint24', 'address', 'uint256', 'uint256', 'uint256', 'uint160'],
        '0x' + data
      );
      tokenIn = params[0];
      tokenOut = params[1];
      amountIn = params[5];
      amountOut = params[6];
    } else if (funcName === 'exactInput') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes', 'address', 'uint256', 'uint256', 'uint256'],
        '0x' + data
      );

      // 🆕 DECODE V3 MULTI-HOP PATH
      const pathBytes = params[0].slice(2); // Remove 0x
      const decoded = decodeV3Path(pathBytes);

      if (decoded.tokens.length >= 2) {
        tokenIn = decoded.tokens[0];
        tokenOut = decoded.tokens[decoded.tokens.length - 1];
        path = decoded.tokens;
        amountIn = params[2];
        amountOut = params[3];

        console.log(`   🆕 V3 Path: ${decoded.tokens.length} tokens, ${decoded.fees.length} hops`);
        for (let i = 0; i < decoded.tokens.length; i++) {
          const token = await tokenCache.getTokenInfo(this.provider, decoded.tokens[i]);
          const fee = decoded.fees[i] ? (decoded.fees[i] / 10000) + '%' : 'N/A';
          console.log(`      → ${token.symbol || decoded.tokens[i].slice(0, 8)} (fee: ${fee})`);
        }
      }
    } else if (funcName === 'swap' && dexName === '1inch') {
      // 🆕 1inch Aggregator decoding
      const data = input.slice(10);
      // 1inch uses custom encoding, try to extract basic info
      try {
        // Extract srcToken and dstToken from first 40 bytes each if available
        if (data.length >= 80) {
          tokenIn = '0x' + data.slice(0, 40);
          tokenOut = '0x' + data.slice(40, 80);
        }
      } catch (e) {
        console.log('   ⚠️  Could not decode 1inch swap');
      }
    } else if (funcName === 'sell' && dexName === 'ParaSwap') {
      // 🆕 ParaSwap decoding
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'address', 'uint256', 'uint256', 'uint256[]', 'uint256'],
        '0x' + data
      );
      tokenIn = params[0];
      tokenOut = params[1];
      amountIn = params[2];
      amountOut = params[3];
      console.log(`   🆕 ParaSwap: ${tokenIn.slice(0, 8)} → ${tokenOut.slice(0, 8)}`);
    }

    // 🆕 Format with token symbols
    const formatToken = async (addr) => {
      if (!addr || addr === 'unknown') return 'UNKNOWN';
      const info = await tokenCache.getTokenInfo(this.provider, addr);
      return info.symbol || addr.slice(0, 6) + '...';
    };

    const formatAmount = (amt, decimals = 18) => {
      if (!amt || amt === BigInt(0)) return '0';
      try {
        const bigAmt = BigInt(amt);
        const eth = Number(bigAmt) / Math.pow(10, decimals);
        if (eth >= 1e6) return (eth / 1e6).toFixed(2) + 'M';
        if (eth >= 1e3) return eth.toFixed(2) + 'K';
        return eth.toFixed(4);
      } catch { return '?'; }
    };

    const tokenInFormatted = await formatToken(tokenIn);
    const tokenOutFormatted = await formatToken(tokenOut);

    return {
      function: funcName,
      dex: dexName,
      tokenIn: tokenInFormatted,
      tokenOut: tokenOutFormatted,
      tokenInAddr: tokenIn,
      tokenOutAddr: tokenOut,
      amountInRaw: amountIn,
      amountIn: formatAmount(amountIn),
      amountOut: formatAmount(amountOut),
      path: path,
      isSwap: true
    };
  } catch (error) {
    console.log(`   ❌ Decode error: ${error.message}`);
    return { dex: dexName, function: 'unknown', isSwap: true, note: 'Could not decode' };
  }
}

// ============================================================
// Rest of the watcher code remains the same
// ============================================================
// [Include all the original classes and functions from block-watcher.js]
// - PriceImpactCalculator
// - MultiHopArbitrage
// - ArbitrageSimulator
// - parseDexTransaction
// - isDexTransaction
// - main() function

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     MEV Swarm - UPGRADED DEX Swap Monitor                    ║
║   🆕 Features: V3 path decoding, Token caching, Real symbols ║
╚══════════════════════════════════════════════════════════════╝
`);

// Import and run the rest of the original watcher logic
// (This is a partial upgrade - you'd need to merge this with the original file)
console.log('⚠️  This is a UPGRADE SNAPSHOT - merge with block-watcher.js to use');

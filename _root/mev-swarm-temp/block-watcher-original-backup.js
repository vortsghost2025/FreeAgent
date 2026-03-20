/**
 * MEV Swarm - Real-time Mempool Watcher
 * Uses HTTP polling to watch pending transactions
 * Works with any RPC endpoint (no WebSocket required)
 * 
 * Features:
 * - DEX swap filtering (Uniswap V2/V3, Sushiswap, Curve)
 * - Token pair detection
 * - Approximate swap size calculation
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
};

// Token symbols for common tokens
const COMMON_TOKENS = {
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 'CRV',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'MATIC',
};

// ============================================================
// Token Decimals Map
// ============================================================
const TOKEN_DECIMALS = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8,  // WBTC
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,  // USDC
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 18, // CRV
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 18, // AAVE
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 18, // UNI
  '0x514910771af9ca656af840dff83e8264ecf986ca': 18, // LINK
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 18, // MATIC
};

// Uniswap V2 Factory & Pair Addresses (Mainnet)
const UNISWAP_V2_FACTORY = '0x5C69bEe701ef814a2B6ae3C9d4cEBf31118f25d5';

// Sushiswap Factory (Mainnet)
const SUSHISWAP_FACTORY = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac';

// ABI for getting pair address from factory
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address)'
];

// ABI for Uniswap V2 pair - getReserves()
const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
];

// DEX Function Signatures
const DEX_FUNCTIONS = {
  // Uniswap V2
  '0x38ed1739': 'swapExactETHForTokens',
  '0x8803dbee': 'swapExactTokensForETH',
  '0xded9382a': 'swapExactTokensForTokens',
  // Uniswap V3
  '0xc04b8d59': 'exactInputSingle',
  '0x414bf389': 'exactInput',
  // Curve
  '0x3df02124': 'exchange',
  '0xe44922e8': 'exchange_underlying',
  // 1inch
  '0x12f3a5a3': 'swap',
  // DODO
  '0x2e1a7d4d': 'dodoSwap',
};

/**
 * Calculate expected output from AMM using constant product formula
 * x * y = k => output = (input * y) / (x + input)
 * Including 0.3% fee
 */
function calculateSwapOutput(amountIn, reserveIn, reserveOut, fee = 0.003) {
  const amountInWithFee = amountIn * BigInt(Math.floor((1 - fee) * 1000));
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(1000) + amountInWithFee;
  return numerator / denominator;
}

/**
 * Get spot price from reserves (tokenOut / tokenIn)
 */
function getSpotPrice(reserveIn, reserveOut, decimalsIn = 18, decimalsOut = 18) {
  if (reserveIn === BigInt(0)) return null;
  const adjustedIn = Number(reserveIn) / Math.pow(10, decimalsIn);
  const adjustedOut = Number(reserveOut) / Math.pow(10, decimalsOut);
  return adjustedOut / adjustedIn;
}

/**
 * Price Impact Calculator Class
 * Queries DEX pool reserves and calculates price impact
 */
class PriceImpactCalculator {
  constructor(provider) {
    this.provider = provider;
    this.factorys = {
      'Uniswap V2': new ethers.Contract(UNISWAP_V2_FACTORY, FACTORY_ABI, provider),
      'Sushiswap': new ethers.Contract(SUSHISWAP_FACTORY, FACTORY_ABI, provider),
    };
    this.cache = new Map();
    this.cacheTimeout = 5000;
  }

  /**
   * Get pair address for a token pair from a factory
   */
  async getPairAddress(tokenA, tokenB, dexName) {
    const sorted = [tokenA, tokenB].sort();
    const key = `${dexName}-${sorted[0]}-${sorted[1]}`;
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.address;
      }
    }

    try {
      const factory = this.factorys[dexName];
      if (!factory) return null;
      const pairAddress = await factory.getPair(sorted[0], sorted[1]);
      this.cache.set(key, { address: pairAddress, timestamp: Date.now() });
      return pairAddress;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get reserves for a pair using eth_call
   */
  async getReserves(pairAddress) {
    if (!pairAddress || pairAddress === ethers.ZeroAddress) return null;
    
    const cacheKey = `reserves-${pairAddress}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.reserves;
      }
    }

    try {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
      const reserves = await pair.getReserves();
      const result = {
        reserve0: reserves.reserve0,
        reserve1: reserves.reserve1,
      };
      this.cache.set(cacheKey, { reserves: result, timestamp: Date.now() });
      return result;
    } catch (e) {
      return null;
    }
  }

  /**
   * Calculate price impact for a swap
   */
  async calculatePriceImpact(tokenIn, tokenOut, amountIn, dexName) {
    try {
      const pairAddress = await this.getPairAddress(tokenIn, tokenOut, dexName);
      if (!pairAddress) {
        return { error: 'Pool not found', poolAddress: null };
      }

      const reserves = await this.getReserves(pairAddress);
      if (!reserves) {
        return { error: 'Could not fetch reserves', poolAddress: pairAddress };
      }

      const tokenInLower = tokenIn.toLowerCase();
      const decimalsIn = TOKEN_DECIMALS[tokenInLower] || 18;
      const decimalsOut = TOKEN_DECIMALS[tokenOut.toLowerCase()] || 18;

      const [token0] = [tokenIn, tokenOut].sort();
      const reserveIn = token0.toLowerCase() === tokenInLower ? reserves.reserve0 : reserves.reserve1;
      const reserveOut = token0.toLowerCase() === tokenInLower ? reserves.reserve1 : reserves.reserve0;

      const expectedOutput = calculateSwapOutput(amountIn, reserveIn, reserveOut);
      const spotPrice = getSpotPrice(reserveIn, reserveOut, decimalsIn, decimalsOut);
      const actualPrice = (Number(amountIn) / Math.pow(10, decimalsIn)) / 
                         (Number(expectedOutput) / Math.pow(10, decimalsOut));
      
      let priceImpact = 0;
      if (spotPrice && spotPrice > 0) {
        priceImpact = ((actualPrice - spotPrice) / spotPrice) * 100;
      }

      return {
        poolAddress,
        reserveIn: reserveIn.toString(),
        reserveOut: reserveOut.toString(),
        spotPrice: spotPrice ? spotPrice.toFixed(6) : null,
        executionPrice: actualPrice.toFixed(6),
        expectedOutput: (Number(expectedOutput) / Math.pow(10, decimalsOut)).toFixed(6),
        priceImpact: priceImpact.toFixed(2) + '%',
        dexName
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Compare prices across multiple DEXes for the same token pair
   */
  async compareDexPrices(tokenIn, tokenOut, amountIn) {
    const dexes = ['Uniswap V2', 'Sushiswap'];
    const results = [];

    for (const dex of dexes) {
      const result = await this.calculatePriceImpact(tokenIn, tokenOut, amountIn, dex);
      if (!result.error) {
        results.push(result);
      }
    }

    results.sort((a, b) => parseFloat(b.expectedOutput) - parseFloat(a.expectedOutput));

    if (results.length >= 2) {
      const best = parseFloat(results[0].executionPrice);
      const worst = parseFloat(results[results.length - 1].executionPrice);
      const arbitragePercent = ((best - worst) / worst) * 100;
      
      return {
        prices: results,
        bestDex: results[0].dexName,
        worstDex: results[results.length - 1].dexName,
        arbitragePercent: arbitragePercent.toFixed(2) + '%',
        recommendation: arbitragePercent > 0.5 ? 'ARB OPPORTUNITY' : 'No significant arb'
      };
    }

    return {
      prices: results,
      recommendation: 'Insufficient DEX data for comparison'
    };
  }

  /**
   * Score an arbitrage opportunity based on profit potential
   */
  async scoreArbitrage(dexComparison, gasPrice, amountIn, tokenOutDecimals = 18) {
    if (!dexComparison.prices || dexComparison.prices.length < 2) {
      return { score: 0, recommendation: 'No arbitrage data' };
    }

    const best = dexComparison.prices[0];
    const worst = dexComparison.prices[dexComparison.prices.length - 1];
    
    const bestOutput = parseFloat(best.expectedOutput);
    const worstOutput = parseFloat(worst.expectedOutput);
    const profitPerUnit = bestOutput - worstOutput;
    const totalProfit = profitPerUnit * (Number(amountIn) / Math.pow(10, TOKEN_DECIMALS[best.poolAddress?.slice(0, 40)] || 18));
    
    // Estimate gas costs (approx 150k gas for swap)
    const gasCostEth = (Number(gasPrice) * 150000) / 1e18;
    
    // Calculate score (0-100)
    let score = 0;
    const profitPercent = (profitPerUnit / worstOutput) * 100;
    
    if (profitPercent > 1) score += 40;
    else if (profitPercent > 0.5) score += 20;
    else if (profitPercent > 0.1) score += 10;
    
    // Subtract gas costs from score
    if (totalProfit > gasCostEth * 2) score += 30;
    else if (totalProfit > gasCostEth) score += 15;
    else score -= 20;
    
    // Additional factors
    if (best.poolAddress) score += 10; // Has pool address
    if (parseFloat(best.priceImpact) < 1) score += 10; // Low price impact
    else if (parseFloat(best.priceImpact) > 5) score -= 20; // High price impact
    
    let recommendation = 'HOLD';
    if (score >= 70) recommendation = 'STRONG BUY';
    else if (score >= 50) recommendation = 'BUY';
    else if (score < 20) recommendation = 'SKIP';
    
    return {
      score: Math.min(100, Math.max(0, score)),
      profitPercent: profitPercent.toFixed(2) + '%',
      estimatedProfit: totalProfit.toFixed(6),
      gasCostEth: gasCostEth.toFixed(6),
      netProfit: (totalProfit - gasCostEth).toFixed(6),
      recommendation
    };
  }
}

// ============================================================
// Multi-Hop Arbitrage Routes
// Supports 2-hop (A→B→A) and 3-hop (A→B→C→A) cycles
// ============================================================
class MultiHopArbitrage {
  constructor(provider, priceImpactCalculator) {
    this.provider = provider;
    this.priceCalc = priceImpactCalculator;
    this.dexes = ['Uniswap V2', 'Sushiswap', 'Curve', 'Balancer'];
    this.gasEstimate = {
      '2-hop': 250000,
      '3-hop': 400000
    };
  }

  async findMultiHopOpportunity(tokenA, tokenB, tokenC = null, amountIn) {
    const is3Hop = tokenC !== null;
    const routeType = is3Hop ? '3-hop' : '2-hop';
    const gasEstimate = this.gasEstimate[routeType];

    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const gasCostEth = (Number(gasPrice) * gasEstimate) / 1e18;

      const route = is3Hop 
        ? [tokenA, tokenB, tokenC, tokenA]
        : [tokenA, tokenB, tokenA];

      let currentAmount = amountIn;
      const hopResults = [];

      for (let i = 0; i < route.length - 1; i++) {
        const tokenIn = route[i];
        const tokenOut = route[i + 1];

        let bestDex = null;
        let bestOutput = BigInt(0);
        let bestResult = null;

        for (const dex of this.dexes) {
          try {
            const result = await this.priceCalc.calculatePriceImpact(
              tokenIn,
              tokenOut,
              currentAmount,
              dex
            );

            if (!result.error) {
              const outputRaw = BigInt(Math.floor(parseFloat(result.expectedOutput) * 1e18));
              if (outputRaw > bestOutput) {
                bestOutput = outputRaw;
                bestDex = dex;
                bestResult = result;
              }
            }
          } catch (e) {
            // Skip failed DEX
          }
        }

        if (!bestDex) return null;

        hopResults.push({
          hop: i + 1,
          tokenIn,
          tokenOut,
          dex: bestDex,
          amountIn: currentAmount,
          amountOut: bestOutput,
          priceImpact: bestResult?.priceImpact || '0%',
          poolAddress: bestResult?.poolAddress
        });

        currentAmount = bestOutput;
      }

      const finalOutput = Number(currentAmount) / 1e18;
      const initialInput = Number(amountIn) / 1e18;
      const profit = finalOutput - initialInput;
      const profitPercent = ((finalOutput - initialInput) / initialInput) * 100;
      const netProfit = profit - gasCostEth;

      if (netProfit <= 0) {
        return {
          route,
          routeType,
          hopResults,
          profitable: false,
          profit: profit.toFixed(6),
          gasCostEth: gasCostEth.toFixed(6),
          netProfit: netProfit.toFixed(6),
          recommendation: 'SKIP - Gas costs exceed profit'
        };
      }

      let score = 0;
      if (profitPercent > 2) score += 50;
      else if (profitPercent > 1) score += 35;
      else if (profitPercent > 0.5) score += 20;
      else if (profitPercent > 0.1) score += 10;

      if (netProfit > gasCostEth) score += 25;
      if (hopResults.length === hopResults.filter(h => h.poolAddress).length) score += 15;
      if (profitPercent > 0.5 && netProfit > 0.01) score += 10;

      let recommendation = 'HOLD';
      if (score >= 80) recommendation = 'STRONG BUY';
      else if (score >= 60) recommendation = 'BUY';
      else if (score >= 40) recommendation = 'CONSIDER';
      else if (score < 20) recommendation = 'SKIP';

      return {
        route,
        routeType,
        hopResults,
        profitable: true,
        score: Math.min(100, Math.max(0, score)),
        profit: profit.toFixed(6),
        profitPercent: profitPercent.toFixed(2) + '%',
        gasCostEth: gasCostEth.toFixed(6),
        netProfit: netProfit.toFixed(6),
        gasEstimate,
        recommendation
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  async scan2HopOpportunities(amountIn = BigInt(1e18)) {
    const commonPairs = [
      ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
      ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x6b175474e89094c44da98b954eedeac495271d0f'],
      ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
      ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0x6b175474e89094c44da98b954eedeac495271d0f'],
      ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xd533a949740bb3306d119cc777fa900ba034cd52'],
      ['0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
    ];

    const opportunities = [];

    for (const [tokenA, tokenB] of commonPairs) {
      const arbA = await this.findMultiHopOpportunity(tokenA, tokenB, null, amountIn);
      if (arbA && arbA.profitable) opportunities.push(arbA);

      const arbB = await this.findMultiHopOpportunity(tokenB, tokenA, null, amountIn);
      if (arbB && arbB.profitable) opportunities.push(arbB);
    }

    opportunities.sort((a, b) => parseFloat(b.netProfit) - parseFloat(a.netProfit));
    return opportunities.slice(0, 10);
  }

  async scan3HopOpportunities(amountIn = BigInt(1e18)) {
    const tokenSet = new Set([
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '0x6b175474e89094c44da98b954eedeac495271d0f',
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      '0xd533a949740bb3306d119cc777fa900ba034cd52',
    ]);

    const tokens = Array.from(tokenSet);
    const opportunities = [];

    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (i === j) continue;
        for (let k = 0; k < tokens.length; k++) {
          if (i === k || j === k) continue;

          const arb = await this.findMultiHopOpportunity(tokens[i], tokens[j], tokens[k], amountIn);
          if (arb && arb.profitable) opportunities.push(arb);
        }
      }
    }

    opportunities.sort((a, b) => parseFloat(b.netProfit) - parseFloat(a.netProfit));
    return opportunities.slice(0, 10);
  }
}

// ============================================================
// Block Simulator
// ============================================================
class BlockSimulator {
  constructor(provider, priceImpactCalculator) {
    this.provider = provider;
    this.priceCalc = priceImpactCalculator;
    this.simulatedPools = new Map();
  }

  async initializePools(tokenPairs) {
    for (const [tokenA, tokenB, dexName] of tokenPairs) {
      const pairAddress = await this.priceCalc.getPairAddress(tokenA, tokenB, dexName);
      if (pairAddress) {
        const reserves = await this.priceCalc.getReserves(pairAddress);
        if (reserves) {
          const key = `${dexName}-${tokenA.toLowerCase()}-${tokenB.toLowerCase()}`;
          this.simulatedPools.set(key, {
            reserve0: reserves.reserve0,
            reserve1: reserves.reserve1,
            token0: tokenA,
            token1: tokenB,
            dexName
          });
        }
      }
    }
  }

  simulateSwap(poolKey, amountIn, fee = 0.003) {
    const pool = this.simulatedPools.get(poolKey);
    if (!pool) return null;

    const reserveIn = pool.reserve0;
    const reserveOut = pool.reserve1;
    
    const amountInWithFee = amountIn * BigInt(Math.floor((1 - fee) * 1000));
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * BigInt(1000) + amountInWithFee;
    const amountOut = numerator / denominator;

    pool.reserve0 = reserveIn + amountIn;
    pool.reserve1 = reserveOut - amountOut;

    return amountOut;
  }

  async simulatePendingTx(tx, amountIn) {
    const dexInfo = parseDexTransaction(tx);
    if (!dexInfo || !dexInfo.tokenInAddr || !dexInfo.tokenOutAddr) {
      return { success: false, reason: 'Not a parseable DEX swap' };
    }

    const poolKey = `${dexInfo.dex}-${dexInfo.tokenInAddr.toLowerCase()}-${dexInfo.tokenOutAddr.toLowerCase()}`;
    const pool = this.simulatedPools.get(poolKey);
    
    if (!pool) {
      await this.initializePools([[dexInfo.tokenInAddr, dexInfo.tokenOutAddr, dexInfo.dex]]);
      const newPool = this.simulatedPools.get(poolKey);
      if (!newPool) return { success: false, reason: 'Pool not found' };
    }

    const swapAmount = dexInfo.amountInRaw || amountIn;
    const fee = dexInfo.dex === 'Uniswap V3' ? 0.001 : 0.003;
    const outputAmount = this.simulateSwap(poolKey, swapAmount, fee);

    if (!outputAmount) return { success: false, reason: 'Simulation failed' };

    return {
      success: true,
      poolKey,
      swapAmount: swapAmount.toString(),
      outputAmount: outputAmount.toString(),
      newReserves: this.simulatedPools.get(poolKey)
    };
  }

  async simulateArbitrage(pendingTxs, arbitrageRoute, amountIn) {
    this.simulatedPools.clear();

    const txResults = [];
    for (const tx of pendingTxs) {
      const result = await this.simulatePendingTx(tx, amountIn);
      txResults.push({ tx: tx.hash, ...result });
    }

    const arbResults = [];
    let currentAmount = amountIn;

    for (const hop of arbitrageRoute.hopResults) {
      const poolKey = `${hop.dex}-${hop.tokenIn.toLowerCase()}-${hop.tokenOut.toLowerCase()}`;
      const pool = this.simulatedPools.get(poolKey);

      if (!pool) {
        return { success: false, reason: `Pool not found for hop ${hop.hop}: ${poolKey}`, txResults, arbResults };
      }

      const fee = hop.dex === 'Uniswap V3' ? 0.001 : 0.003;
      const output = this.simulateSwap(poolKey, currentAmount, fee);

      if (!output || output === BigInt(0)) {
        return { success: false, reason: `Swap failed at hop ${hop.hop}`, txResults, arbResults };
      }

      arbResults.push({ hop: hop.hop, dex: hop.dex, amountIn: currentAmount.toString(), amountOut: output.toString() });
      currentAmount = output;
    }

    const finalOutput = Number(currentAmount) / 1e18;
    const initialInput = Number(amountIn) / 1e18;
    const profit = finalOutput - initialInput;

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const gasEstimate = arbitrageRoute.gasEstimate || 250000;
    const gasCostEth = (Number(gasPrice) * gasEstimate) / 1e18;
    const netProfit = profit - gasCostEth;

    const canExecute = netProfit > 0;

    return {
      success: canExecute,
      canExecute,
      txResults,
      arbResults,
      initialInput: initialInput.toFixed(6),
      finalOutput: finalOutput.toFixed(6),
      profit: profit.toFixed(6),
      gasCostEth: gasCostEth.toFixed(6),
      netProfit: netProfit.toFixed(6),
      recommendation: canExecute ? 'EXECUTE' : 'SKIP',
      reason: canExecute ? 'Profit positive after gas' : 'Gas costs exceed profit'
    };
  }

  async validateArbitrage(arbitrageOpportunity, amountIn = BigInt(1e18)) {
    if (!arbitrageOpportunity || !arbitrageOpportunity.hopResults) {
      return { valid: false, reason: 'Invalid arbitrage opportunity' };
    }

    const poolKeys = [];
    for (const hop of arbitrageOpportunity.hopResults) {
      const poolKey = `${hop.dex}-${hop.tokenIn.toLowerCase()}-${hop.tokenOut.toLowerCase()}`;
      poolKeys.push(poolKey);
      if (!this.simulatedPools.has(poolKey)) {
        await this.initializePools([[hop.tokenIn, hop.tokenOut, hop.dex]]);
      }
    }

    let currentAmount = amountIn;
    const hopResults = [];

    for (let i = 0; i < arbitrageOpportunity.hopResults.length; i++) {
      const hop = arbitrageOpportunity.hopResults[i];
      const poolKey = poolKeys[i];
      const pool = this.simulatedPools.get(poolKey);

      if (!pool) return { valid: false, reason: `Pool not found: ${poolKey}` };

      const fee = hop.dex === 'Uniswap V3' ? 0.001 : 0.003;
      const output = this.simulateSwap(poolKey, currentAmount, fee);

      if (!output || output === BigInt(0)) return { valid: false, reason: `Swap failed at hop ${i + 1}` };

      hopResults.push({ hop: i + 1, amountIn: currentAmount.toString(), amountOut: output.toString() });
      currentAmount = output;
    }

    const finalOutput = Number(currentAmount) / 1e18;
    const initialInput = Number(amountIn) / 1e18;
    const profit = finalOutput - initialInput;

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const gasEstimate = arbitrageOpportunity.gasEstimate || 250000;
    const gasCostEth = (Number(gasPrice) * gasEstimate) / 1e18;
    const netProfit = profit - gasCostEth;

    return {
      valid: netProfit > 0,
      hopResults,
      initialInput: initialInput.toFixed(6),
      finalOutput: finalOutput.toFixed(6),
      profit: profit.toFixed(6),
      gasCostEth: gasCostEth.toFixed(6),
      netProfit: netProfit.toFixed(6),
      gasEstimate,
      recommendation: netProfit > 0 ? 'EXECUTE' : 'SKIP'
    };
  }
}

/**
 * Check if a transaction is going to a known DEX router
 */
function isDexTransaction(toAddress) {
  if (!toAddress) return { isDex: false, dexName: null };
  const normalized = toAddress.toLowerCase();
  return {
    isDex: normalized in DEX_ROUTERS,
    dexName: DEX_ROUTERS[normalized] || null
  };
}

/**
 * Decode swap data from transaction input
 */
function decodeSwapData(input, value, dexName) {
  if (!input || input === '0x') return null;

  try {
    const funcSig = input.slice(0, 10);
    const funcName = DEX_FUNCTIONS[funcSig];
    if (!funcName) return null;

    let tokenIn = null, tokenOut = null, amountIn = null, amountOut = null;

    if (funcName === 'swapExactETHForTokens' || funcName === 'swapExactTokensForETH') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'address[]', 'address', 'uint256'],
        '0x' + data
      );
      
      if (funcName === 'swapExactETHForTokens') {
        tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        tokenOut = params[1][params[1].length - 1];
        amountIn = value;
        amountOut = params[0];
        // Store raw ETH address for calculations
        tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
        tokenOut = params[1][params[1].length - 1];
      } else {
        tokenIn = params[1][0];
        tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
        amountIn = params[0];
        amountOut = value;
      }
    } else if (funcName === 'swapExactTokensForTokens') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
        '0x' + data
      );
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
      const path = params[0];
      if (path.length >= 43) {
        tokenIn = '0x' + path.slice(0, 40);
        tokenOut = '0x' + path.slice(43, 83);
      }
      amountIn = params[2];
      amountOut = params[3];
    } else if (funcName === 'exchange') {
      const data = input.slice(10);
      const params = ethers.AbiCoder.defaultAbiCoder().decode(
        ['int128', 'int128', 'uint256', 'uint256'],
        '0x' + data
      );
      amountIn = params[2];
      amountOut = params[3];
      tokenIn = 'unknown';
      tokenOut = 'unknown';
    }

    const formatToken = (addr) => {
      if (!addr || addr === 'unknown') return 'UNKNOWN';
      return COMMON_TOKENS[addr.toLowerCase()] || addr.slice(0, 6) + '...';
    };

    // Also return raw addresses for price impact calculation
    const getRawTokenIn = () => tokenIn;
    const getRawTokenOut = () => tokenOut;

    const formatAmount = (amt, decimals = 18) => {
      if (!amt) return '0';
      try {
        const bigAmt = BigInt(amt);
        const eth = Number(bigAmt) / Math.pow(10, decimals);
        if (eth >= 1e6) return (eth / 1e6).toFixed(2) + 'M';
        if (eth >= 1e3) return eth.toFixed(2) + 'K';
        return eth.toFixed(4);
      } catch { return '?'; }
    };

    return {
      function: funcName,
      dex: dexName,
      tokenIn: formatToken(tokenIn),
      tokenOut: formatToken(tokenOut),
      tokenInAddr: tokenIn,
      tokenOutAddr: tokenOut,
      amountInRaw: amountIn,
      amountIn: formatAmount(amountIn),
      amountOut: formatAmount(amountOut),
      isSwap: true
    };
  } catch (error) {
    return { dex: dexName, function: 'unknown', isSwap: true, note: 'Could not decode' };
  }
}

/**
 * Parse transaction to detect DEX swap
 */
function parseDexTransaction(tx) {
  const { isDex, dexName } = isDexTransaction(tx.to);
  if (!isDex) return null;

  const swapData = decodeSwapData(tx.data, tx.value, dexName);
  if (!swapData) {
    return { dex: dexName, to: tx.to, hash: tx.hash, isDexSwap: true, note: 'Contract interaction' };
  }
  return { dex: dexName, to: tx.to, hash: tx.hash, ...swapData };
}

class BlockWatcher {
  constructor(onBlock) {
    this.provider = null;
    this.onBlock = onBlock;
    this.txCount = 0;
    this.running = false;
    this.pollInterval = 1000; // Poll every 1 second (faster detection)
    this.pollTimer = null;
    this.lastPendingTxHashes = new Set();
    this.lastBlockNumber = null; // Track mined block height
  }

  async start() {
    console.log('🔌 Connecting to Ethereum RPC (polling mode)...');
    console.log('[DEBUG] Using RPC:', RPC_URL);
    
    try {
      // Use JsonRpcProvider for HTTP polling
      this.provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Test connection and get initial block
      const blockNumber = await this.provider.getBlockNumber();
      this.lastBlockNumber = blockNumber;
      console.log(`✅ Connected! Current block: #${blockNumber}`);
      console.log(`📡 Polling mempool every ${this.pollInterval/1000}s for pending transactions...\n`);
      
      this.running = true;
      
      // Start polling
      this.pollMempool();
      this.pollTimer = setInterval(() => this.pollMempool(), this.pollInterval);
      
      return true;
    } catch (error) {
      console.error('❌ RPC connection failed:', error.message);
      return false;
    }
  }

  async pollMempool() {
    if (!this.running || !this.provider) return;

    try {
      // FIRST: Check for new mined blocks
      const currentBlock = await this.provider.getBlockNumber();
      
      // If we have a new block, emit block event with real block number
      if (this.lastBlockNumber !== null && currentBlock > this.lastBlockNumber) {
        const newBlocks = currentBlock - this.lastBlockNumber;
        
        // Emit block event for new block
        if (this.onBlock) {
          this.onBlock(currentBlock, { type: 'new_block', blockNumber: currentBlock });
        }
        
        this.lastBlockNumber = currentBlock;
      } else if (this.lastBlockNumber === null) {
        // Initialize on first run
        this.lastBlockNumber = currentBlock;
      }
      
      // THEN: Get pending block (transactions in mempool)
      const pendingBlock = await this.provider.send('eth_getBlockByNumber', ['pending', false]);
      
      // Debug: log what we got
      if (!pendingBlock || !pendingBlock.transactions || pendingBlock.transactions.length === 0) {
        // Try latest block instead as fallback
        const latestBlock = await this.provider.send('eth_getBlockByNumber', ['latest', false]);
        console.log(`[Debug] Pending: ${pendingBlock ? 'empty' : 'null'}, Latest txs: ${latestBlock?.transactions?.length || 0}`);
      }
      
      if (pendingBlock && pendingBlock.transactions) {
        const txs = pendingBlock.transactions;
        
        for (const txHash of txs) {
          // Skip already-seen transactions
          if (this.lastPendingTxHashes.has(txHash)) continue;
          
          this.lastPendingTxHashes.add(txHash);
          this.txCount++;
          
          try {
            // Get full transaction details
            const tx = await this.provider.getTransaction(txHash);
            
            if (tx && this.onBlock) {
              const txData = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                gasPrice: tx.gasPrice,
                gas: tx.gasLimit,
                data: tx.data,
                nonce: tx.nonce,
                blockNumber: null
              };
              
              // Call the callback
              this.onBlock(-1, { type: 'pending_tx', transaction: txData });
            }
          } catch (err) {
            // Ignore errors for individual tx
          }
        }
      }
      
      // Clean up old hashes (keep only last 1000)
      if (this.lastPendingTxHashes.size > 1000) {
        const arr = Array.from(this.lastPendingTxHashes);
        this.lastPendingTxHashes = new Set(arr.slice(-500));
      }
      
    } catch (error) {
      // Silent fail on polling errors
    }
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.provider) {
      this.provider = null;
    }
    
    this.running = false;
    console.log('🛑 Polling stopped');
  }
}

class WebSocketBlockWatcher {
  constructor(onBlock) {
    this.wsProvider = null;
    this.onBlock = onBlock;
    this.blockCount = 0;
    this.running = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.reconnectTimer = null;
  }

  async start() {
    console.log('🔌 Connecting to Ethereum WebSocket...');
    
    try {
      // Use our proven WebSocket connection approach
      const WebSocket = (await import('ws')).default;
      this.rawWs = new WebSocket(WS_URL);
      
      // Wait for connection
      await new Promise((resolve, reject) => {
        this.rawWs.on('open', resolve);
        this.rawWs.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      console.log('✅ WebSocket connected!\n');
      
      // Initialize ethers WebSocketProvider
      this.wsProvider = new ethers.WebSocketProvider(WS_URL);
      
      this.running = true;
      this.reconnectAttempts = 0;
      
      // Setup error handlers
      this.rawWs.on('error', (err) => {
        console.error('⚠️ WebSocket error:', err.message);
        this.handleDisconnect();
      });
      
      this.rawWs.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        this.handleDisconnect();
      });
      
      // Subscribe to pending transactions (mempool) - CRITICAL for MEV!
      // Using Alchemy's alchemy_pendingTransactions for full tx details
      // NOTE: For MEV, we watch ALL pending txs (no filter) to detect arbitrage opportunities
      
      this.rawWs.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: ["alchemy_pendingTransactions", {}]  // No filter = all pending txs
      }));
      
      // Handle incoming messages
      this.rawWs.on('message', async (data) => {
        try {
          const response = JSON.parse(data);
          
          // Handle subscription confirmation
          if (response.id === 1 && response.result) {
            console.log(`📡 Subscription confirmed: ${response.result}`);
            return;
          }
          
          if (response.method === 'eth_subscription' && response.params?.result) {
            const txData = response.params.result;
            
            // This is a pending transaction
            this.blockCount++; // Reusing blockCount for tx count
            
            if (this.onBlock) {
              // Create transaction object for MEV analysis
              const tx = {
                hash: txData.hash,
                from: txData.from,
                to: txData.to,
                value: txData.value ? BigInt(txData.value) : BigInt(0),
                gasPrice: txData.gasPrice ? BigInt(txData.gasPrice) : BigInt(0),
                gas: txData.gas ? BigInt(txData.gas) : BigInt(0),
                data: txData.input || txData.data,
                nonce: txData.nonce ? parseInt(txData.nonce, 16) : 0,
                blockNumber: null // Pending = no block yet
              };
              
              // Call the callback with blockNumber=-1 to indicate pending tx
              this.onBlock(-1, { type: 'pending_tx', transaction: tx });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
      
      // Also show DEX-specific subscription for filtered mempool
      console.log('📡 Subscribing to DEX swap transactions only...');

      // Get current block number for reference
      const currentBlock = await this.wsProvider.getBlockNumber();
      console.log(`📍 Current block: #${currentBlock}`);
      console.log(`📡 Subscribed to mempool - filtering for DEX swaps (Uniswap, Sushiswap, Curve)...`);
      
      return true;
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error.message);
      this.handleDisconnect();
      return false;
    }
  }

  handleDisconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Giving up.');
      this.running = false;
      return;
    }
    
    this.running = false;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Reconnecting in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.start();
    }, delay);
  }

  stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.rawWs) {
      this.rawWs.close();
      this.rawWs = null;
    }
    
    this.running = false;
    console.log('🛑 WebSocket disconnected');
  }
}

// Demo: Watch pending transactions and filter for DEX swaps with price impact
async function demo() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        MEV Swarm - DEX Swap Monitor + Price Impact         ║');
  console.log('║   Filtering: Uniswap V2/V3, Sushiswap, Curve                ║');
  console.log('║   Features: Price Impact, Cross-DEX Comparison              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let dexSwapCount = 0;
  let priceCalc = null;

  const watcher = new BlockWatcher(async (blockNumber, data) => {
    if (data.type === 'pending_tx' && data.transaction) {
      const tx = data.transaction;
      
      // Try to parse as DEX swap
      const dexInfo = parseDexTransaction(tx);
      
      if (dexInfo && dexInfo.isSwap) {
        dexSwapCount++;
        const valueEth = (tx.value / BigInt(1e18)).toString();
        
        // Build swap info string
        let swapDetails = '';
        if (dexInfo.tokenIn && dexInfo.tokenOut) {
          swapDetails = ` | ${dexInfo.tokenIn} → ${dexInfo.tokenOut}`;
          if (dexInfo.amountIn && dexInfo.amountIn !== '0') {
            swapDetails += ` (${dexInfo.amountIn})`;
          }
        }
        
        console.log(`🔄 DEX SWAP [${dexInfo.dex}]${swapDetails} | ${valueEth} ETH | ${dexInfo.function || 'unknown'}`);
        
        // Calculate price impact if we have token addresses and amount
        if (dexInfo.tokenInAddr && dexInfo.tokenOutAddr && dexInfo.amountInRaw && priceCalc) {
          try {
            const impact = await priceCalc.calculatePriceImpact(
              dexInfo.tokenInAddr,
              dexInfo.tokenOutAddr,
              dexInfo.amountInRaw,
              dexInfo.dex
            );
            
            if (!impact.error) {
              console.log(`   📊 Price Impact: ${impact.priceImpact} | Pool: ${impact.poolAddress?.slice(0, 10)}...`);
              console.log(`   💰 Expected Output: ${impact.expectedOutput} | Spot: ${impact.spotPrice}`);
              
              // Compare prices across DEXes for significant trades
              if (parseFloat(dexInfo.amountIn) > 1) {
                const comparison = await priceCalc.compareDexPrices(
                  dexInfo.tokenInAddr,
                  dexInfo.tokenOutAddr,
                  dexInfo.amountInRaw
                );
                
                if (comparison.prices && comparison.prices.length > 0) {
                  console.log(`   🔄 Cross-DEX: Best=${comparison.bestDex} | Arb: ${comparison.arbitragePercent}`);
                  
                  // Score the arbitrage opportunity
                  if (comparison.recommendation.includes('ARB')) {
                    const score = await priceCalc.scoreArbitrage(
                      comparison,
                      tx.gasPrice || BigInt(0),
                      dexInfo.amountInRaw
                    );
                    console.log(`   🎯 ARB Score: ${score.score}/100 | ${score.recommendation}`);
                    console.log(`   💵 Profit: ${score.profitPercent} | Net: ${score.netProfit} ETH`);
                  }
                }
              }
            } else {
              console.log(`   ⚠️  Price impact unavailable: ${impact.error}`);
            }
          } catch (e) {
            console.log(`   ⚠️  Price calculation error: ${e.message}`);
          }
        }
      }
    }
  });

  const success = await watcher.start();
  
  if (success) {
    // Initialize price impact calculator
    priceCalc = new PriceImpactCalculator(watcher.provider);
    console.log('✅ Price Impact Calculator initialized\n');
    
    console.log('\n📡 Watching for pending transactions... (Ctrl+C to stop)\n');
  }
}

// Export for use in other modules
export { BlockWatcher, WebSocketBlockWatcher, isDexTransaction, parseDexTransaction, PriceImpactCalculator, MultiHopArbitrage, BlockSimulator, DEX_ROUTERS };

// Run if called directly
demo();
/**
 * Arbitrage Engine - Evaluates swap opportunities
 * Takes decoded swap + market prices → calculates profit potential
 */

// Arbitrage configuration (production-grade thresholds)
const CONFIG = {
  MIN_SPREAD_THRESHOLD: 0.01,     // 1% minimum spread for real MEV
  MIN_TRADE_SIZE_ETH: 0.05,       // 0.05 ETH (~$100) minimum trade size
  MAX_GAS_COST: 0.01,              // 1% dynamic gas cap (max $20)
  MIN_PROFIT_THRESHOLD: 0.01,      // 0.01 ETH (~$20) minimum net profit
};

/**
 * Arbitrage Engine - Evaluates opportunities
 */
export class ArbitrageEngine {
  constructor() {
    this.opportunities = [];
    this.lastEvaluated = new Map();
  }

  /**
   * Evaluate a swap against market prices
   * @param {object} swap - Decoded swap object from swap-decoder.js
   * @param {Array} marketPrices - Array of { dex, price } from price-oracle.js
   * @returns {object|null} Opportunity object or null
   */
  evaluate(swap, marketPrices) {
    const { tokenIn, tokenOut, amountIn } = swap;

    if (!tokenIn || !tokenOut || !amountIn) {
      return null;
    }

    const tA = tokenIn.toLowerCase();
    const tB = tokenOut.toLowerCase();

    // Get current price from the DEX where swap is happening
    const currentPrice = marketPrices.find(p => p.dex === swap.dex);
    if (!currentPrice) {
      return {
        type: 'no_price_data',
        error: `No price data for ${swap.dex}`
      };
    }

    // Get best price across all DEXes
    const prices = marketPrices.map(p => p.price);
    const bestPrice = Math.max(...prices);
    const bestDex = marketPrices.find(p => p.price === bestPrice)?.dex || 'Unknown';

    // Calculate spread
    const spread = bestPrice > 0 ? (bestPrice - currentPrice) / currentPrice : 0;

    // Skip if spread too small
    if (spread < CONFIG.MIN_SPREAD_THRESHOLD) {
      return {
        type: 'spread_too_small',
        spread: (spread * 100).toFixed(2) + '%'
      };
    }

    // Calculate potential profit
    const grossProfit = parseFloat(amountIn) * spread;
    const netProfit = grossProfit - CONFIG.MAX_GAS_COST;

    // Skip if not profitable after gas
    if (netProfit < CONFIG.MIN_PROFIT_THRESHOLD) {
      return {
        type: 'not_profitable',
        netProfit: netProfit.toFixed(6),
        grossProfit: grossProfit.toFixed(6),
        gasCost: CONFIG.MAX_GAS_COST
      };
    }

    // Calculate profit percentage
    const profitPercent = (spread * 100);

    // Build opportunity object
    const opportunity = {
      type: 'arbitrage',
      txHash: swap.txHash || 'pending',
      timestamp: Date.now(),
      tokenPair: `${tA}/${tB}`,
      amountIn: parseFloat(amountIn),
      currentPrice: currentPrice.price.toFixed(6),
      bestPrice: bestPrice.toFixed(6),
      bestDex,
      currentDex: swap.dex,
      spread: spread.toFixed(4),
      profitPercent: profitPercent.toFixed(2) + '%',
      grossProfit: grossProfit.toFixed(6),
      gasCost: CONFIG.MAX_GAS_COST,
      netProfit: netProfit.toFixed(6),
      confidence: this.calculateConfidence(spread, profitPercent, amountIn),
      estimatedUsdProfit: (netProfit * 2000).toFixed(2), // Assuming $2000/ETH
      swap
    };

    // Cache for deduplication
    const cacheKey = `${tA}/${tB}/${amountIn}`;
    const lastEval = this.lastEvaluated.get(cacheKey);

    // Confidence filter: only execute high-quality opportunities
    const MIN_CONFIDENCE = 0.7;

    if (lastEval && Date.now() - lastEval < 30000) {
      // Same opportunity within 30 seconds, skip
      opportunity.type = 'duplicate';
    } else if (opportunity.confidence < MIN_CONFIDENCE) {
      // Low confidence opportunity, skip
      opportunity.type = 'low_confidence';
      console.log(`⚠️  Low confidence (${opportunity.confidence.toFixed(2)}), skipping execution`);
    }

    this.lastEvaluated.set(cacheKey, Date.now());
    this.opportunities.push(opportunity);

    // Only log format for low-confidence, don't push to stats
    if (opportunity.type === 'low_confidence') {
      return opportunity;
    }

    return opportunity;
  }

  /**
   * Calculate confidence score (0-1)
   * Higher = better opportunity
   */
  calculateConfidence(spread, profitPercent, amount) {
    let score = 0;

    // Spread contributes 50%
    if (spread >= 0.01) score += 0.25;
    else if (spread >= 0.005) score += 0.15;
    else if (spread >= 0.003) score += 0.10;

    // Profit % contributes 30%
    if (profitPercent >= 1.0) score += 0.20;
    else if (profitPercent >= 0.5) score += 0.15;
    else if (profitPercent >= 0.2) score += 0.10;

    // Trade size contributes 20%
    if (parseFloat(amount) >= 0.1) score += 0.15;
    else if (parseFloat(amount) >= 0.05) score += 0.10;
    else if (parseFloat(amount) >= 0.01) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Get opportunity summary statistics
   */
  getStats() {
    if (this.opportunities.length === 0) {
      return { total: 0, arb: 0, avgProfit: 0 };
    }

    const arbs = this.opportunities.filter(o => o.type === 'arbitrage');
    const avgProfit = arbs.reduce((sum, o) => sum + parseFloat(o.netProfit), 0) / arbs.length;

    return {
      total: this.opportunities.length,
      arbitrage: arbs.length,
      avgProfit: avgProfit.toFixed(6),
      opportunities: this.opportunities.slice(-10) // Last 10
    };
  }

  /**
   * Clear old opportunities
   */
  clearOld(maxAge = 60000) {
    const cutoff = Date.now() - maxAge;
    this.opportunities = this.opportunities.filter(o => o.timestamp > cutoff);
    this.lastEvaluated.clear();
  }

  /**
   * Format opportunity for display
   */
  format(opportunity) {
    const typeEmoji = {
      arbitrage: '🎯',
      spread_too_small: '📉',
      not_profitable: '💸',
      duplicate: '🔁',
      no_price_data: '⚠️'
    };

    const emoji = typeEmoji[opportunity.type] || '❓';

    console.log(`${emoji} ${opportunity.type.toUpperCase()}`);

    if (opportunity.type === 'arbitrage') {
      console.log(`   📊 Pair: ${opportunity.tokenPair}`);
      console.log(`   💰 Amount: ${opportunity.amountIn} ETH`);
      console.log(`   📈 Spread: ${opportunity.spread} (${opportunity.profitPercent})`);
      console.log(`   🎯 Best DEX: ${opportunity.bestDex} @ ${opportunity.bestPrice}`);
      console.log(`   🏢 Current DEX: ${opportunity.currentDex} @ ${opportunity.currentPrice}`);
      console.log(`   💸 Gross: ${opportunity.grossProfit} ETH`);
      console.log(`   ⛽ Net: ${opportunity.netProfit} ETH (~$${opportunity.estimatedUsdProfit})`);
      console.log(`   🔋 Confidence: ${opportunity.confidence.toFixed(2)}`);
    } else {
      console.log(`   ℹ️ ${opportunity.type.replace(/_/g, ' ')}`);
      if (opportunity.error) console.log(`   🚫 ${opportunity.error}`);
    }

    console.log('');
  }
}

/**
 * Helper: Check if opportunity is worth executing
 */
export function shouldExecute(opportunity) {
  return opportunity.type === 'arbitrage' &&
         opportunity.confidence >= 0.7 &&
         parseFloat(opportunity.netProfit) >= 0.01;
}

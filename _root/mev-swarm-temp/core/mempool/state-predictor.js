/**
 * MEV Swarm - State Predictor
 * Predicts post-transaction state and re-evaluates opportunities
 *
 * Capabilities:
 * - Reserve prediction after pending swaps
 * - Price impact calculation
 * - Opportunity re-evaluation under predicted state
 * - Frond-running opportunity detection
 */

import { ethers } from 'ethers';
import { calculateSwapImpact, getAffectedPools, getPoolKey } from './swap-decoder.js';

// Impact thresholds
export const IMPACT_THRESHOLDS = {
  SIGNIFICANT_IMPACT: 0.001, // 0.1% price impact
  HIGH_IMPACT: 0.005, // 0.5% price impact
  CRITICAL_IMPACT: 0.01, // 1% price impact
  OPPORTUNITY_LOSS_THRESHOLD: 0.1, // 10% profit reduction
};

/**
 * Predict post-transaction reserves
 */
export function predictPostTransactionReserves(swapDetails, currentReserves) {
  const impacts = calculateSwapImpact(swapDetails, currentReserves);
  const predictedReserves = new Map();

  for (const impact of impacts) {
    const poolKey = getPoolKey(impact.pool);

    if (impact.predictedReserves) {
      predictedReserves.set(poolKey, {
        ...currentReserves.get(poolKey),
        ...impact.predictedReserves,
        impact: impact.priceImpact,
        timestamp: Date.now()
      });
    }
  }

  return {
    predictedReserves,
    impacts,
    affectedPoolsCount: impacts.length
  };
}

/**
 * Calculate opportunity impact
 */
export function calculateOpportunityImpact(opportunity, oldReserves, newReserves) {
  // Simulate opportunity with old reserves
  const oldProfit = simulateOpportunityProfit(opportunity, oldReserves);

  // Simulate opportunity with new reserves
  const newProfit = simulateOpportunityProfit(opportunity, newReserves);

  const profitChange = newProfit - oldProfit;
  const profitChangePercent = oldProfit !== 0n ? (profitChange / oldProfit) * 100 : 0;

  return {
    oldProfit,
    newProfit,
    profitChange,
    profitChangePercent,
    isDestroyed: profitChange < -oldProfit * BigInt(IMPACT_THRESHOLDS.OPPORTUNITY_LOSS_THRESHOLD * 1e18 / 100),
    isReduced: profitChange < 0n,
    isEnhanced: profitChange > 0n,
    severity: getImpactSeverity(Math.abs(profitChangePercent))
  };
}

/**
 * Simulate opportunity profit with given reserves
 */
export function simulateOpportunityProfit(opportunity, reserves) {
  // Simplified simulation - full implementation would use actual slippage calculation
  let amountIn = opportunity.amountIn;
  let amountOut = amountIn;

  // Simulate each hop with reserves
  for (const edge of opportunity.edges) {
    const poolKey = getPoolKey({
      type: edge.poolType,
      token0: edge.tokenIn,
      token1: edge.tokenOut,
      fee: edge.fee
    });

    const poolReserves = reserves.get(poolKey);
    if (!poolReserves) {
      continue; // Skip if no reserves data
    }

    // Simulate swap with reserves (simplified)
    amountOut = simulateSwapWithReserves(
      amountOut,
      poolReserves,
      edge.poolType
    );
  }

  return amountOut - amountIn;
}

/**
 * Simulate swap with reserves
 */
export function simulateSwapWithReserves(amountIn, reserves, poolType) {
  // Simplified swap simulation
  // Full implementation would use actual slippage formulas from Chamber 2

  switch (poolType) {
    case 'uniswap_v2':
      // x * y = k formula
      if (reserves.reserve0 && reserves.reserve1) {
        const reserveIn = BigInt(reserves.reserve0);
        const reserveOut = BigInt(reserves.reserve1);
        const amountInWithFee = amountIn * 997n / 1000n; // 0.3% fee
        const amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        return amountOut;
      }
      return amountIn;

    case 'uniswap_v3':
      // V3 requires tick-based calculation
      // Simplified for now
      return amountIn * 997n / 1000n; // Rough estimate

    default:
      return amountIn;
  }
}

/**
 * Get impact severity
 */
export function getImpactSeverity(impactPercent) {
  if (impactPercent >= 90) return 'CRITICAL';
  if (impactPercent >= 50) return 'HIGH';
  if (impactPercent >= 20) return 'MODERATE';
  if (impactPercent >= 10) return 'LOW';
  return 'MINIMAL';
}

/**
 * Detect front-running opportunities
 */
export function detectFrontRunningOpportunities(pendingTx, opportunities, currentReserves) {
  const frontRunningOpps = [];

  // Decode pending transaction
  const swapDetails = pendingTx.swapDetails;
  if (!swapDetails) return [];

  // Predict state after transaction
  const { predictedReserves } = predictPostTransactionReserves(swapDetails, currentReserves);

  // Check each opportunity
  for (const opp of opportunities) {
    const impact = calculateOpportunityImpact(opp, currentReserves, predictedReserves);

    // Check if this opportunity would be destroyed
    if (impact.isDestroyed || impact.isReduced) {
      // Check if we can front-run
      const canFrontRun = canFrontRunOpportunity(opp, pendingTx, impact);

      if (canFrontRun) {
        frontRunningOpps.push({
          opportunity: opp,
          pendingTx: pendingTx.hash,
          impact,
          frontRunProfit: opp.netProfit - impact.newProfit,
          frontRunProfitPercent: impact.profitChangePercent,
          urgency: getFrontRunUrgency(pendingTx)
        });
      }
    }
  }

  // Sort by front-run profit
  return frontRunningOpps.sort((a, b) =>
    Number(b.frontRunProfit - a.frontRunProfit)
  );
}

/**
 * Check if opportunity can be front-run
 */
export function canFrontRunOpportunity(opportunity, pendingTx, impact) {
  // Check if opportunity uses same pools as pending transaction
  const oppPools = new Set(opportunity.edges.map(e =>
    getPoolKey({
      type: e.poolType,
      token0: e.tokenIn,
      token1: e.tokenOut,
      fee: e.fee
    })
  ));

  const pendingPools = new Set(
    getAffectedPools(pendingTx.swapDetails).map(p => getPoolKey(p))
  );

  const hasOverlap = [...oppPools].some(pool => pendingPools.has(pool));

  // Check gas price competitiveness
  const ourGasPrice = BigInt(30e9); // Our target gas price
  const pendingGasPrice = pendingTx.gasPrice || 0n;
  const canOutbid = ourGasPrice > pendingGasPrice * 110n / 100n; // Need 10% higher

  // Check timing
  const txAge = Date.now() - pendingTx.timestamp;
  const withinTimeWindow = txAge < 5000; // 5 seconds

  return hasOverlap && canOutbid && withinTimeWindow;
}

/**
 * Get front-run urgency
 */
export function getFrontRunUrgency(pendingTx) {
  const age = Date.now() - pendingTx.timestamp;
  const gasPremium = pendingTx.priority?.gasPremium || 0;

  if (age < 1000 && gasPremium > BigInt(10e9)) return 'CRITICAL';
  if (age < 3000 && gasPremium > BigInt(5e9)) return 'HIGH';
  if (age < 5000) return 'MODERATE';
  return 'LOW';
}

/**
 * Re-evaluate opportunities under predicted state
 */
export function reevaluateOpportunities(opportunities, pendingTxs, currentReserves) {
  const reevaluationResults = [];

  for (const tx of pendingTxs) {
    if (!tx.swapDetails) continue;

    // Predict state after this transaction
    const { predictedReserves, impacts } = predictPostTransactionReserves(
      tx.swapDetails,
      currentReserves
    );

    // Re-evaluate each opportunity
    for (const opp of opportunities) {
      const impact = calculateOpportunityImpact(opp, currentReserves, predictedReserves);

      if (impact.isDestroyed || impact.isReduced || impact.isEnhanced) {
        reevaluationResults.push({
          pendingTx: tx.hash,
          opportunity: opp.pathId,
          impact,
          poolImpacts: impacts,
          reevaluationRequired: true,
          recommendedAction: getRecommendedAction(impact)
        });
      }
    }
  }

  return reevaluationResults;
}

/**
 * Get recommended action based on impact
 */
export function getRecommendedAction(impact) {
  if (impact.isDestroyed) {
    return 'ABANDON'; // Opportunity no longer viable
  }

  if (impact.isReduced) {
    if (impact.severity === 'CRITICAL' || impact.severity === 'HIGH') {
      return 'ABANDON'; // Profit reduced too much
    }
    return 'RE-EVALUATE'; // May still be worth executing
  }

  if (impact.isEnhanced) {
    return 'EXPEDITE'; // Opportunity improved
  }

  return 'NO_ACTION';
}

/**
 * State Predictor Class
 */
export class StatePredictor {
  constructor(config = {}) {
    this.currentReserves = config.currentReserves || new Map();
    this.pendingTransactions = config.pendingTransactions || [];
    this.opportunities = config.opportunities || [];
    this.predictions = [];
  }

  /**
   * Update current reserves
   */
  updateReserves(reserves) {
    this.currentReserves = reserves;
  }

  /**
   * Add pending transaction
   */
  addPendingTransaction(tx) {
    this.pendingTransactions.push(tx);
  }

  /**
   * Update opportunities
   */
  updateOpportunities(opportunities) {
    this.opportunities = opportunities;
  }

  /**
   * Predict state for all pending transactions
   */
  predictAllStates() {
    const predictions = [];

    for (const tx of this.pendingTransactions) {
      if (!tx.swapDetails) continue;

      const prediction = predictPostTransactionReserves(
        tx.swapDetails,
        this.currentReserves
      );

      predictions.push({
        txHash: tx.hash,
        prediction,
        timestamp: Date.now()
      });
    }

    this.predictions = predictions;
    return predictions;
  }

  /**
   * Get front-running opportunities
   */
  getFrontRunningOpportunities() {
    return detectFrontRunningOpportunities(
      this.pendingTransactions,
      this.opportunities,
      this.currentReserves
    );
  }

  /**
   * Re-evaluate all opportunities
   */
  reevaluateAll() {
    return reevaluateOpportunities(
      this.opportunities,
      this.pendingTransactions,
      this.currentReserves
    );
  }

  /**
   * Get summary
   */
  getSummary() {
    const frontRunningOpps = this.getFrontRunningOpportunities();
    const reevaluations = this.reevaluateAll();

    return {
      pendingTransactions: this.pendingTransactions.length,
      opportunities: this.opportunities.length,
      frontRunningOpportunities: frontRunningOpps.length,
      reevaluationsRequired: reevaluations.filter(r => r.reevaluationRequired).length,
      highUrgencyCount: frontRunningOpps.filter(f => f.urgency === 'CRITICAL').length,
      predictions: this.predictions.length
    };
  }
}

export default StatePredictor;
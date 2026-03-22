/**
 * MEV Swarm - Unified Swappable Edge
 * Provides unified interface for V2 and V3 pool edges
 *
 * Goal: Path evaluator stays pool-agnostic
 * Just calls edge.simulate(amountInHuman) regardless of pool type
 */

import { ethers } from 'ethers';
import { simulateSwapV2 } from '../../arbitrage-graph.js';
import { simulateSwapV3ForPool } from '../simulators/v3-pool-simulator.js';
import { getV3State } from '../reserve-access.js';

/**
 * Swappable Edge - Unified swap interface
 * Abstracts V2/V3 differences behind a common simulate() method
 */
export class SwappableEdge {
  constructor({ poolId, poolConfig, reservesData, tokenIn, tokenOut }) {
    this.poolId = poolId;
    this.poolConfig = poolConfig;
    this.reservesData = reservesData;

    // Determine edge type
    this.type = poolConfig.type || 'uniswap_v3'; // 'V2' or 'V3'

    // Determine swap direction for this edge (from constructor params)
    this.tokenIn = tokenIn || poolConfig.token0;
    this.tokenOut = tokenOut || poolConfig.token1;
    this.feeTier = poolConfig.fee || 3000;
  }

  /**
   * Simulate swap through this edge
   * Unified interface: works for both V2 and V3 pools
   *
   * @param {number} amountInHuman - Input amount in human units
   * @returns {Promise<Object|null>} Swap simulation result
   */
  async simulate(amountInHuman) {
    try {
      if (this.type === 'V2') {
        return await this.simulateV2(amountInHuman);
      } else if (this.type === 'V3') {
        return await this.simulateV3(amountInHuman);
      } else {
        console.warn(`[SwappableEdge] Unknown pool type: ${this.type}`);
        return null;
      }
    } catch (err) {
      console.error(`[SwappableEdge] Simulation failed for ${this.poolId}:`, err.message);
      return null;
    }
  }

  /**
   * Simulate V2 swap
   * Low-level BigInt math + scaling
   */
  async simulateV2(amountInHuman) {
    const reserves = this.reservesData.get(this.poolId);
    if (!reserves || reserves.type !== 'V2') {
      return null;
    }

    // Determine swap direction
    const tokenInLower = this.tokenIn.toLowerCase();
    const token0Lower = this.poolConfig.token0.toLowerCase();
    const isForward = token0Lower === tokenInLower;

    const reserveIn = isForward ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isForward ? reserves.reserve1 : reserves.reserve0;

    const decimalsIn = isForward ? this.poolConfig.decimals0 : this.poolConfig.decimals1;
    const amountInRaw = ethers.parseUnits(amountInHuman.toString(), decimalsIn);

    // Call low-level V2 simulation
    const result = simulateSwapV2(reserveIn, reserveOut, amountInRaw);

    if (!result) {
      return null;
    }

    // Scale output to human units
    const decimalsOut = isForward ? this.poolConfig.decimals1 : this.poolConfig.decimals0;
    const amountOutHuman = Number(ethers.formatUnits(result.amountOut, decimalsOut));

    // Compute prices in human units
    const rIn = Number(reserveIn) / (10 ** decimalsIn);
    const rOut = Number(reserveOut) / (10 ** decimalsOut);
    const midPriceHuman = rOut / rIn;
    const executionPriceHuman = amountOutHuman / amountInHuman;

    const priceImpactBps = ((midPriceHuman - executionPriceHuman) / midPriceHuman) * 10000;

    // Apply invert flag if configured
    let finalMidPrice = midPriceHuman;
    let finalExecutionPrice = executionPriceHuman;
    if (this.poolConfig.invert) {
      finalMidPrice = 1 / midPriceHuman;
      finalExecutionPrice = 1 / executionPriceHuman;
    }

    return {
      amountOut: amountOutHuman,
      executionPrice: finalExecutionPrice,
      midPrice: finalMidPrice,
      priceImpactBps,
      poolType: 'V2',
      feeTier: 30, // 0.3% fixed for V2
      poolId: this.poolId
    };
  }

  /**
   * Simulate V3 swap
   * Tick-walking + scaling
   */
  async simulateV3(amountInHuman) {
    const v3State = getV3State(this.poolId, this.reservesData);
    if (!v3State) {
      console.warn(`[SwappableEdge] No V3 state for ${this.poolId}`);
      return null;
    }

    // Determine if we need to reverse direction
    const tokenInLower = this.tokenIn.toLowerCase();
    const token0Lower = this.poolConfig.token0.toLowerCase();
    const isForward = token0Lower === tokenInLower;

    // For reverse direction, we need to swap tokenOut->tokenIn
    const actualTokenIn = isForward ? this.tokenIn : this.tokenOut;

    // Call high-level V3 simulator
    const result = await simulateSwapV3ForPool({
      poolConfig: this.poolConfig,
      v3State,
      tokenIn: actualTokenIn,
      amountInHuman,
      useTickWalking: false // Set to true for accurate large-trade slippage
    });

    if (!result) {
      return null;
    }

    // For reverse direction, invert output
    if (!isForward) {
      return {
        ...result,
        amountOut: 1 / result.amountOut, // Invert for reverse swap
        executionPrice: 1 / result.executionPrice,
        midPrice: 1 / result.midPrice
      };
    }

    return {
      ...result,
      poolId: this.poolId
    };
  }

  /**
   * Get edge description for debugging
   *
   * @returns {string} Human-readable description
   */
  describe() {
    const direction = `${this.tokenIn} → ${this.tokenOut}`;
    const type = this.type === 'V2' ? 'V2 (Uniswap V2/SushiSwap)' : 'V3 (Uniswap V3)';
    const fee = this.type === 'V2' ? '0.3%' : `${this.feeTier / 100}%`;

    return `Edge: ${direction} | ${this.poolId} | ${type} | Fee: ${fee}`;
  }

  /**
   * Validate edge state
   *
   * @returns {boolean} True if edge is ready for simulation
   */
  isValid() {
    return (
      this.poolId &&
      this.poolConfig &&
      this.reservesData &&
      this.reservesData.has(this.poolId) &&
      this.tokenIn &&
      this.tokenOut
    );
  }
}

/**
 * Create swappable edges from pool configurations
 *
 * @param {Object} poolConfigs - Pool configurations
 * @param {Map} reservesData - Live reserves data
 * @returns {Map<string, SwappableEdge>} Map of edgeKey -> SwappableEdge
 */
export function createSwappableEdges(poolConfigs, reservesData) {
  const edges = new Map();

  for (const [poolName, config] of Object.entries(poolConfigs)) {
    if (!config.address) continue;

    // Create bidirectional edges with correct directions
    // Edge: token0 -> token1
    const edgeForward = new SwappableEdge({
      poolId: poolName,
      poolConfig: config,
      reservesData,
      tokenIn: config.token0,
      tokenOut: config.token1
    });

    const edgeKeyForward = `${config.token0}-${config.token1}`;
    edges.set(edgeKeyForward, edgeForward);

    // Edge: token1 -> token0
    const edgeReverse = new SwappableEdge({
      poolId: poolName,
      poolConfig: config,
      reservesData,
      tokenIn: config.token1,
      tokenOut: config.token0
    });

    const edgeKeyReverse = `${config.token1}-${config.token0}`;
    edges.set(edgeKeyReverse, edgeReverse);
  }

  return edges;
}

export default {
  SwappableEdge,
  createSwappableEdges
};

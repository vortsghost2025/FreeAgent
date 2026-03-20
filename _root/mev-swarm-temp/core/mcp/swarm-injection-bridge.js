/**
 * MEV Swarm - Swarm Injection Integration
 * 
 * Connects MCP Server (Chamber 7) to the active simple-launcher executor system.
 * Allows external agents to inject arbitrage opportunities for execution.
 * 
 * Integration Architecture:
 * ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
 * │ External Agent │────▶│  MCP Server      │────▶│ simple-launcher │
 * │ (via MCP)      │     │ (Chamber 7)      │     │ (Executor)      │
 * └─────────────────┘     └──────────────────┘     └─────────────────┘
 *                                 │
 *                    ┌────────────┴────────────┐
 *                    │ Swarm Injection Bridge  │
 *                    │ (This Module)           │
 *                    └─────────────────────────┘
 */

import { ethers } from 'ethers';
import 'dotenv/config';

// Singleton instance for the SwarmExecutor from simple-launcher
let swarmExecutorInstance = null;

/**
 * Swarm Injection Bridge
 * Provides bidirectional communication between MCP and the executor
 */
class SwarmInjectionBridge {
  constructor() {
    this.pendingOpportunities = [];
    this.executionQueue = [];
    this.executionHistory = [];
    this.subscribers = new Set();
    this.isInitialized = false;
    
    // Configuration from environment
    this.config = {
      executorAddress: process.env.EXECUTOR_ADDRESS || '0x2809566Ee1491a6f3A80Ec7ad3d04a5527A52138',
      rpcUrl: process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL,
      privateKey: process.env.PRIVATE_KEY
    };
  }

  /**
   * Initialize the bridge with the executor
   */
  async initialize(executor = null) {
    if (this.isInitialized) {
      console.log('⚠️  SwarmInjectionBridge already initialized');
      return this;
    }

    console.log('🔗 Initializing Swarm Injection Bridge...');
    
    if (executor) {
      swarmExecutorInstance = executor;
      console.log('✅ Connected to provided executor');
    } else if (this.config.rpcUrl && this.config.privateKey) {
      // Create executor instance if not provided
      try {
        const { SwarmExecutor } = await import('../../simple-launcher.js');
        swarmExecutorInstance = new SwarmExecutor();
        if (typeof swarmExecutorInstance.init === 'function') {
          await swarmExecutorInstance.init();
        }
        console.log('✅ Created new executor instance');
      } catch (err) {
        console.log('⚠️  Could not create executor:', err.message);
      }
    }

    this.isInitialized = true;
    console.log('✅ Swarm Injection Bridge ready');
    
    return this;
  }

  /**
   * Set the executor instance from external source
   */
  setExecutor(executor) {
    swarmExecutorInstance = executor;
    console.log('✅ Executor instance set via injection');
  }

  /**
   * Get the current executor instance
   */
  getExecutor() {
    return swarmExecutorInstance;
  }

  /**
   * Inject an opportunity from external agent (MCP tool call)
   * This is the main entry point for external arbitrage triggers
   */
  async injectOpportunity(opportunity) {
    console.log('\n📥 SWARM INJECTION: Opportunity received');
    console.log('   Source: MCP Tool');
    console.log('   Pair:', opportunity.pair || `${opportunity.tokenIn}/${opportunity.tokenOut}`);
    
    // Validate opportunity structure
    const validation = this.validateOpportunity(opportunity);
    if (!validation.valid) {
      console.log('❌ Invalid opportunity:', validation.errors.join(', '));
      return {
        success: false,
        error: validation.errors.join(', '),
        timestamp: Date.now()
      };
    }

    // Normalize opportunity format
    const normalized = this.normalizeOpportunity(opportunity);
    
    // Add to pending queue
    const opportunityId = `inj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedOpportunity = {
      id: opportunityId,
      ...normalized,
      status: 'pending',
      injectedAt: Date.now(),
      source: 'mcp'
    };
    
    this.pendingOpportunities.push(queuedOpportunity);
    
    console.log('✅ Opportunity queued for execution');
    console.log('   ID:', opportunityId);
    console.log('   Amount:', ethers.formatEther(normalized.amountIn), 'ETH');
    console.log('   Expected profit:', normalized.expectedProfit || 'N/A');
    
    // Try to execute immediately if executor is available
    if (swarmExecutorInstance) {
      return await this.executeOpportunity(queuedOpportunity);
    } else {
      console.log('⚠️  No executor available - opportunity queued for later execution');
      return {
        success: true,
        opportunityId,
        status: 'queued',
        message: 'No executor available - opportunity queued',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate incoming opportunity
   */
  validateOpportunity(opportunity) {
    const errors = [];
    
    // Required fields
    if (!opportunity.tokenIn && !opportunity.path?.tokenIn) {
      errors.push('Missing tokenIn');
    }
    if (!opportunity.tokenOut && !opportunity.path?.tokenOut) {
      errors.push('Missing tokenOut');
    }
    if (!opportunity.amountIn && !opportunity.path?.amountIn) {
      errors.push('Missing amountIn');
    }
    
    // Validate amounts
    if (opportunity.amountIn) {
      const amount = BigInt(opportunity.amountIn);
      if (amount <= 0n) {
        errors.push('amountIn must be positive');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize opportunity format to executor format
   */
  normalizeOpportunity(opportunity) {
    // Handle both direct format and path-based format
    const tokenIn = opportunity.tokenIn || opportunity.path?.tokenIn;
    const tokenOut = opportunity.tokenOut || opportunity.path?.tokenOut;
    let amountIn = opportunity.amountIn || opportunity.path?.amountIn;
    
    // Convert string amounts to BigInt
    if (typeof amountIn === 'string') {
      if (amountIn.startsWith('0x')) {
        amountIn = BigInt(amountIn);
      } else {
        amountIn = ethers.parseEther(amountIn);
      }
    }
    
    return {
      tokenIn,
      tokenOut,
      amountIn,
      expectedProfit: opportunity.expectedProfit || '0',
      profitRatio: opportunity.profitRatio || '0',
      minOut: opportunity.minOut || '0',
      gasMultiplier: opportunity.gasMultiplier || 1.2,
      slippageBps: opportunity.slippageBps || 30,
      path: opportunity.path || null,
      metadata: opportunity.metadata || {}
    };
  }

  /**
   * Execute a queued opportunity
   */
  async executeOpportunity(queuedOpportunity) {
    if (!swarmExecutorInstance) {
      return {
        success: false,
        error: 'No executor available',
        opportunityId: queuedOpportunity.id,
        timestamp: Date.now()
      };
    }

    console.log('\n⚡ EXECUTING INJECTED OPPORTUNITY');
    console.log('   ID:', queuedOpportunity.id);
    
    try {
      // Format for executor
      const execOpportunity = {
        tokenIn: queuedOpportunity.tokenIn,
        tokenOut: queuedOpportunity.tokenOut,
        amountIn: queuedOpportunity.amountIn.toString(),
        minOut: queuedOpportunity.minOut,
        expectedProfit: queuedOpportunity.expectedProfit,
        profitRatio: queuedOpportunity.profitRatio,
        gasMultiplier: queuedOpportunity.gasMultiplier,
        slippageBps: queuedOpportunity.slippageBps
      };
      
      const result = await swarmExecutorInstance.execute(execOpportunity);
      
      // Update history
      const executionRecord = {
        ...queuedOpportunity,
        status: result.success ? 'executed' : 'failed',
        executedAt: Date.now(),
        result
      };
      
      this.executionHistory.push(executionRecord);
      
      // Remove from pending
      this.pendingOpportunities = this.pendingOpportunities.filter(
        opp => opp.id !== queuedOpportunity.id
      );
      
      // Notify subscribers
      this.notifySubscribers({
        type: 'execution',
        opportunity: executionRecord,
        result
      });
      
      return {
        success: result.success,
        opportunityId: queuedOpportunity.id,
        txHash: result.txHash,
        block: result.block,
        error: result.error,
        timestamp: Date.now()
      };
      
    } catch (err) {
      console.log('❌ Execution failed:', err.message);
      
      return {
        success: false,
        opportunityId: queuedOpportunity.id,
        error: err.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Subscribe to injection events
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(event) {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (err) {
        console.error('Subscriber error:', err.message);
      }
    }
  }

  /**
   * Get pending opportunities
   */
  getPendingOpportunities() {
    return this.pendingOpportunities;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get bridge status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasExecutor: !!swarmExecutorInstance,
      pendingCount: this.pendingOpportunities.length,
      historyCount: this.executionHistory.length,
      executorAddress: this.config.executorAddress,
      rpcConnected: !!this.config.rpcUrl
    };
  }

  /**
   * Clear pending opportunities
   */
  clearPending() {
    const count = this.pendingOpportunities.length;
    this.pendingOpportunities = [];
    console.log(`🗑️  Cleared ${count} pending opportunities`);
    return count;
  }

  /**
   * Get system stats
   */
  async getSystemStats() {
    const status = this.getStatus();
    
    let executorBalance = null;
    if (swarmExecutorInstance) {
      try {
        const balance = await swarmExecutorInstance.getBalance();
        executorBalance = ethers.formatEther(balance) + ' ETH';
      } catch (err) {
        executorBalance = 'unavailable';
      }
    }
    
    return {
      ...status,
      executorBalance,
      uptime: process.uptime()
    };
  }
}

// Singleton instance
let bridgeInstance = null;

/**
 * Get the Swarm Injection Bridge singleton
 */
export function getSwarmInjectionBridge() {
  if (!bridgeInstance) {
    bridgeInstance = new SwarmInjectionBridge();
  }
  return bridgeInstance;
}

/**
 * Initialize the bridge with an executor
 */
export async function initializeSwarmInjection(executor = null) {
  const bridge = getSwarmInjectionBridge();
  return await bridge.initialize(executor);
}

/**
 * Inject an opportunity from external agent
 */
export async function injectOpportunity(opportunity) {
  const bridge = getSwarmInjectionBridge();
  return await bridge.injectOpportunity(opportunity);
}

/**
 * Set the executor instance
 */
export function setSwarmExecutor(executor) {
  const bridge = getSwarmInjectionBridge();
  bridge.setExecutor(executor);
}

/**
 * Get the executor instance
 */
export function getSwarmExecutor() {
  return swarmExecutorInstance;
}

/**
 * Get pending opportunities
 */
export function getPendingOpportunities() {
  const bridge = getSwarmInjectionBridge();
  return bridge.getPendingOpportunities();
}

/**
 * Get execution history
 */
export function getExecutionHistory(limit) {
  const bridge = getSwarmInjectionBridge();
  return bridge.getExecutionHistory(limit);
}

/**
 * Get bridge status
 */
export function getSwarmStatus() {
  const bridge = getSwarmInjectionBridge();
  return bridge.getStatus();
}

/**
 * Get system stats
 */
export async function getSystemStats() {
  const bridge = getSwarmInjectionBridge();
  return await bridge.getSystemStats();
}

/**
 * Subscribe to injection events
 */
export function subscribeToInjections(callback) {
  const bridge = getSwarmInjectionBridge();
  return bridge.subscribe(callback);
}

// MCP Tool Handlers - These connect MCP tools to the bridge

/**
 * Handle MCP execute_arbitrage tool call
 */
export async function handleMCPExecuteArbitrage(args) {
  const { pathId, amountIn, useFlashLoan, slippageBps } = args;
  
  // Convert amount to proper format
  let amount;
  if (typeof amountIn === 'string') {
    if (amountIn.startsWith('0x')) {
      amount = BigInt(amountIn);
    } else {
      amount = ethers.parseEther(amountIn);
    }
  } else {
    amount = amountIn;
  }
  
  const opportunity = {
    tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    amountIn: amount,
    expectedProfit: '0',
    profitRatio: '0',
    slippageBps: slippageBps || 50,
    path: { pathId },
    metadata: {
      useFlashLoan: useFlashLoan || false,
      source: 'mcp_tool'
    }
  };
  
  return await injectOpportunity(opportunity);
}

/**
 * Handle MCP scan_arbitrage tool call - scan and inject if profitable
 */
export async function handleMCPScanArbitrage(args) {
  const { tokens, maxDepth, minProfit } = args;
  
  // Import the pool watcher to scan for opportunities
  try {
    const { findArbitrageOpportunities, POOLS } = await import('../../pool-watcher.js');
    
    // Find opportunities
    const opportunities = await findArbitrageOpportunities();
    
    if (!opportunities || opportunities.length === 0) {
      return {
        success: true,
        opportunities: [],
        message: 'No arbitrage opportunities found',
        timestamp: Date.now()
      };
    }
    
    // Filter by minProfit
    const minProfitEth = minProfit ? parseFloat(minProfit) : 0.01;
    const filtered = opportunities.filter(opp => 
      opp.spread >= minProfitEth
    );
    
    if (filtered.length === 0) {
      return {
        success: true,
        opportunities: opportunities.map(o => ({
          pair: o.pair,
          spread: o.spread,
          buyFrom: o.buyFrom,
          sellTo: o.sellTo,
          profitable: false
        })),
        message: 'Opportunities found but below profit threshold',
        timestamp: Date.now()
      };
    }
    
    // Return opportunities without executing (let agent decide)
    return {
      success: true,
      opportunities: filtered.map(opp => ({
        pair: opp.pair,
        spread: opp.spread,
        buyFrom: opp.buyFrom,
        sellTo: opp.sellTo,
        profitable: true,
        canExecute: true
      })),
      message: `Found ${filtered.length} profitable opportunities`,
      timestamp: Date.now()
    };
    
  } catch (err) {
    return {
      success: false,
      error: err.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Handle MCP get_pool_reserves tool call
 */
export async function handleMCPGetPoolReserves(args) {
  const { poolAddress, poolType } = args;
  
  if (!poolAddress) {
    return {
      success: false,
      error: 'poolAddress required',
      timestamp: Date.now()
    };
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    
    let reserves;
    if (poolType === 'uniswap_v3') {
      const pool = new ethers.Contract(
        poolAddress,
        ['function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'],
        provider
      );
      const slot0 = await pool.slot0();
      reserves = {
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: slot0.tick,
        feeProtocol: slot0.feeProtocol
      };
    } else {
      // Uniswap V2
      const pool = new ethers.Contract(
        poolAddress,
        ['function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
        provider
      );
      const r = await pool.getReserves();
      reserves = {
        reserve0: r.reserve0.toString(),
        reserve1: r.reserve1.toString(),
        blockTimestampLast: r.blockTimestampLast
      };
    }
    
    return {
      success: true,
      poolAddress,
      poolType: poolType || 'uniswap_v2',
      reserves,
      timestamp: Date.now()
    };
    
  } catch (err) {
    return {
      success: false,
      error: err.message,
      timestamp: Date.now()
    };
  }
}

export default {
  getSwarmInjectionBridge,
  initializeSwarmInjection,
  injectOpportunity,
  setSwarmExecutor,
  getSwarmExecutor,
  getPendingOpportunities,
  getExecutionHistory,
  getSwarmStatus,
  getSystemStats,
  subscribeToInjections,
  handleMCPExecuteArbitrage,
  handleMCPScanArbitrage,
  handleMCPGetPoolReserves
};

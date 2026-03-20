/**
 * MEV Swarm - Mempool Monitor
 * Watches pending transactions and identifies MEV-relevant activity
 *
 * Capabilities:
 * - Pending transaction filtering (swaps, large value)
 * - Transaction decoding (V2/V3 swap detection)
 * - Real-time streaming via WebSocket
 * - Batch polling fallback
 */

import { ethers } from 'ethers';

// Swap function signatures (4-byte selectors)
export const SWAP_SELECTORS = {
  // Uniswap V2
  '0x022c0d9f': 'swapExactTokensForTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x18cbafe5': 'swapExactTokensForETH',

  // Uniswap V3
  '0xc04b8d59': 'exactInputSingle',
  '0xdb3e2198': 'exactInput',

  // SushiSwap
  '0x38ed1739': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',

  // Curve
  '0x3df02124': 'exchange',
  '0x442787a6': 'exchange_underlying'
};

// MEV-relevant addresses (routers, pools)
export const MEV_RELEVANT_ADDRESSES = {
  routers: [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'  // SushiSwap Router
  ],
  // Can be extended with known pool addresses
  pools: []
};

// Transaction filters
export const TRANSACTION_FILTERS = {
  MIN_VALUE_ETH: ethers.parseEther('1'), // 1 ETH minimum
  MIN_GAS_PRICE: 20e9, // 20 gwei minimum
  MAX_AGE_MS: 10000, // 10 seconds maximum age
  SWAP_FUNCTIONS: Object.keys(SWAP_SELECTORS)
};

/**
 * Decode swap transaction
 */
export function decodeSwapTransaction(txData) {
  if (!txData || txData.length < 10) {
    return null;
  }

  const selector = txData.slice(0, 10);
  const swapType = SWAP_SELECTORS[selector];

  if (!swapType) {
    return null;
  }

  return {
    selector,
    swapType,
    isSwap: true,
    parameters: extractSwapParameters(txData, selector)
  };
}

/**
 * Extract swap parameters from transaction data
 */
export function extractSwapParameters(txData, selector) {
  // Simplified parameter extraction
  // Full implementation would parse based on ABI
  try {
    const iface = new ethers.Interface([
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint deadline, uint amountIn, uint amountOutMinimum, uint160 sqrtPriceLimitX96) returns (uint amountOut)',
      'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)'
    ]);

    return iface.parseTransaction({ data: txData })?.args || {};
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Check if transaction is MEV-relevant
 */
export function isMEVRelevant(tx) {
  // Check value threshold
  if (tx.value && tx.value >= TRANSACTION_FILTERS.MIN_VALUE_ETH) {
    return true;
  }

  // Check gas price
  if (tx.gasPrice && tx.gasPrice >= TRANSACTION_FILTERS.MIN_GAS_PRICE) {
    return true;
  }

  // Check swap function
  if (tx.to) {
    const isRouter = MEV_RELEVANT_ADDRESSES.routers.some(
      addr => addr.toLowerCase() === tx.to.toLowerCase()
    );
    if (isRouter) {
      return true;
    }
  }

  // Check swap selector
  if (tx.data) {
    const selector = tx.data.slice(0, 10);
    if (SWAP_SELECTORS[selector]) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate transaction priority
 */
export function calculateTransactionPriority(tx, currentBlockGasPrice) {
  if (!tx.gasPrice) return 0;

  const gasPremium = Number(tx.gasPrice) - Number(currentBlockGasPrice);
  const gasPriceRatio = Number(tx.gasPrice) / Number(currentBlockGasPrice);

  return {
    gasPremium,
    gasPriceRatio,
    priorityScore: gasPremium * gasPriceRatio
  };
}

/**
 * Mempool Monitor Class
 */
export class MempoolMonitor {
  constructor(config = {}) {
    this.provider = config.provider || null;
    this.onPendingTx = config.onPendingTx || (() => {});
    this.onNewBlock = config.onNewBlock || (() => {});
    this.minValue = config.minValue || TRANSACTION_FILTERS.MIN_VALUE_ETH;
    this.minGasPrice = config.minGasPrice || TRANSACTION_FILTERS.MIN_GAS_PRICE;
    this.isRunning = false;
    this.pendingTransactions = new Map();
  }

  /**
   * Set provider
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Start monitoring mempool
   */
  async start() {
    if (this.isRunning || !this.provider) {
      return;
    }

    this.isRunning = true;

    try {
      // Try WebSocket first for real-time updates
      await this.startWebSocketMonitoring();
    } catch (error) {
      console.warn('WebSocket monitoring failed, falling back to polling:', error.message);
      await this.startPollingMonitoring();
    }
  }

  /**
   * Stop monitoring mempool
   */
  stop() {
    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /**
   * Start WebSocket-based monitoring
   */
  async startWebSocketMonitoring() {
    this.subscription = await this.provider.subscribe({
      topics: ['pending']
    }, (error, result) => {
      if (error) {
        console.error('Mempool subscription error:', error);
        return;
      }

      this.handlePendingTransaction(result);
    });
  }

  /**
   * Start polling-based monitoring
   */
  async startPollingMonitoring() {
    this.pollingInterval = setInterval(async () => {
      try {
        const pendingBlock = await this.provider.getBlock('pending', true);
        if (pendingBlock && pendingBlock.transactions) {
          for (const tx of pendingBlock.transactions) {
            this.handlePendingTransaction(tx);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000); // Poll every second
  }

  /**
   * Handle pending transaction
   */
  handlePendingTransaction(tx) {
    try {
      // Skip if already processed
      if (this.pendingTransactions.has(tx.hash)) {
        return;
      }

      // Filter by value and gas price
      if (tx.value && tx.value < this.minValue) {
        return;
      }

      if (tx.gasPrice && tx.gasPrice < this.minGasPrice) {
        return;
      }

      // Decode swap if applicable
      const swapInfo = tx.data ? decodeSwapTransaction(tx.data) : null;

      // Calculate priority
      const currentGasPrice = BigInt(this.provider._network?.chainId ? 20e9 : 20e9); // Default
      const priority = calculateTransactionPriority(tx, currentGasPrice);

      // Create transaction info
      const txInfo = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasPrice: tx.gasPrice,
        gasLimit: tx.gasLimit,
        data: tx.data,
        swapInfo,
        priority,
        isMEVRelevant: isMEVRelevant(tx),
        timestamp: Date.now()
      };

      // Store in pending transactions
      this.pendingTransactions.set(tx.hash, txInfo);

      // Emit to callback
      this.onPendingTx(txInfo);

      // Clean up old transactions
      this.cleanupOldTransactions();

    } catch (error) {
      console.error('Error handling pending transaction:', error);
    }
  }

  /**
   * Clean up old pending transactions
   */
  cleanupOldTransactions() {
    const now = Date.now();
    const maxAge = TRANSACTION_FILTERS.MAX_AGE_MS;

    for (const [hash, tx] of this.pendingTransactions) {
      if (now - tx.timestamp > maxAge) {
        this.pendingTransactions.delete(hash);
      }
    }
  }

  /**
   * Get current pending transactions
   */
  getPendingTransactions() {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * Get high-priority pending transactions
   */
  getHighPriorityTransactions() {
    const txs = this.getPendingTransactions();
    return txs
      .filter(tx => tx.priority.priorityScore > 1000) // Threshold
      .sort((a, b) => b.priority.priorityScore - a.priority.priorityScore);
  }

  /**
   * Get swap transactions
   */
  getSwapTransactions() {
    const txs = this.getPendingTransactions();
    return txs.filter(tx => tx.swapInfo && tx.swapInfo.isSwap);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const txs = this.getPendingTransactions();
    const swapTxs = this.getSwapTransactions();
    const highPriorityTxs = this.getHighPriorityTransactions();

    return {
      totalPending: txs.length,
      swapTransactions: swapTxs.length,
      highPriorityTransactions: highPriorityTxs.length,
      averageGasPrice: txs.length > 0
        ? txs.reduce((sum, tx) => sum + Number(tx.gasPrice), 0) / txs.length
        : 0,
      averageValue: txs.length > 0
        ? txs.reduce((sum, tx) => sum + Number(tx.value || 0n), 0) / txs.length
        : 0,
      isRunning: this.isRunning
    };
  }
}

export default MempoolMonitor;
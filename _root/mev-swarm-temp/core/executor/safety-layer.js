/**
 * MEV Swarm - Safety Layer
 * Revert protection and risk management for execution
 *
 * Capabilities:
 * - Slippage protection
 * - Gas limit optimization
 * - Deadline management
 * - Revert detection and handling
 * - Execution monitoring
 */

import { ethers } from 'ethers';

// Safety thresholds
export const SAFETY_THRESHOLDS = {
  MAX_SLIPPAGE: 500, // 5% maximum slippage
  DEFAULT_SLIPPAGE: 50, // 0.5% default slippage
  MIN_GAS_BUFFER: 1.1, // 10% gas buffer
  MAX_GAS_BUFFER: 1.5, // 50% gas buffer
  DEFAULT_DEADLINE: 300, // 5 minutes default deadline
  MIN_DEADLINE: 60, // 1 minute minimum deadline
  MAX_DEADLINE: 1800, // 30 minutes maximum deadline

  MAX_EXECUTION_TIME: 30000, // 30 seconds maximum execution time
  MAX_CONFIRMATION_BLOCKS: 20, // 20 blocks maximum confirmation time

  REVERT_PROTECTION_ENABLED: true,
  PRICE_PROTECTION_ENABLED: true
};

/**
 * Calculate safe gas limit
 */
export function calculateSafeGasLimit(estimatedGas, options = {}) {
  const buffer = options.gasBuffer || SAFETY_THRESHOLDS.MIN_GAS_BUFFER;
  const safeGasLimit = (BigInt(estimatedGas) * BigInt(Math.round(buffer * 100))) / 100n;

  // Ensure minimum gas limit
  const minGasLimit = 21000n; // Base transaction cost

  return safeGasLimit > minGasLimit ? safeGasLimit : minGasLimit;
}

/**
 * Calculate safe deadline
 */
export function calculateSafeDeadline(options = {}) {
  const deadline = options.deadline || SAFETY_THRESHOLDS.DEFAULT_DEADLINE;
  const minDeadline = options.minDeadline || SAFETY_THRESHOLDS.MIN_DEADLINE;
  const maxDeadline = options.maxDeadline || SAFETY_THRESHOLDS.MAX_DEADLINE;

  const safeDeadline = Math.min(Math.max(deadline, minDeadline), maxDeadline);
  const timestamp = Math.floor(Date.now() / 1000) + safeDeadline;

  return timestamp;
}

/**
 * Calculate slippage tolerance
 */
export function calculateSlippageTolerance(amountOut, slippageBps) {
  const slippage = slippageBps || SAFETY_THRESHOLDS.DEFAULT_SLIPPAGE;
  const maxSlippage = SAFETY_THRESHOLDS.MAX_SLIPPAGE;

  const safeSlippage = Math.min(slippage, maxSlippage);
  const toleranceAmount = (amountOut * (10000n - BigInt(safeSlippage))) / 10000n;

  return {
    slippageBps: safeSlippage,
    slippagePercentage: safeSlippage / 100,
    toleranceAmount,
    minAmountOut: amountOut - toleranceAmount
  };
}

/**
 * Validate transaction parameters
 */
export function validateTransactionParams(tx) {
  const errors = [];

  // Check gas limit
  if (!tx.gasLimit || tx.gasLimit <= 0) {
    errors.push('Invalid or missing gas limit');
  }

  // Check deadline
  if (!tx.deadline || tx.deadline <= Date.now() / 1000) {
    errors.push('Invalid or expired deadline');
  }

  // Check destination
  if (!tx.to || !ethers.isAddress(tx.to)) {
    errors.push('Invalid destination address');
  }

  // Check value
  if (tx.value !== undefined && (typeof tx.value !== 'bigint' || tx.value < 0)) {
    errors.push('Invalid transaction value');
  }

  // Check calldata
  if (!tx.data || tx.data.length < 10) {
    errors.push('Invalid or missing calldata');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Monitor transaction execution
 */
export async function monitorTransactionExecution(txHash, provider, options = {}) {
  const {
    maxBlocks = SAFETY_THRESHOLDS.MAX_CONFIRMATION_BLOCKS,
    timeout = SAFETY_THRESHOLDS.MAX_EXECUTION_TIME
  } = options;

  return new Promise((resolve, reject) => {
    let confirmed = false;
    let timeoutFired = false;

    // Watch for transaction confirmation
    const receiptPromise = provider.waitForTransaction(txHash, maxBlocks);

    // Timeout promise
    const timeoutPromise = new Promise((_, rejectTimeout) => {
      setTimeout(() => {
        timeoutFired = true;
        rejectTimeout(new Error('Transaction execution timeout'));
      }, timeout);
    });

    // Race between confirmation and timeout
    Promise.race([receiptPromise, timeoutPromise])
      .then(receipt => {
        if (timeoutFired) return; // Timeout already rejected

        confirmed = true;
        const executionTime = Date.now() - options.startTime;

        resolve({
          success: true,
          receipt,
          executionTime,
          confirmed: true,
          timedOut: false
        });
      })
      .catch(error => {
        if (confirmed) return; // Already resolved

        resolve({
          success: false,
          error: error.message,
          receipt: null,
          confirmed: false,
          timedOut: timeoutFired,
          executionTime: timeoutFired ? timeout : null
        });
      });
  });
}

/**
 * Detect transaction revert
 */
export function detectRevert(receipt) {
  if (!receipt) {
    return { reverted: false, reason: 'No receipt' };
  }

  // Check status
  if (receipt.status === 0) {
    return {
      reverted: true,
      reason: 'Transaction reverted',
      gasUsed: receipt.gasUsed,
      gasLimit: receipt.gasLimit || 0n
    };
  }

  // Check for specific revert reasons
  if (receipt.logs && receipt.logs.length > 0) {
    const lastLog = receipt.logs[receipt.logs.length - 1];
    if (lastLog?.topics?.[0]?.startsWith('0x08c379a0')) {
      return {
        reverted: true,
        reason: 'SafeMath panic',
        gasUsed: receipt.gasUsed
      };
    }
  }

  return {
    reverted: false,
    reason: 'Success',
    gasUsed: receipt.gasUsed
  };
}

/**
 * Calculate revert reason from error data
 */
export function parseRevertReason(error) {
  if (!error || !error.data) {
    return 'Unknown error';
  }

  try {
    // Standard revert signature
    const errorSignature = error.data.slice(0, 10);

    // Parse common revert reasons
    const revertReasons = {
      '0x08c379a0': 'SafeMath panic',
      '0x4e487b71': 'ERC20 insufficient balance',
      '0x70a08231': 'ERC20 insufficient allowance',
      '0x3bbfce00': 'ERC20 transfer failed'
    };

    return revertReasons[errorSignature] || 'Custom revert';

  } catch (parseError) {
    return 'Unable to parse error';
  }
}

/**
 * Safety Layer Class
 */
export class SafetyLayer {
  constructor(config = {}) {
    this.provider = config.provider || null;
    this.signer = config.signer || null;
    this.slippageProtection = config.slippageProtection !== false;
    this.gasOptimization = config.gasOptimization !== false;
    this.revertProtection = config.revertProtection !== false;
    this.executionMonitoring = config.executionMonitoring !== false;

    this.currentNonce = null;
    this.pendingTransactions = new Map();
    this.completedTransactions = new Map();
  }

  /**
   * Set provider
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Set signer
   */
  setSigner(signer) {
    this.signer = signer;
  }

  /**
   * Prepare safe transaction
   */
  prepareSafeTransaction(rawTx, options = {}) {
    const tx = { ...rawTx };

    // Add gas limit with safety buffer
    if (this.gasOptimization && tx.gasLimit) {
      tx.gasLimit = calculateSafeGasLimit(tx.gasLimit, options.gasBuffer);
    }

    // Add deadline
    if (!tx.deadline) {
      tx.deadline = calculateSafeDeadline(options.deadline);
    }

    // Add slippage protection
    if (this.slippageProtection && options.amountOut) {
      const slippage = calculateSlippageTolerance(options.amountOut, options.slippageBps);
      tx.minAmountOut = slippage.minAmountOut;
    }

    // Validate transaction
    const validation = validateTransactionParams(tx);
    if (!validation.valid) {
      throw new Error(`Invalid transaction: ${validation.errors.join(', ')}`);
    }

    return tx;
  }

  /**
   * Execute transaction with safety
   */
  async executeTransaction(tx, options = {}) {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    const startTime = Date.now();

    try {
      // Send transaction
      const txResponse = await this.signer.sendTransaction({
        to: tx.to,
        value: tx.value || 0n,
        data: tx.data,
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice,
        nonce: tx.nonce
      });

      // Track pending transaction
      this.pendingTransactions.set(txResponse.hash, {
        ...tx,
        hash: txResponse.hash,
        submittedAt: startTime,
        nonce: txResponse.nonce
      });

      // Monitor execution
      const executionResult = await monitorTransactionExecution(
        txResponse.hash,
        this.provider,
        { startTime, ...options.monitoring }
      );

      if (executionResult.success) {
        // Move to completed
        this.completedTransactions.set(txResponse.hash, {
          ...this.pendingTransactions.get(txResponse.hash),
          ...executionResult,
          completedAt: Date.now()
        });
        this.pendingTransactions.delete(txResponse.hash);
      }

      // Check for revert
      const revertInfo = detectRevert(executionResult.receipt);

      return {
        success: executionResult.success,
        txHash: txResponse.hash,
        receipt: executionResult.receipt,
        reverted: revertInfo.reverted,
        revertReason: revertInfo.reason,
        executionTime: executionResult.executionTime,
        gasUsed: executionResult.receipt?.gasUsed,
        timedOut: executionResult.timedOut
      };

    } catch (error) {
      // Parse error
      const revertReason = parseRevertReason(error);

      return {
        success: false,
        txHash: null,
        receipt: null,
        reverted: true,
        revertReason: revertReason,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(txHash) {
    const pending = this.pendingTransactions.get(txHash);
    const completed = this.completedTransactions.get(txHash);

    if (completed) {
      return {
        status: 'completed',
        ...completed,
        timeSinceCompletion: Date.now() - completed.completedAt
      };
    }

    if (pending) {
      return {
        status: 'pending',
        ...pending,
        timeSinceSubmission: Date.now() - pending.submittedAt
      };
    }

    return {
      status: 'unknown',
      txHash
    };
  }

  /**
   * Get safety statistics
   */
  getSafetyStats() {
    const pendingCount = this.pendingTransactions.size;
    const completedCount = this.completedTransactions.size;

    // Calculate success rate
    const successfulTxs = Array.from(this.completedTransactions.values())
      .filter(tx => !tx.reverted);

    const successRate = completedCount > 0
      ? (successfulTxs.length / completedCount) * 100
      : 0;

    return {
      pendingTransactions: pendingCount,
      completedTransactions: completedCount,
      successfulTransactions: successfulTxs.length,
      failedTransactions: completedCount - successfulTxs.length,
      successRate: successRate.toFixed(1),
      slippageProtection: this.slippageProtection,
      gasOptimization: this.gasOptimization,
      revertProtection: this.revertProtection,
      executionMonitoring: this.executionMonitoring
    };
  }

  /**
   * Clean up old transactions
   */
  cleanupOldTransactions(maxAge = 3600000) { // 1 hour
    const now = Date.now();

    // Clean pending transactions
    for (const [hash, tx] of this.pendingTransactions) {
      if (now - tx.submittedAt > maxAge) {
        this.pendingTransactions.delete(hash);
      }
    }

    // Clean completed transactions
    for (const [hash, tx] of this.completedTransactions) {
      if (tx.completedAt && now - tx.completedAt > maxAge * 2) {
        this.completedTransactions.delete(hash);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.provider) this.provider = config.provider;
    if (config.signer) this.signer = config.signer;
    if (config.slippageProtection !== undefined) {
      this.slippageProtection = config.slippageProtection;
    }
    if (config.gasOptimization !== undefined) {
      this.gasOptimization = config.gasOptimization;
    }
    if (config.revertProtection !== undefined) {
      this.revertProtection = config.revertProtection;
    }
    if (config.executionMonitoring !== undefined) {
      this.executionMonitoring = config.executionMonitoring;
    }
  }

  /**
   * Get current nonce
   */
  async getCurrentNonce() {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    return await this.signer.getNonce();
  }

  /**
   * Update nonce management
   */
  async updateNonce() {
    this.currentNonce = await this.getCurrentNonce();
  }
}

export default SafetyLayer;
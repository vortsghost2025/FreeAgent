# REMOVED: sensitive data redacted by automated security cleanup
/**
 * MEV Swarm - Transaction Builder
 * Constructs arbitrage transactions from opportunities
 *
 * Capabilities:
 * - Flash loan transaction construction
 * - Multi-hop swap encoding
 * - Gas-optimized transaction building
 * - Router call encoding
 */

import { ethers } from 'ethers';

// Router addresses
export const ROUTER_ADDRESSES = {
  uniswap_v2: 'REDACTED_ADDRESS',
  uniswap_v3: 'REDACTED_ADDRESS',
  sushiswap: 'REDACTED_ADDRESS',
  aave_pool: 'REDACTED_ADDRESS',
  balancer_vault: 'REDACTED_ADDRESS'
};

// Flash loan providers
export const FLASH_LOAN_PROVIDERS = {
  aave: 'REDACTED_ADDRESS',
  dydx: '0x1E0447b19BB6EcFdAe1eA432eaA572B69b',
  uniswap_v3: 'REDACTED_ADDRESS'
};

// Method signatures
export const METHOD_SIGNATURES = {
  // Aave flash loan
  FLASH_LOAN: '0xa296014e', // flashLoan(address receiverAddress, address[] assets, uint256[] amounts, uint256[] interestRateModes, address onBehalfOf, bytes params, uint16 referralCode)

  // Uniswap V2
  SWAP_EXACT_TOKENS_FOR_TOKENS: '0x38ed1739', // swapExactTokensForTokensSupportingFeeOnTransferTokens
  SWAP_EXACT_ETH_FOR_TOKENS: '0x7ff36ab5', // swapExactETHForTokensSupportingFeeOnTransferTokens
  SWAP_EXACT_TOKENS_FOR_ETH: '0x18cbafe5', // swapExactTokensForETHSupportingFeeOnTransferTokens

  // Uniswap V3
  EXACT_INPUT_SINGLE: '0x414bf389', // exactInputSingle
  EXACT_INPUT: '0xc04b8d59', // exactInput

  // SushiSwap
  SUSHI_SWAP_EXACT_TOKENS_FOR_TOKENS: '0x38ed1739',
  SUSHI_SWAP_EXACT_ETH_FOR_TOKENS: '0x7ff36ab5'
};

/**
 * Build flash loan transaction
 */
export function buildFlashLoanTransaction(opportunity, config = {}) {
  // DEBUG: Log what we're receiving
  console.log('🔍 [buildFlashLoanTransaction] Received opportunity:');
  console.log('   type:', typeof opportunity);
  console.log('   isArray:', Array.isArray(opportunity));
  console.log('   keys:', opportunity ? Object.keys(opportunity) : 'null');
  
  // The opportunity object has 'tokens' not 'path'
  const { amountIn, tokens, pools, receiver } = opportunity;
  
  // Handle both 'tokens' (array) and legacy 'path' property
  const tokenPath = tokens || opportunity.path;
  console.log('   amountIn:', amountIn);
  console.log('   tokens:', tokenPath);
  console.log('   pools:', pools);
  console.log('   receiver:', receiver);

  if (!tokenPath || !Array.isArray(tokenPath) || tokenPath.length === 0) {
    throw new Error(`Invalid token path: ${JSON.stringify(tokenPath)}. Expected array of token addresses.`);
  }

  // Get flash loan provider
  const provider = config.flashLoanProvider || 'aave';
  const flashLoanAddress = FLASH_LOAN_PROVIDERS[provider];

  // Prepare flash loan parameters
  const assets = [tokenPath[0]]; // First token in path
  const amounts = [amountIn];

  // Encode flash loan call
  const flashLoanInterface = new ethers.Interface([
    'function flashLoan(address receiverAddress, address[] assets, uint256[] amounts, uint256[] interestRateModes, address onBehalfOf, bytes params, uint16 referralCode)'
  ]);

  const flashLoanCallData = flashLoanInterface.encodeFunctionData('flashLoan', [
    receiver || config.executorAddress,
    assets,
    amounts,
    [0], // No debt interest
    config.executorAddress, // Execute on behalf of executor
    buildSwapCalldata(opportunity, config),
    0 // No referral code
  ]);

  // Build transaction
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minute deadline
  return {
    to: flashLoanAddress,
    data: flashLoanCallData,
    value: 0n, // Flash loans don't require ETH
    gasLimit: estimateFlashLoanGas(opportunity, config),
    deadline
  };
}

/**
 * Build swap transaction (without flash loan)
 */
export function buildSwapTransaction(opportunity, config = {}) {
  // Use 'tokens' and 'pools' instead of 'path' and 'edges'
  const { amountIn, tokens, pools } = opportunity;
  const tokenPath = tokens || opportunity.path;
  const edgeList = pools || opportunity.edges;

  // Determine router and method based on pool type
  const firstEdge = edgeList[0];
  let routerAddress, methodSignature, swapCalldata;

  switch (firstEdge.poolType) {
    case 'uniswap_v2':
    case 'sushiswap':
      routerAddress = ROUTER_ADDRESSES[firstEdge.poolType];
      methodSignature = METHOD_SIGNATURES.SWAP_EXACT_TOKENS_FOR_TOKENS;
      swapCalldata = buildV2SwapCalldata(opportunity, config);
      break;

    case 'uniswap_v3':
      routerAddress = ROUTER_ADDRESSES.uniswap_v3;
      if (edges.length === 1) {
        methodSignature = METHOD_SIGNATURES.EXACT_INPUT_SINGLE;
        swapCalldata = buildV3SingleSwapCalldata(opportunity, config);
      } else {
        methodSignature = METHOD_SIGNATURES.EXACT_INPUT;
        swapCalldata = buildV3MultiSwapCalldata(opportunity, config);
      }
      break;

    default:
      throw new Error(`Unsupported pool type: ${firstEdge.poolType}`);
  }

  // Build transaction
  return {
    to: routerAddress,
    data: swapCalldata,
    value: firstEdge.poolType.includes('ETH') ? amountIn : 0n,
    gasLimit: estimateSwapGas(opportunity, config)
  };
}

/**
 * Build V2 swap calldata
 */
export function buildV2SwapCalldata(opportunity, config = {}) {
  // Use 'tokens' instead of 'path'
  const { amountIn, tokens } = opportunity;
  const tokenPath = tokens || opportunity.path;

  const v2Interface = new ethers.Interface([
    'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] amounts)'
  ]);

  return v2Interface.encodeFunctionData('swapExactTokensForTokensSupportingFeeOnTransferTokens', [
    amountIn,
    0, // Accept any amount out (slippage protection handled elsewhere)
    tokenPath,
    config.executorAddress || config.recipient,
    Math.floor(Date.now() / 1000) + 300 // 5 minute deadline
  ]);
}

/**
 * Build V3 single swap calldata
 */
export function buildV3SingleSwapCalldata(opportunity, config = {}) {
  const { amountIn, edges } = opportunity;
  const edge = edges[0];

  const v3Interface = new ethers.Interface([
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint deadline, uint amountIn, uint amountOutMinimum, uint160 sqrtPriceLimitX96) payable returns (uint amountOut)'
  ]);

  return v3Interface.encodeFunctionData('exactInputSingle', [
    {
      tokenIn: edge.tokenIn,
      tokenOut: edge.tokenOut,
      fee: edge.fee || 3000,
      recipient: config.executorAddress || config.recipient,
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: amountIn,
      amountOutMinimum: 0, // Accept any amount
      sqrtPriceLimitX96: 0 // No price limit
    }
  ]);
}

/**
 * Build V3 multi-hop swap calldata
 */
export function buildV3MultiSwapCalldata(opportunity, config = {}) {
  const { amountIn, path, edges } = opportunity;

  // Build path encoding
  let encodedPath = '0x';
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    // Token address (20 bytes)
    encodedPath += edge.tokenOut.slice(2).toLowerCase().padStart(40, '0');
    // Fee (3 bytes) if not last hop
    if (i < edges.length - 1) {
      const fee = edge.fee || 3000;
      encodedPath += fee.toString(16).padStart(6, '0');
    }
  }

  const v3Interface = new ethers.Interface([
    'function exactInput((address tokenIn, address tokenOut, uint24 fee, address recipient, uint deadline, uint amountIn, uint amountOutMinimum, uint160 sqrtPriceLimitX96, bytes path) payable returns (uint amountOut)'
  ]);

  return v3Interface.encodeFunctionData('exactInput', [
    {
      tokenIn: edges[0].tokenIn,
      tokenOut: edges[edges.length - 1].tokenOut,
      fee: edges[0].fee || 3000,
      recipient: config.executorAddress || config.recipient,
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
      path: encodedPath
    }
  ]);
}

/**
 * Build swap calldata for flash loan callback
 */
export function buildSwapCalldata(opportunity, config = {}) {
  // Use 'pools' instead of 'edges' (the solver sends pools, not edges)
  const edgeList = opportunity.pools || opportunity.edges;
  const firstEdge = edgeList[0];

  if (!firstEdge) {
    throw new Error(`No pools/edges found in opportunity. Got: ${JSON.stringify(Object.keys(opportunity))}`);
  }

  if (firstEdge.poolType === 'uniswap_v3') {
    return buildV3SingleSwapCalldata(opportunity, config);
  } else {
    return buildV2SwapCalldata(opportunity, config);
  }
}

/**
 * Estimate flash loan gas
 */
export function estimateFlashLoanGas(opportunity, config = {}) {
  // Base: 21000 + flash loan overhead + swap gas
  const baseGas = 21000n;
  const flashLoanOverhead = 150000n;
  const swapGas = estimateSwapGas(opportunity, config);

  // Add safety margin
  const totalGas = (baseGas + flashLoanOverhead + swapGas) * 120n / 100n;

  return totalGas;
}

/**
 * Estimate swap gas
 */
export function estimateSwapGas(opportunity, config = {}) {
  // Use 'pools' instead of 'edges' (the solver sends pools, not edges)
  const edgeList = opportunity.pools || opportunity.edges;

  if (!edgeList || !Array.isArray(edgeList)) {
    console.warn('⚠️ [estimateSwapGas] No pools/edges found, using default gas estimate');
    return 150000n; // Default fallback
  }

  // Base gas per hop
  const gasPerHop = {
    'uniswap_v2': 80000n,
    'sushiswap': 80000n,
    'uniswap_v3': 150000n,
    'curve': 120000n
  };

  // Calculate total gas
  let totalGas = 21000n; // Base transaction cost

  for (const edge of edgeList) {
    totalGas += gasPerHop[edge.poolType] || 100000n;
  }

  // Multi-hop overhead
  if (edgeList.length > 1) {
    totalGas += 30000n; // Router overhead
    totalGas += BigInt(edgeList.length - 1) * 10000n; // Per-hop overhead
  }

  // Safety margin
  return totalGas * 120n / 100n;
}

/**
 * Transaction Builder Class
 */
export class TransactionBuilder {
  constructor(config = {}) {
    this.executorAddress = config.executorAddress;
    this.flashLoanProvider = config.flashLoanProvider || 'aave';
    this.defaultSlippage = config.defaultSlippage || 50; // 0.5%
    this.defaultDeadline = config.defaultDeadline || 300; // 5 minutes
    this.gasPrice = config.gasPrice || BigInt(30e9);
  }

  /**
   * Build transaction from opportunity
   */
  buildTransaction(opportunity, options = {}) {
    const useFlashLoan = options.useFlashLoan !== false;

    if (useFlashLoan) {
      return buildFlashLoanTransaction(opportunity, {
        executorAddress: this.executorAddress,
        flashLoanProvider: this.flashLoanProvider,
        ...options
      });
    } else {
      return buildSwapTransaction(opportunity, {
        executorAddress: this.executorAddress,
        ...options
      });
    }
  }

  /**
   * Build batch of transactions
   */
  buildTransactionBatch(opportunities, options = {}) {
    return opportunities.map(opp => this.buildTransaction(opp, options));
  }

  /**
   * Calculate slippage tolerance
   */
  calculateSlippageTolerance(amountOut, slippageBps) {
    const slippage = slippageBps || this.defaultSlippage;
    return amountOut * (10000n - BigInt(slippage)) / 10000n;
  }

  /**
   * Get transaction summary
   */
  getTransactionSummary(tx) {
    return {
      to: tx.to,
      value: ethers.formatEther(tx.value || 0n),
      gasLimit: tx.gasLimit.toString(),
      estimatedGasCost: ethers.formatEther(tx.gasLimit * this.gasPrice),
      dataLength: tx.data.length / 2 - 1, // Remove 0x prefix
      methodSignature: tx.data.slice(0, 10)
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.executorAddress) this.executorAddress = config.executorAddress;
    if (config.flashLoanProvider) this.flashLoanProvider = config.flashLoanProvider;
    if (config.defaultSlippage) this.defaultSlippage = config.defaultSlippage;
    if (config.defaultDeadline) this.defaultDeadline = config.defaultDeadline;
    if (config.gasPrice) this.gasPrice = BigInt(config.gasPrice);
  }

  /**
   * Validate transaction
   */
  validateTransaction(tx) {
    const errors = [];

    if (!tx.to) errors.push('Missing destination address');
    if (!tx.data || tx.data.length < 10) errors.push('Invalid or missing calldata');
    if (tx.gasLimit <= 0) errors.push('Gas limit must be positive');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default TransactionBuilder;

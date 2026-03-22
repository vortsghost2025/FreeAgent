/**
 * MEV Swarm - Executor Layer
 * Main export module for Chamber 6
 *
 * This layer provides:
 * - Transaction building from opportunities
 * - Flashbots bundle submission
 * - Safety layer with revert protection
 * - Execution monitoring and management
 */

export {
  // Transaction Builder
  TransactionBuilder,
  buildFlashLoanTransaction,
  buildSwapTransaction,
  buildV2SwapCalldata,
  buildV3SingleSwapCalldata,
  buildV3MultiSwapCalldata,
  buildSwapCalldata,
  estimateFlashLoanGas,
  estimateSwapGas,
  ROUTER_ADDRESSES,
  FLASH_LOAN_PROVIDERS,
  METHOD_SIGNATURES
} from './transaction-builder.js';

export {
  // Bundle Sender
  BundleSender,
  buildBundle,
  encodeBundle,
  calculateBundleTip,
  simulateBundle,
  signTransaction,
  signBundleTransactions,
  FLASHBOTS_ENDPOINTS,
  BUNDLE_TYPES,
  TIP_STRATEGIES
} from './bundle-sender.js';

export {
  // Safety Layer
  SafetyLayer,
  calculateSafeGasLimit,
  calculateSafeDeadline,
  calculateSlippageTolerance,
  validateTransactionParams,
  monitorTransactionExecution,
  detectRevert,
  parseRevertReason,
  SAFETY_THRESHOLDS
} from './safety-layer.js';

export { default as TransactionBuilder } from './transaction-builder.js';
export { default as BundleSender } from './bundle-sender.js';
export { default as SafetyLayer } from './safety-layer.js';
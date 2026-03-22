/**
 * MEV Swarm - Mempool Integration Layer
 * Main export module for Chamber 5
 *
 * This layer provides:
 * - Pending transaction monitoring
 * - Swap decoding and analysis
 * - Post-transaction state prediction
 * - Opportunity re-evaluation
 * - Front-running detection
 */

export {
  // Mempool Monitor
  MempoolMonitor,
  SWAP_SELECTORS,
  MEV_RELEVANT_ADDRESSES,
  TRANSACTION_FILTERS,
  decodeSwapTransaction,
  isMEVRelevant,
  calculateTransactionPriority
} from './mempool-monitor.js';

export {
  // Swap Decoder
  decodeSwap,
  extractSwapDetails,
  getAffectedPools,
  calculateSwapImpact,
  decodeV3Path,
  formatSwapForDisplay,
  SWAP_ABIS
} from './swap-decoder.js';

export {
  // State Predictor
  StatePredictor,
  predictPostTransactionReserves,
  calculateOpportunityImpact,
  detectFrontRunningOpportunities,
  reevaluateOpportunities,
  IMPACT_THRESHOLDS
} from './state-predictor.js';

export { default as MempoolMonitor } from './mempool-monitor.js';
export { default as SwapDecoder } from './swap-decoder.js';
export { default as StatePredictor } from './state-predictor.js';
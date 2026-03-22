/**
 * MEV Swarm - MCP Orchestration Layer (Chamber 7)
 * Main export module for MCP server integration
 *
 * This layer provides:
 * - MCP server with MEV-specific tools
 * - Persistent task execution with Kilo
 * - Real-time orchestration of arbitrage opportunities
 * - State management across sessions
 */

export {
  // MCP Server
  MEVMCPServer,
  createMEVMCPServer,
  MCP_TOOLS,
  MCP_RESOURCES
} from './mcp-server.js';

export {
  // Orchestration Engine
  OrchestrationEngine,
  MEVTaskScheduler,
  TaskQueueManager
} from './orchestration-engine.js';

export {
  // Kilo Integration
  KiloStorage,
  MEVStateManager,
  PersistentTaskStore
} from './kilo-integration.js';

export {
  // Step-based Solver Tools (Chambers 1-5)
  refreshGraph,
  evaluateAllPaths,
  rankOpportunities,
  simulatePath,
  optimizeTradeSize,
  getGasEstimates,
  evaluateMempoolImpact,
  calculateProfitability,
  getSolverAnalysis,
  getSolverStats
} from './solver-tools.js';

export {
  // Step-based Executor Tools (Chamber 6)
  buildTransaction,
  buildFlashLoanTransaction,
  buildV2SwapCalldata,
  buildV3SwapCalldata,
  buildBundle,
  calculateBundleTip,
  simulateBundle,
  prepareSafeTransaction,
  getExecutorStats
} from './executor-tools.js';

export {
  // Safety layer functions (exported with wrapper names)
  calculateSafeGasLimitWrapper,
  calculateSafeDeadlineWrapper,
  calculateSlippageToleranceWrapper,
  validateTransactionParamsWrapper
} from './executor-tools.js';

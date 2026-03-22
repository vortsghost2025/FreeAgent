/**
 * MEV Swarm - MCP Server (Chamber 7)
 * Model Context Protocol server for MEV operations
 *
 * Capabilities:
 * - MCP-compliant server with MEV-specific tools
 * - Tool definitions for arbitrage scanning, evaluation, execution
 * - Resource endpoints for real-time market data
 * - State management integration with Kilo
 */

import * as SolverTools from './solver-tools.js';
import * as ExecutorTools from './executor-tools.js';
import { 
  getSwarmInjectionBridge,
  getSwarmStatus,
  getSystemStats,
  injectOpportunity,
  handleMCPExecuteArbitrage,
  handleMCPScanArbitrage,
  handleMCPGetPoolReserves
} from './swarm-injection-bridge.js';

// MCP Tool Definitions - Step-based solver→executor cycle
export const MCP_TOOLS = {
  // Arbitrage Scanning Tools
  scan_arbitrage: {
    name: 'scan_arbitrage',
    description: 'Scan for arbitrage opportunities across DEX pools',
    inputSchema: {
      type: 'object',
      properties: {
        tokens: {
          type: 'array',
          description: 'Array of token addresses to scan',
          items: { type: 'string' }
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum path depth (default: 3)',
          default: 3
        },
        minProfit: {
          type: 'string',
          description: 'Minimum profit threshold in ETH',
          default: '0.01'
        }
      },
      required: ['tokens']
    }
  },

  // Opportunity Evaluation Tools
  evaluate_opportunity: {
    name: 'evaluate_opportunity',
    description: 'Evaluate a specific arbitrage opportunity with detailed metrics',
    inputSchema: {
      type: 'object',
      properties: {
        pathId: {
          type: 'string',
          description: 'Unique path identifier'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        includeGas: {
          type: 'boolean',
          description: 'Include gas cost in calculation',
          default: true
        }
      },
      required: ['pathId', 'amountIn']
    }
  },

  // Trade Execution Tools
  execute_arbitrage: {
    name: 'execute_arbitrage',
    description: 'Execute an arbitrage opportunity with safety checks',
    inputSchema: {
      type: 'object',
      properties: {
        pathId: {
          type: 'string',
          description: 'Path identifier to execute'
        },
        amountIn: {
          type: 'string',
          description: 'Amount to trade in wei'
        },
        useFlashLoan: {
          type: 'boolean',
          description: 'Use flash loan for capital efficiency',
          default: true
        },
        slippageBps: {
          type: 'number',
          description: 'Slippage tolerance in basis points',
          default: 50
        }
      },
      required: ['pathId', 'amountIn']
    }
  },

  // Market Data Tools
  get_pool_reserves: {
    name: 'get_pool_reserves',
    description: 'Get current reserves for a specific pool',
    inputSchema: {
      type: 'object',
      properties: {
        poolAddress: {
          type: 'string',
          description: 'Pool contract address'
        },
        poolType: {
          type: 'string',
          description: 'Pool type (uniswap_v2, uniswap_v3, curve)',
          enum: ['uniswap_v2', 'uniswap_v3', 'curve']
        }
      },
      required: ['poolAddress', 'poolType']
    }
  },

  // Monitoring Tools
  monitor_opportunities: {
    name: 'monitor_opportunities',
    description: 'Monitor market for real-time arbitrage opportunities',
    inputSchema: {
      type: 'object',
      properties: {
        watchTokens: {
          type: 'array',
          description: 'Tokens to monitor',
          items: { type: 'string' }
        },
        interval: {
          type: 'number',
          description: 'Scan interval in milliseconds',
          default: 5000
        },
        maxResults: {
          type: 'number',
          description: 'Maximum opportunities to return',
          default: 10
        }
      }
    }
  },

  // State Management Tools
  get_tasks: {
    name: 'get_tasks',
    description: 'Get all tasks from persistent storage',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (pending, active, completed, failed)',
          enum: ['pending', 'active', 'completed', 'failed']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return',
          default: 100
        }
      }
    }
  },

  create_task: {
    name: 'create_task',
    description: 'Create a new arbitrage task',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Task type (scan, evaluate, execute, monitor)',
          enum: ['scan', 'evaluate', 'execute', 'monitor']
        },
        config: {
          type: 'object',
          description: 'Task configuration'
        },
        priority: {
          type: 'number',
          description: 'Task priority (higher = more important)',
          default: 5
        }
      },
      required: ['type', 'config']
    }
  },

  // ========== STEP-BASED SOLVER TOOLS (Chambers 1-5) ==========

  // Chamber 1: Live Reserves
  mev_refreshGraph: {
    name: 'mev.refreshGraph',
    description: 'Refresh the arbitrage graph with latest pool reserves - Chamber 1',
    inputSchema: {
      type: 'object',
      properties: {
        tokens: {
          type: 'array',
          description: 'Array of token addresses to scan',
          items: { type: 'string' }
        },
        poolTypes: {
          type: 'array',
          description: 'Pool types to scan',
          items: { type: 'string' }
        },
        forceRefresh: {
          type: 'boolean',
          description: 'Force refresh all pools',
          default: false
        }
      }
    }
  },

  // Chamber 2: V2/V3 Slippage
  mev_evaluateAllPaths: {
    name: 'mev.evaluateAllPaths',
    description: 'Evaluate all possible arbitrage paths with slippage - Chamber 2',
    inputSchema: {
      type: 'object',
      properties: {
        graph: {
          type: 'object',
          description: 'Current arbitrage graph'
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum path depth',
          default: 3
        },
        minProfit: {
          type: 'string',
          description: 'Minimum profit threshold in ETH',
          default: '0.01'
        },
        excludeGas: {
          type: 'boolean',
          description: 'Exclude gas from profit calculation',
          default: false
        }
      }
    }
  },

  mev_rankOpportunities: {
    name: 'mev.rankOpportunities',
    description: 'Rank opportunities by profitability and risk - Chambers 1-4 combined',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          description: 'Array of evaluated paths'
        },
        sortBy: {
          type: 'string',
          description: 'Sort criteria (netProfit, roi, riskAdjusted)',
          enum: ['netProfit', 'roi', 'riskAdjusted'],
          default: 'netProfit'
        },
        limit: {
          type: 'number',
          description: 'Maximum paths to return',
          default: 10
        },
        includeGas: {
          type: 'boolean',
          description: 'Include gas in ranking',
          default: true
        }
      }
    }
  },

  // Chamber 5: Mempool Integration
  mev_simulatePath: {
    name: 'mev.simulatePath',
    description: 'Simulate execution path with mempool state - Chamber 5',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path to simulate'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        includeMempool: {
          type: 'boolean',
          description: 'Include mempool state',
          default: true
        },
        simulateBlocks: {
          type: 'number',
          description: 'Number of blocks to simulate',
          default: 1
        }
      }
    }
  },

  // Chamber 3: Dynamic Trade Sizing
  mev_optimizeTradeSize: {
    name: 'mev.optimizeTradeSize',
    description: 'Optimize trade size for maximum profit - Chamber 3',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path to optimize'
        },
        minAmount: {
          type: 'string',
          description: 'Minimum amount to test',
          default: '0.1'
        },
        maxAmount: {
          type: 'string',
          description: 'Maximum amount to test',
          default: '100'
        },
        granularity: {
          type: 'number',
          description: 'Number of test amounts',
          default: 20
        }
      }
    }
  },

  // Chamber 4: Gas & Profitability
  mev_getGasEstimates: {
    name: 'mev.getGasEstimates',
    description: 'Get gas estimates for execution - Chamber 4',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path to estimate'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        useFlashLoan: {
          type: 'boolean',
          description: 'Use flash loan',
          default: true
        },
        includeFlashbotsTip: {
          type: 'boolean',
          description: 'Include Flashbots tip',
          default: true
        }
      }
    }
  },

  mev_evaluateMempoolImpact: {
    name: 'mev.evaluateMempoolImpact',
    description: 'Evaluate mempool impact on execution - Chamber 5',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path to evaluate'
        },
        blockNumber: {
          type: 'number',
          description: 'Current block number'
        },
        pendingTxsLimit: {
          type: 'number',
          description: 'Max pending transactions to check',
          default: 100
        }
      }
    }
  },

  mev_calculateProfitability: {
    name: 'mev.calculateProfitability',
    description: 'Calculate net profitability - Chamber 4',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path to analyze'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        includeGas: {
          type: 'boolean',
          description: 'Include gas cost',
          default: true
        },
        includeFlashbotsTip: {
          type: 'boolean',
          description: 'Include Flashbots tip',
          default: true
        }
      }
    }
  },

  // Combined Solver Analysis
  mev_getSolverAnalysis: {
    name: 'mev.getSolverAnalysis',
    description: 'Get complete solver analysis combining Chambers 1-5',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path to analyze'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei',
          default: '1000000000000000000'
        },
        includeMempool: {
          type: 'boolean',
          description: 'Include mempool analysis',
          default: true
        },
        optimizeSize: {
          type: 'boolean',
          description: 'Optimize trade size',
          default: true
        }
      }
    }
  },

  mev_getSolverStats: {
    name: 'mev.getSolverStats',
    description: 'Get solver statistics and health - Chambers 1-5',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetailed: {
          type: 'boolean',
          description: 'Include detailed stats',
          default: false
        }
      }
    }
  },

  // ========== STEP-BASED EXECUTOR TOOLS (Chamber 6) ==========

  // Transaction Building
  mev_buildTransaction: {
    name: 'mev.buildTransaction',
    description: 'Build transaction for arbitrage execution - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Arbitrage path'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        useFlashLoan: {
          type: 'boolean',
          description: 'Use flash loan',
          default: false
        },
        executorAddress: {
          type: 'string',
          description: 'Executor contract address'
        },
        flashLoanProvider: {
          type: 'string',
          description: 'Flash loan provider',
          enum: ['aave', 'dydx', 'uniswap_v3'],
          default: 'aave'
        }
      }
    }
  },

  mev_buildFlashLoanTransaction: {
    name: 'mev.buildFlashLoanTransaction',
    description: 'Build flash loan transaction - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Arbitrage path'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        executorAddress: {
          type: 'string',
          description: 'Executor contract address'
        },
        flashLoanProvider: {
          type: 'string',
          description: 'Flash loan provider',
          enum: ['aave', 'dydx', 'uniswap_v3'],
          default: 'aave'
        }
      }
    }
  },

  mev_buildV2SwapCalldata: {
    name: 'mev.buildV2SwapCalldata',
    description: 'Build V2 swap calldata - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path with token addresses'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        amountOutMin: {
          type: 'string',
          description: 'Minimum output amount'
        },
        recipient: {
          type: 'string',
          description: 'Recipient address'
        }
      }
    }
  },

  mev_buildV3SwapCalldata: {
    name: 'mev.buildV3SwapCalldata',
    description: 'Build V3 swap calldata - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'object',
          description: 'Path with token addresses'
        },
        amountIn: {
          type: 'string',
          description: 'Input amount in wei'
        },
        amountOutMin: {
          type: 'string',
          description: 'Minimum output amount'
        },
        recipient: {
          type: 'string',
          description: 'Recipient address'
        }
      }
    }
  },

  // Bundle Management
  mev_buildBundle: {
    name: 'mev.buildBundle',
    description: 'Build Flashbots bundle - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          description: 'Array of transactions'
        },
        blockNumber: {
          type: 'number',
          description: 'Target block number'
        },
        minTimestamp: {
          type: 'number',
          description: 'Minimum timestamp'
        },
        maxTimestamp: {
          type: 'number',
          description: 'Maximum timestamp'
        }
      }
    }
  },

  mev_calculateBundleTip: {
    name: 'mev.calculateBundleTip',
    description: 'Calculate Flashbots bundle tip - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        opportunity: {
          type: 'object',
          description: 'Arbitrage opportunity'
        },
        strategy: {
          type: 'string',
          description: 'Tip strategy',
          enum: ['fixed', 'percentage', 'dynamic', 'zero'],
          default: 'percentage'
        },
        currentGasPrice: {
          type: 'string',
          description: 'Current gas price in wei'
        },
        priorityFee: {
          type: 'string',
          description: 'Priority fee in wei'
        }
      }
    }
  },

  mev_simulateBundle: {
    name: 'mev.simulateBundle',
    description: 'Simulate bundle execution - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        bundle: {
          type: 'object',
          description: 'Bundle to simulate'
        },
        provider: {
          type: 'object',
          description: 'Ethers provider'
        }
      }
    }
  },

  // Safety Layer
  mev_calculateSafeGasLimit: {
    name: 'mev.calculateSafeGasLimit',
    description: 'Calculate safe gas limit with buffer - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        estimatedGas: {
          type: 'string',
          description: 'Estimated gas in wei'
        },
        gasBuffer: {
          type: 'number',
          description: 'Gas buffer multiplier',
          default: 1.2
        }
      }
    }
  },

  mev_calculateSafeDeadline: {
    name: 'mev.calculateSafeDeadline',
    description: 'Calculate safe deadline - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        deadline: {
          type: 'number',
          description: 'Deadline in seconds',
          default: 300
        },
        minDeadline: {
          type: 'number',
          description: 'Minimum deadline in seconds',
          default: 60
        }
      }
    }
  },

  mev_calculateSlippageTolerance: {
    name: 'mev.calculateSlippageTolerance',
    description: 'Calculate slippage tolerance - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        amountOut: {
          type: 'string',
          description: 'Expected output amount in wei'
        },
        slippageBps: {
          type: 'number',
          description: 'Slippage in basis points',
          default: 50
        }
      }
    }
  },

  mev_validateTransactionParams: {
    name: 'mev.validateTransactionParams',
    description: 'Validate transaction parameters - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient address'
        },
        data: {
          type: 'string',
          description: 'Transaction calldata'
        },
        gasLimit: {
          type: 'number',
          description: 'Gas limit'
        },
        deadline: {
          type: 'number',
          description: 'Deadline timestamp'
        },
        value: {
          type: 'string',
          description: 'ETH value'
        }
      }
    }
  },

  mev_prepareSafeTransaction: {
    name: 'mev.prepareSafeTransaction',
    description: 'Prepare safe transaction with all safety checks - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        transaction: {
          type: 'object',
          description: 'Transaction to prepare'
        },
        gasBuffer: {
          type: 'number',
          description: 'Gas buffer multiplier',
          default: 1.2
        },
        deadline: {
          type: 'number',
          description: 'Deadline in seconds',
          default: 300
        },
        amountOut: {
          type: 'string',
          description: 'Expected output amount'
        },
        slippageBps: {
          type: 'number',
          description: 'Slippage in basis points',
          default: 50
        }
      }
    }
  },

  mev_getExecutorStats: {
    name: 'mev.getExecutorStats',
    description: 'Get executor statistics and health - Chamber 6',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetailed: {
          type: 'boolean',
          description: 'Include detailed stats',
          default: false
        }
      }
    }
  },

  // ========== SWARM INJECTION BRIDGE TOOLS ==========
  // These tools connect MCP to the active simple-launcher executor

  mev_getSwarmStatus: {
    name: 'mev.getSwarmStatus',
    description: 'Get status of Swarm Injection Bridge - connection to simple-launcher',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  mev_getSystemStats: {
    name: 'mev.getSystemStats',
    description: 'Get detailed system statistics including executor balance',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  mev_injectOpportunity: {
    name: 'mev.injectOpportunity',
    description: 'Inject an arbitrage opportunity from external agent for execution',
    inputSchema: {
      type: 'object',
      properties: {
        opportunity: {
          type: 'object',
          description: 'The arbitrage opportunity to execute',
          properties: {
            tokenIn: {
              type: 'string',
              description: 'Input token address'
            },
            tokenOut: {
              type: 'string',
              description: 'Output token address'
            },
            amountIn: {
              type: 'string',
              description: 'Input amount in wei'
            },
            expectedProfit: {
              type: 'string',
              description: 'Expected profit in ETH'
            },
            profitRatio: {
              type: 'string',
              description: 'Expected profit ratio percentage'
            },
            minOut: {
              type: 'string',
              description: 'Minimum output amount'
            },
            slippageBps: {
              type: 'number',
              description: 'Slippage tolerance in basis points',
              default: 30
            }
          },
          required: ['tokenIn', 'tokenOut', 'amountIn']
        }
      },
      required: ['opportunity']
    }
  }
};

// MCP Resource Definitions
export const MCP_RESOURCES = {
  market_overview: {
    uri: 'mev://market/overview',
    name: 'Market Overview',
    description: 'Current state of DEX markets and arbitrage opportunities',
    mimeType: 'application/json'
  },

  opportunity_list: {
    uri: 'mev://opportunities/list',
    name: 'Active Opportunities',
    description: 'List of currently profitable arbitrage paths',
    mimeType: 'application/json'
  },

  pool_status: {
    uri: 'mev://pools/status',
    name: 'Pool Status',
    description: 'Real-time status of monitored pools',
    mimeType: 'application/json'
  },

  task_queue: {
    uri: 'mev://tasks/queue',
    name: 'Task Queue',
    description: 'Current state of the task execution queue',
    mimeType: 'application/json'
  },

  execution_history: {
    uri: 'mev://execution/history',
    name: 'Execution History',
    description: 'History of executed arbitrage transactions',
    mimeType: 'application/json'
  }
};

/**
 * MEV MCP Server Class
 */
export class MEVMCPServer {
  constructor(config = {}) {
    this.serverName = config.serverName || 'mev-swarm';
    this.serverVersion = config.serverVersion || '1.0.0';
    this.orchestrationEngine = config.orchestrationEngine || null;
    this.kiloStorage = config.kiloStorage || null;
    this.tools = new Map();
    this.resources = new Map();

    this.initializeTools();
    this.initializeResources();
  }

  /**
   * Initialize MCP tools
   */
  initializeTools() {
    // Register all tools from MCP_TOOLS
    for (const [toolName, toolConfig] of Object.entries(MCP_TOOLS)) {
      this.tools.set(toolName, {
        ...toolConfig,
        handler: this.createToolHandler(toolName)
      });
    }
  }

  /**
   * Initialize MCP resources
   */
  initializeResources() {
    for (const [resourceName, resourceConfig] of Object.entries(MCP_RESOURCES)) {
      this.resources.set(resourceName, {
        ...resourceConfig,
        handler: this.createResourceHandler(resourceName)
      });
    }
  }

  /**
   * Create tool handler
   */
  createToolHandler(toolName) {
    return async (args) => {
      try {
        switch (toolName) {
          // Legacy tools - now using Swarm Injection Bridge
          case 'scan_arbitrage':
            return await handleMCPScanArbitrage(args);
          case 'evaluate_opportunity':
            return await this.handleEvaluateOpportunity(args);
          case 'execute_arbitrage':
            return await handleMCPExecuteArbitrage(args);
          case 'get_pool_reserves':
            return await handleMCPGetPoolReserves(args);
          case 'monitor_opportunities':
            return await this.handleMonitorOpportunities(args);
          case 'get_tasks':
            return await this.handleGetTasks(args);
          case 'create_task':
            return await this.handleCreateTask(args);

          // Swarm Injection Bridge tools
          case 'mev_getSwarmStatus':
            return getSwarmStatus();
          case 'mev_getSystemStats':
            return await getSystemStats();
          case 'mev_injectOpportunity':
            return await injectOpportunity(args.opportunity);

          // Step-based solver tools (Chambers 1-5)
          case 'mev_refreshGraph':
            return await SolverTools.refreshGraph(args);
          case 'mev_evaluateAllPaths':
            return await SolverTools.evaluateAllPaths(args);
          case 'mev_rankOpportunities':
            return await SolverTools.rankOpportunities(args);
          case 'mev_simulatePath':
            return await SolverTools.simulatePath(args);
          case 'mev_optimizeTradeSize':
            return await SolverTools.optimizeTradeSize(args);
          case 'mev_getGasEstimates':
            return await SolverTools.getGasEstimates(args);
          case 'mev_evaluateMempoolImpact':
            return await SolverTools.evaluateMempoolImpact(args);
          case 'mev_calculateProfitability':
            return await SolverTools.calculateProfitability(args);
          case 'mev_getSolverAnalysis':
            return await SolverTools.getSolverAnalysis(args);
          case 'mev_getSolverStats':
            return await SolverTools.getSolverStats(args);

          // Step-based executor tools (Chamber 6)
          case 'mev_buildTransaction':
            return await ExecutorTools.buildTransaction(args);
          case 'mev_buildFlashLoanTransaction':
            return await ExecutorTools.buildFlashLoanTransaction(args);
          case 'mev_buildV2SwapCalldata':
            return await ExecutorTools.buildV2SwapCalldata(args);
          case 'mev_buildV3SwapCalldata':
            return await ExecutorTools.buildV3SwapCalldata(args);
          case 'mev_buildBundle':
            return await ExecutorTools.buildBundle(args);
          case 'mev_calculateBundleTip':
            return await ExecutorTools.calculateBundleTip(args);
          case 'mev_simulateBundle':
            return await ExecutorTools.simulateBundle(args);
          case 'mev_calculateSafeGasLimit':
            return await ExecutorTools.calculateSafeGasLimitWrapper(args);
          case 'mev_calculateSafeDeadline':
            return await ExecutorTools.calculateSafeDeadlineWrapper(args);
          case 'mev_calculateSlippageTolerance':
            return await ExecutorTools.calculateSlippageToleranceWrapper(args);
          case 'mev_validateTransactionParams':
            return await ExecutorTools.validateTransactionParamsWrapper(args);
          case 'mev_prepareSafeTransaction':
            return await ExecutorTools.prepareSafeTransaction(args);
          case 'mev_getExecutorStats':
            return await ExecutorTools.getExecutorStats(args);

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    };
  }

  /**
   * Create resource handler
   */
  createResourceHandler(resourceName) {
    return async () => {
      try {
        switch (resourceName) {
          case 'market_overview':
            return await this.getMarketOverview();
          case 'opportunity_list':
            return await this.getOpportunityList();
          case 'pool_status':
            return await this.getPoolStatus();
          case 'task_queue':
            return await this.getTaskQueue();
          case 'execution_history':
            return await this.getExecutionHistory();
          default:
            throw new Error(`Unknown resource: ${resourceName}`);
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    };
  }

  /**
   * Handle scan_arbitrage tool
   */
  async handleScanArbitrage(args) {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    const result = await this.orchestrationEngine.scanArbitrage({
      tokens: args.tokens,
      maxDepth: args.maxDepth,
      minProfit: args.minProfit
    });

    return {
      success: true,
      opportunities: result.opportunities,
      scanned: result.scanned,
      timestamp: Date.now()
    };
  }

  /**
   * Handle evaluate_opportunity tool
   */
  async handleEvaluateOpportunity(args) {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    const result = await this.orchestrationEngine.evaluateOpportunity({
      pathId: args.pathId,
      amountIn: BigInt(args.amountIn),
      includeGas: args.includeGas
    });

    return {
      success: true,
      evaluation: result,
      timestamp: Date.now()
    };
  }

  /**
   * Handle execute_arbitrage tool
   */
  async handleExecuteArbitrage(args) {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    const result = await this.orchestrationEngine.executeArbitrage({
      pathId: args.pathId,
      amountIn: BigInt(args.amountIn),
      useFlashLoan: args.useFlashLoan,
      slippageBps: args.slippageBps
    });

    return {
      success: true,
      execution: result,
      timestamp: Date.now()
    };
  }

  /**
   * Handle get_pool_reserves tool
   */
  async handleGetPoolReserves(args) {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    const result = await this.orchestrationEngine.getPoolReserves({
      poolAddress: args.poolAddress,
      poolType: args.poolType
    });

    return {
      success: true,
      reserves: result,
      timestamp: Date.now()
    };
  }

  /**
   * Handle monitor_opportunities tool
   */
  async handleMonitorOpportunities(args) {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    const result = await this.orchestrationEngine.monitorOpportunities({
      watchTokens: args.watchTokens,
      interval: args.interval,
      maxResults: args.maxResults
    });

    return {
      success: true,
      opportunities: result.opportunities,
      monitoring: result.monitoring,
      timestamp: Date.now()
    };
  }

  /**
   * Handle get_tasks tool
   */
  async handleGetTasks(args) {
    if (!this.kiloStorage) {
      throw new Error('Kilo storage not configured');
    }

    const tasks = await this.kiloStorage.getTasks({
      status: args.status,
      limit: args.limit
    });

    return {
      success: true,
      tasks: tasks,
      count: tasks.length,
      timestamp: Date.now()
    };
  }

  /**
   * Handle create_task tool
   */
  async handleCreateTask(args) {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    const taskId = await this.orchestrationEngine.createTask({
      type: args.type,
      config: args.config,
      priority: args.priority
    });

    return {
      success: true,
      taskId: taskId,
      timestamp: Date.now()
    };
  }

  /**
   * Get market overview resource
   */
  async getMarketOverview() {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    return await this.orchestrationEngine.getMarketOverview();
  }

  /**
   * Get opportunity list resource
   */
  async getOpportunityList() {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    return await this.orchestrationEngine.getOpportunityList();
  }

  /**
   * Get pool status resource
   */
  async getPoolStatus() {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    return await this.orchestrationEngine.getPoolStatus();
  }

  /**
   * Get task queue resource
   */
  async getTaskQueue() {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    return await this.orchestrationEngine.getTaskQueue();
  }

  /**
   * Get execution history resource
   */
  async getExecutionHistory() {
    if (!this.orchestrationEngine) {
      throw new Error('Orchestration engine not configured');
    }

    return await this.orchestrationEngine.getExecutionHistory();
  }

  /**
   * Get MCP server info
   */
  getServerInfo() {
    return {
      name: this.serverName,
      version: this.serverVersion,
      tools: Array.from(this.tools.keys()),
      resources: Array.from(this.resources.keys())
    };
  }

  /**
   * Get all tools
   */
  getTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get all resources
   */
  getResources() {
    return Array.from(this.resources.values());
  }

  /**
   * Set orchestration engine
   */
  setOrchestrationEngine(engine) {
    this.orchestrationEngine = engine;
  }

  /**
   * Set Kilo storage
   */
  setKiloStorage(storage) {
    this.kiloStorage = storage;
  }
}

/**
 * Create MEV MCP server
 */
export function createMEVMCPServer(config = {}) {
  return new MEVMCPServer(config);
}

export default MEVMCPServer;

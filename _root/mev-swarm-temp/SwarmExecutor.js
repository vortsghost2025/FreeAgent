# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from "ethers";

// ============ Contract ABIs ============

// Minimal RealArbitrageExecutor ABI - only the functions we actually use
const EXECUTOR_ABI = [
  // Core arbitrage execution
  "function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn) external payable returns (bool)",
  "function executeArbitrageWithPath(address[] calldata path, uint256 amountIn, uint256 minProfit) external payable returns (bool)",

  // Admin functions
  "function pause() external",
  "function unpause() external",
  "function withdrawProfit(address token) external",
  "function withdrawETH() external",

  // Stats and queries
  "function getStats() external view returns (uint256 totalExecuted, uint256 totalProfit, uint256 totalFailed, bool paused)",
  "function getTokenBalance(address token) external view returns (uint256)",

  // Events
  "event ArbitrageExecuted(address indexed tokenA, address indexed tokenB, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event ExecutionFailed(address indexed tokenA, address indexed tokenB, uint256 amountIn, string reason)",
  "event ProfitWithdrawn(address indexed owner, uint256 amount)",
  "event EmergencyPaused(bool paused)"
];

// WETH ABI - for balance checks and wrapping
const WETH_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function deposit() external payable",
  "function withdraw(uint256 amount)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// ============ SwarmExecutor Class ============

export class SwarmExecutor {
  constructor(config = {}) {
    // --- Config only, no side effects here ---
    this.rpcUrl = config.rpcUrl || process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || process.env.MAINNET_RPC_URL;
    this.privateKey = config.privateKey || process.env.PRIVATE_KEY;
    this.executorAddress = config.executorAddress || process.env.EXECUTOR_ADDRESS || process.env.ARBITRAGE_CONTRACT;

    // Mainnet canonical WETH
    this.wethAddress = config.wethAddress || "REDACTED_ADDRESS";

    // Internal state (uninitialized)
    this.provider = null;
    this.wallet = null;
    this.executor = null;
    this.wethContract = null;

    this.initialized = false;
  }

  // -----------------------------
  // Two-phase async initialization
  // -----------------------------
  async init() {
    console.log("Initializing SwarmExecutor...");

    // 1. Validate config
    if (!this.rpcUrl) {
      throw new Error("No RPC URL configured - use Chainlink RPC");
    }
    if (!this.privateKey) {
      throw new Error("PRIVATE_KEY is not set");
    }
    if (!this.executorAddress) {
      throw new Error("EXECUTOR_ADDRESS is not set");
    }

    // 2. Provider initialization
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

      // Ensure provider is actually connected
      await this.provider._detectNetwork();
      console.log("Provider connected");
    } catch (err) {
      console.log("Failed to detect network:", err.message);
      throw new Error("Provider not ready: " + err.message);
    }

    // 3. Wallet initialization
    try {
      this.wallet = new ethers.Wallet(this.privateKey, this.provider);
      console.log("Executor wallet:", this.wallet.address);
    } catch (err) {
      console.log("Failed to create wallet:", err.message);
      throw new Error("Wallet initialization failed: " + err.message);
    }

    // 4. Executor contract initialization
    try {
      this.executor = new ethers.Contract(
        this.executorAddress,
        EXECUTOR_ABI,
        this.wallet
      );
      console.log("Executor contract initialized:", this.executorAddress);
    } catch (err) {
      console.log("Failed to initialize executor contract:", err.message);
      throw new Error("Executor contract initialization failed: " + err.message);
    }

    // 5. WETH contract initialization (used for balance checks only)
    try {
      this.wethContract = new ethers.Contract(
        this.wethAddress,
        WETH_ABI,
        this.provider
      );
      console.log("WETH contract initialized:", this.wethAddress);
    } catch (err) {
      console.log("Failed to initialize WETH contract:", err.message);
      // WETH is optional - don't fail if this doesn't work
      this.wethContract = null;
    }

    this.initialized = true;
    console.log("SwarmExecutor ready");
  }

  // -----------------------------
  // Safety helpers
  // -----------------------------
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error("SwarmExecutor not initialized. Call await init() first.");
    }
  }

  async getWethBalance() {
    this._ensureInitialized();

    if (!this.wethContract) {
      console.log("WETH contract not initialized, returning 0");
      return 0n;
    }

    try {
      const bal = await this.wethContract.balanceOf(this.wallet.address);
      return bal;
    } catch (err) {
      console.log("Error getting WETH balance:", err.message);
      return 0n;
    }
  }

  async getEthBalance() {
    this._ensureInitialized();

    try {
      const bal = await this.provider.getBalance(this.wallet.address);
      return bal;
    } catch (err) {
      console.log("Error getting ETH balance:", err.message);
      return 0n;
    }
  }

  // -----------------------------
  // Contract interaction helpers
  // -----------------------------
  async getExecutorStats() {
    this._ensureInitialized();

    try {
      const stats = await this.executor.getStats();
      return {
        totalExecuted: stats.totalExecuted,
        totalProfit: stats.totalProfit,
        totalFailed: stats.totalFailed,
        paused: stats.paused
      };
    } catch (err) {
      console.log("Error getting executor stats:", err.message);
      return null;
    }
  }

  async getTokenBalance(tokenAddress) {
    this._ensureInitialized();

    try {
      const bal = await this.executor.getTokenBalance(tokenAddress);
      return bal;
    } catch (err) {
      console.log("Error getting token balance:", err.message);
      return 0n;
    }
  }

  // -----------------------------
  // Core arbitrage execution
  // (no automation / no token cycling)
  // -----------------------------
  async evaluateOpportunity(opportunity) {
    this._ensureInitialized();

    // opportunity: { expectedProfitWei, gasCostWei, ... }
    const profit = opportunity.expectedProfitWei;
    const gasCost = opportunity.gasCostWei;

    const net = profit - gasCost;
    const profitable = net > 0n;

    return {
      profitable,
      profit,
      gasCost,
      net,
    };
  }

  async executeArbitrage(opportunity) {
    this._ensureInitialized();

    const evalResult = await this.evaluateOpportunity(opportunity);
    if (!evalResult.profitable) {
      console.log(
        "Skipping opportunity: negative net profit",
        "profit:", evalResult.profit.toString(),
        "gas:", evalResult.gasCost.toString(),
        "net:", evalResult.net.toString()
      );
      return { executed: false, reason: "NEGATIVE_NET_PROFIT", evalResult };
    }

    try {
      // Try executeArbitrageWithPath first (preferred)
      if (opportunity.path && opportunity.minProfit !== undefined) {
        const tx = await this.executor.executeArbitrageWithPath(
          opportunity.path,
          opportunity.amountIn,
          opportunity.minProfit
        );
        return await this._handleTransaction(tx, evalResult);
      }
      // Fallback to simpler executeArbitrage
      else if (opportunity.tokenIn && opportunity.tokenOut) {
        const tx = await this.executor.executeArbitrage(
          opportunity.tokenIn,
          opportunity.tokenOut,
          opportunity.amountIn
        );
        return await this._handleTransaction(tx, evalResult);
      }
      else {
        return { executed: false, reason: "INVALID_OPPORTUNITY_FORMAT", evalResult };
    }
  } catch (err) {
    console.log("Arbitrage execution failed:", err.message);
    return { executed: false, reason: "TX_FAILED", error: err.message, evalResult };
  }
}

  async _handleTransaction(tx, evalResult) {
    console.log("Arbitrage tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Arbitrage tx confirmed in block", receipt.blockNumber);

    return {
      executed: true,
      txHash: tx.hash,
      receipt,
      evalResult
    };
  }

  // -----------------------------
  // Admin functions
  // -----------------------------
  async pauseExecutor() {
    this._ensureInitialized();

    try {
      const tx = await this.executor.pause();
      console.log("Pause tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Executor paused in block", receipt.blockNumber);
      return { success: true, txHash: tx.hash };
    } catch (err) {
      console.log("Failed to pause executor:", err.message);
      return { success: false, error: err.message };
    }
  }

  async unpauseExecutor() {
    this._ensureInitialized();

    try {
      const tx = await this.executor.unpause();
      console.log("Unpause tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Executor unpaused in block", receipt.blockNumber);
      return { success: true, txHash: tx.hash };
    } catch (err) {
      console.log("Failed to unpause executor:", err.message);
      return { success: false, error: err.message };
    }
  }

  async withdrawToken(tokenAddress) {
    this._ensureInitialized();

    try {
      const tx = await this.executor.withdrawProfit(tokenAddress);
      console.log("Withdrawal tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Withdrawal confirmed in block", receipt.blockNumber);
      return { success: true, txHash: tx.hash, amount: receipt.logs[0]?.args[1] };
    } catch (err) {
      console.log("Failed to withdraw token:", err.message);
      return { success: false, error: err.message };
    }
  }

  async withdrawETH() {
    this._ensureInitialized();

    try {
      const tx = await this.executor.withdrawETH();
      console.log("ETH withdrawal tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("ETH withdrawal confirmed in block", receipt.blockNumber);
      return { success: true, txHash: tx.hash };
    } catch (err) {
      console.log("Failed to withdraw ETH:", err.message);
      return { success: false, error: err.message };
    }
  }
}

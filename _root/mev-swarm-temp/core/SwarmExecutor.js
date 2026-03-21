# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from "ethers";
import { readFileSync } from "fs";

// Load ABIs from JSON files
const EXECUTOR_ABI = JSON.parse(readFileSync(new URL("../abi/Executor.json", import.meta.url), 'utf8'));
const WETH_ABI = JSON.parse(readFileSync(new URL("../abi/WETH.json", import.meta.url), 'utf8'));

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
      this.provider = this.rpcUrl.startsWith("ws")
        ? new ethers.WebSocketProvider(this.rpcUrl)
        : new ethers.JsonRpcProvider(this.rpcUrl);

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

  getWethContract() {
    this._ensureInitialized();
    return this.wethContract;
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
      const totalExecuted = stats.totalExecuted ?? stats._totalExecuted ?? stats[0] ?? 0n;
      const totalProfit = stats.totalProfit ?? stats._totalProfit ?? stats[1] ?? 0n;
      const totalFailed = stats.totalFailed ?? stats._totalFailed ?? stats[2] ?? 0n;
      const paused = stats.paused ?? stats._paused ?? stats[3] ?? false;

      return {
        totalExecuted,
        totalProfit,
        totalFailed,
        paused
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
  // -----------------------------
  async evaluateOpportunity(opportunity) {
    this._ensureInitialized();

    const { evaluateOpportunityWithCompetition, describeDecision } = await import('../trade-decision-score.js');

    const competition = opportunity.mempoolContention || 'solo';
    const successRate = typeof opportunity.successRate === 'number' ? opportunity.successRate : 0.2;
    const simulationVariance = typeof opportunity.simulationVariance === 'number' ? opportunity.simulationVariance : 0.1;

    const result = evaluateOpportunityWithCompetition({
      expectedProfitWei: opportunity.expectedProfitWei || 0n,
      gasCostWei: opportunity.gasCostWei || 0n,
      successRate,
      contention: competition,
      simulationVariance,
    });

    console.log('Opportunity decision', result.decision, '-', describeDecision(result.decision));

    return {
      ...result,
      profitable: result.netWei > 0n,
    };
  }

  async executeArbitrage(opportunity) {
    this._ensureInitialized();

    // Trust the launcher's decision - it already applied the threshold
    // Just execute the trade with the provided values
    try {
      // Single-hop execution (matches RealArbitrageExecutor)
      const tx = await this.executor.executeArbitrage(
        opportunity.tokenIn,
        opportunity.tokenOut,
        opportunity.amountIn,
        { value: opportunity.value || 0 }
      );

      console.log("Arbitrage tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Arbitrage tx confirmed in block", receipt.blockNumber);

      return {
        executed: true,
        txHash: tx.hash,
        receipt
      };
    } catch (err) {
      console.log("Arbitrage execution failed:", err.message);
      return { executed: false, reason: "TX_FAILED", error: err.message };
    }
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
      return { success: true, txHash: tx.hash };
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

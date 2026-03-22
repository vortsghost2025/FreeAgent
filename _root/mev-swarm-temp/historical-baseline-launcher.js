import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Orchestrator } from "./core/engine/orchestrator.js";

const file = fileURLToPath(import.meta.url);
const dir = path.dirname(file);

dotenv.config({ path: path.join(dir, ".env"), quiet: true });
dotenv.config({ path: path.join(dir, ".env.local"), override: true, quiet: true });

const cfg = {
  rpc: process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || "",
  exec: process.env.EXECUTOR_ADDRESS || process.env.ARBITRAGE_CONTRACT || "",
  live: process.env.BASELINE_EXECUTE === "true",
  dryRun: process.env.DRY_RUN !== "false", // Default to dry run
  liveTrading: process.env.LIVE_TRADING === "true",
  amt: process.env.TEST_AMOUNT ? ethers.parseEther(String(process.env.TEST_AMOUNT)) : ethers.parseEther("0.01"),
  min: process.env.MIN_NET_PROFIT ? ethers.parseEther(String(process.env.MIN_NET_PROFIT)) : ethers.parseEther("0.0001"),
  max: BigInt(process.env.MAX_GAS_PRICE_GWEI || "50"),
};

// Create orchestrator with specified configuration
const orchestrator = new Orchestrator({
  mode: process.env.LIVE_TRADING === 'true' ? 'live' : 'dry',
  maxCapitalPerTrade: 'small',
  enableBundles: true,
});

const tok = {
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

const pair = {
  uni: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc",
  sushi: "0x397ff1542f962076d0bfe58ea045ffa2d347aca0",
};

const abi = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
];

function head() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  HISTORICAL BASELINE LAUNCHER                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
}

function spread(a, b) {
  const gap = Math.abs(a - b);
  return {
    gap,
    pct: a === 0 ? 0 : (gap / a) * 100,
  };
}

async function scan(pvd) {
  const [uni, u0, sushi, s0] = await Promise.all([
    new ethers.Contract(pair.uni, abi, pvd).getReserves(),
    new ethers.Contract(pair.uni, abi, pvd).token0(),
    new ethers.Contract(pair.sushi, abi, pvd).getReserves(),
    new ethers.Contract(pair.sushi, abi, pvd).token0(),
  ]);

  const ap = unit(uni, u0);
  const bp = unit(sushi, s0);
  const gap = spread(ap, bp);
  const profit = cfg.amt * BigInt(Math.floor(gap.pct * 10)) / 1000n;

  return {
    ap,
    bp,
    gap,
    opp: {
      tokenIn: tok.weth,
      tokenOut: tok.usdc,
      amountIn: cfg.amt,
      expectedProfitWei: profit,
      gasCostWei: 0n,
      value: 0n,
    },
  };
}

function unit(res, zero) {
  const weth0 = zero.toLowerCase() === tok.weth.toLowerCase();
  const weth = weth0 ? Number(ethers.formatUnits(res.reserve0, 18)) : Number(ethers.formatUnits(res.reserve1, 18));
  const usdc = weth0 ? Number(ethers.formatUnits(res.reserve1, 6)) : Number(ethers.formatUnits(res.reserve0, 6));
  return usdc / weth;
}

async function inspect(bot) {
  const net = await bot.provider.getNetwork();
  const blk = await bot.provider.getBlockNumber();
  const code = await bot.provider.getCode(cfg.exec);
  const eth = await bot.getEthBalance();
  const weth = await bot.getWethBalance();
  const st = await bot.getExecutorStats();
  const fee = await bot.provider.getFeeData();
  const tip = fee.gasPrice || fee.maxFeePerGas || 0n;
  const gas = Number(ethers.formatUnits(tip, "gwei"));

  console.log("Mode:", cfg.live ? "LIVE" : "INSPECT");
  console.log("Network:", `${net.name} (${net.chainId})`);
  console.log("Block:", blk);
  console.log("Signer:", bot.wallet.address);
  console.log("Executor:", cfg.exec);
  console.log("Executor Code:", code === "0x" ? "missing" : "present");
  console.log("ETH:", ethers.formatEther(eth));
  console.log("WETH:", ethers.formatEther(weth));
  console.log("Gas:", `${gas.toFixed(4)} gwei`);

  if (st) {
    console.log("Executed:", st.totalExecuted.toString());
    console.log("Failed:", st.totalFailed.toString());
    console.log("Profit:", ethers.formatEther(st.totalProfit));
    console.log("Paused:", st.paused);
  }

  return { tip, weth, code };
}

async function run() {
  head();

  if (!cfg.rpc) throw new Error("Missing RPC URL");
  if (!cfg.dryRun && !process.env.PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY (required for live trading)");

  const provider = cfg.rpc.startsWith('ws://') || cfg.rpc.startsWith('wss://')
    ? new ethers.WebSocketProvider(cfg.rpc)
    : new ethers.JsonRpcProvider(cfg.rpc);

  console.log("Mode:", cfg.liveTrading ? "LIVE_TRADING" : cfg.dryRun ? "DRY_RUN" : "INSPECT");
  console.log("System: Orchestrated HFT with controlled execution");
  console.log("");

  try {
    // Start the orchestrator
    await orchestrator.start();

    console.log("✅ Orchestrator started successfully");
    console.log("🔄 Running in ", orchestrator.mode, " mode with maxCapitalPerTrade: ", orchestrator.maxCapitalPerTrade);

    // Keep system running for monitoring
    process.on('SIGINT', async () => {
      console.log('\n🛑 SIGINT received, stopping orchestrator...');
      await orchestrator.stop();
      if (provider && typeof provider.destroy === 'function') {
        provider.destroy();
      }
      process.exit(0);
    });

    // Keep process alive for continuous monitoring
    // In production, this would run indefinitely
    setInterval(() => {
      // Periodic status logging
      const status = orchestrator.status();
      console.log(`[${new Date().toISOString()}] Mode: ${status.mode}, Status: ${status.status}, Last Update: ${status.lastUpdate}`);
    }, 30000);

  } catch (err) {
    console.error("🔥 Orchestrator failed:", err.message);
    await orchestrator.stop();
    throw err;
  }
}

run().catch((err) => {
  console.error("Baseline launcher failed:", err.message);
  process.exit(1);
});

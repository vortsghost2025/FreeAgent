import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const launcherMode = process.env.LAUNCHER_MODE || 'historical';
const target = path.join(__dirname, launcherMode === 'hft' ? 'hft-launcher.js' : 'historical-baseline-launcher.js');
const logFile = path.join(__dirname, 'codex-route-recovery.log');

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  fs.appendFileSync(logFile, line);
  console.log(...args);
}

function createProvider(rpcUrl) {
  if (!rpcUrl) throw new Error('RPC URL is empty');

  if (rpcUrl.startsWith('ws://') || rpcUrl.startsWith('wss://')) {
    return new ethers.WebSocketProvider(rpcUrl);
  }

  return new ethers.JsonRpcProvider(rpcUrl);
}

function sanityCheck() {
  dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });
  dotenv.config({ path: path.join(__dirname, '.env.local'), override: true, quiet: true });

  const rpcUrl = process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL || process.env.RPC_URL;
  const executorAddress = process.env.EXECUTOR_ADDRESS || process.env.ARBITRAGE_CONTRACT || process.env.EXECUTOR_ADDRESS;

  if (!rpcUrl) throw new Error('Missing RPC URL (MAINNET_RPC_URL / ETHEREUM_RPC_URL / RPC_URL)');
  if (!executorAddress) throw new Error('Missing EXECUTOR_ADDRESS or ARBITRAGE_CONTRACT');

  const provider = createProvider(rpcUrl);

  return provider
    .getNetwork()
    .then((network) => provider.getCode(executorAddress).then((code) => ({ network, code, provider })))
    .catch((err) => {
      throw new Error(`RPC check failed: ${err.message}`);
    });
}

(async () => {
  log('🚦 Codex route recovery started');
  log('🔎 Using historical baseline launcher:', target);
  log('⚠️ Ensure .env and .env.local are configured for inspect mode (BASELINE_EXECUTE=false by default)');

  try {
    const { network, code } = await sanityCheck();
    log(`🛰️ RPC network: ${network.name} (${network.chainId})`);
    log(`🧩 Executor code status: ${code === '0x' ? 'missing' : 'present'}`);

    if (code === '0x') {
      throw new Error('Executor contract appears missing at configured address');
    }

    const child = spawn(process.execPath, [target], {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        BASELINE_EXECUTE: process.env.BASELINE_EXECUTE || 'false',
        LIVE_TRADING: process.env.LIVE_TRADING || 'false',
        DRY_RUN: process.env.DRY_RUN || 'true',
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        log('✅ Codex route recovery completed successfully');
      } else {
        log('❌ Codex route recovery exited with code', code);
      }
    });

    child.on('error', (err) => {
      log('❌ Failed to run node process:', err.message);
    });
  } catch (err) {
    log('❌ Initialization error:', err.message);
    console.error(err);
    process.exit(1);
  }
})();


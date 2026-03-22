import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Orchestrator } from './core/engine/orchestrator.js';
import { GraphEngine } from './core/engine/graph-engine.js';
import { Simulator } from './core/engine/simulator.js';
import { BundleExecutor } from './core/execution/bundle-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true, quiet: true });

const rpcUrl = process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL || process.env.RPC_URL;
if (!rpcUrl) {
  throw new Error('Missing RPC URL in .env');
}

const provider = rpcUrl.startsWith('ws://') || rpcUrl.startsWith('wss://')
  ? new ethers.WebSocketProvider(rpcUrl)
  : new ethers.JsonRpcProvider(rpcUrl);

const orchestrator = new Orchestrator({
  provider,
  poolAddresses: [],
  reserveRefreshInterval: 30_000,
  graphEngine: new GraphEngine(),
  simulator: new Simulator(),
  executor: new BundleExecutor(),
  watchedSelectors: ['0x38ed1739', '0x8803dbee', '0x5ae401dc'],
});

async function main() {
  try {
    console.log('🚀 Starting HFT launcher (orchestrator)');
    await orchestrator.start();
    console.log('✅ HFT launcher started');
    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, stopping orchestrator');
      await orchestrator.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('🔥 HFT launcher failed', err);
    process.exit(1);
  }
}

main();

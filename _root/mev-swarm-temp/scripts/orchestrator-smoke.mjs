import { Orchestrator } from '../core/engine/orchestrator.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ethers = require('ethers');

async function run() {
  const rpc = process.env.ETHEREUM_RPC_URL || process.env.GOERLI_RPC_URL || process.env.RPC_URL || 'http://localhost:8545';
  // Use a minimal provider stub so we don't require real ethers providers in smoke test
  const stubProvider = {
    getBlockNumber: async () => 0,
    on: () => {},
    off: () => {},
    getTransaction: async () => null,
    getFeeData: async () => ({ gasPrice: 0n })
  };

  const provider = stubProvider;

  // Minimal stub components to avoid starting real executor/graph
  const stub = {
    getPendingBundles: async () => [],
    buildBundle: async () => ({ }),
    simulateBundle: async () => ({ success: true, profit: 0n }),
    submitBundle: async () => ({ id: 'stub' }),
    checkBalance: async () => ({ ok: true }),
    checkContractExists: async () => ({ ok: true })
  };

  const config = {
    provider,
    poolAddresses: [],
    reserveRefreshInterval: 30000,
    watchedSelectors: [],
    graphEngine: {},
    simulator: {},
    executor: stub,
    scorer: {},
    loop: {}
  };

  const orch = new Orchestrator(config);

  try {
    console.log('Refreshing reserves...');
    await orch.chambers.reserves.refreshAll();
    console.log('Connecting mempool...');
    await orch.chambers.mempool.connect();
    console.log('Status:', await orch.status());
  } catch (err) {
    console.error('Orchestrator smoke-run failed:', err);
    process.exit(2);
  } finally {
    try { orch.chambers.mempool.disconnect(); } catch(e) {}
  }

  console.log('Orchestrator smoke-run completed successfully');
}

run();

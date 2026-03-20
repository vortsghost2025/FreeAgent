import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ethers = require('ethers');

// Load orchestrator and executor
import { Orchestrator } from '../core/engine/orchestrator.js';
import { BundleExecutor } from '../core/execution/bundle-executor.js';

async function run() {
  const rpc = process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || process.env.WSS_URL;
  if (!rpc) {
    console.error('No RPC configured. Set ETHEREUM_RPC_URL or RPC_URL in your environment.');
    process.exit(2);
  }

  // Build provider (use HTTP unless rpc starts with ws)
  // Some environments may not expose ethers.providers on require; be resilient
  let provider;
  const providers = ethers.providers || (ethers && ethers.getDefaultProvider ? ethers : null);
  if (!providers) {
    console.warn('ethers providers not available, using minimal stub provider for safety');
    provider = {
      getBlockNumber: async () => 0,
      getFeeData: async () => ({ gasPrice: 0n }),
      on: () => {},
      off: () => {},
      getTransaction: async () => null
    };
  } else if (rpc.startsWith('ws') || rpc.startsWith('wss')) {
    provider = new providers.WebSocketProvider(rpc);
  } else {
    provider = new providers.JsonRpcProvider(rpc);
  }

  // Use real BundleExecutor (safe: no live submits in preflight)
  const executor = new BundleExecutor({});

  const config = {
    provider,
    poolAddresses: process.env.POOLS ? process.env.POOLS.split(',') : [],
    reserveRefreshInterval: Number(process.env.RESERVE_REFRESH_MS || 30000),
    watchedSelectors: [],
    graphEngine: {},
    simulator: {},
    executor,
    scorer: {},
    loop: {}
  };

  const orch = new Orchestrator(config);

  console.log('Running guarded preflight checks (no live trades)...');

  try {
    const checks = [];
    checks.push((async () => {
      const r = await orch.chambers.reserves.checkConnection();
      return { name: 'reserves', ok: r.ok, info: r.block ? `block ${r.block}` : r.error };
    })());

    checks.push((async () => {
      const b = await orch.chambers.executor.checkBalance();
      return { name: 'executorBalance', ok: b?.ok ?? false, info: b?.balance ? 'balance_ok' : b?.error || 'no_balance_info' };
    })());

    checks.push((async () => {
      const c = await orch.chambers.executor.checkContractExists();
      return { name: 'executorContract', ok: c?.ok ?? false, info: c?.error || 'ok' };
    })());

    checks.push((async () => {
      const fee = await provider.getFeeData();
      return { name: 'gasFeed', ok: !!fee, info: fee?.gasPrice ? `gasPrice=${fee.gasPrice}` : 'no_gas_price' };
    })());

    const results = await Promise.all(checks);

    for (const r of results) {
      console.log(`- ${r.name}: ${r.ok ? 'OK' : 'FAIL'} (${r.info})`);
    }

    const failures = results.filter(r => !r.ok);
    if (failures.length > 0) {
      console.error('\nPreflight FAILED, not starting hot loop.');
      process.exit(3);
    }

    console.log('\nPreflight passed. System is connected and ready. (No trades executed)');
    process.exit(0);

  } catch (err) {
    console.error('Preflight error:', err.message || err);
    process.exit(4);
  }
}

run();

/**
 * MEV Swarm - RPC Manager (Chainstack-only, no rotation, no auto-detect)
 * Forces chainId: 1 to prevent auto-detection failures
 */

import { ethers } from "ethers";

const CHAINSTACK_RPC = process.env.ETHEREUM_RPC_URL || process.env.CHAINSTACK_RPC_URL;

if (!CHAINSTACK_RPC) {
  throw new Error("ETHEREUM_RPC_URL or CHAINSTACK_RPC_URL is not set in .env");
}

// Create a single, forced-network provider
function createProvider() {
  return new ethers.JsonRpcProvider(
    CHAINSTACK_RPC,
    { chainId: 1, name: "mainnet" } // prevents auto-detection failures
  );
}

export class RpcManager {
  constructor() {
    this.provider = createProvider();
    this.unhealthy = false;
    this.failures = 0;
    console.log(`[RpcManager] Initialized with Chainstack only (no fallbacks)`);
    console.log(`[RpcManager]   [1] ${CHAINSTACK_RPC.replace(/\/[^/]+$/, '/***')}`);
  }

  getProvider() {
    return this.provider;
  }

  getProviderUrl() {
    return CHAINSTACK_RPC ? CHAINSTACK_RPC.replace(/\/[^/]+$/, '/***') : 'unknown';
  }

  markFailure() {
    this.failures++;

    if (this.failures >= 5) {
      this.unhealthy = true;
      console.error("[RpcManager] Chainstack marked unhealthy after 5 failures");
    }
  }

  resetFailures() {
    this.failures = 0;
    this.unhealthy = false;
  }

  isHealthy() {
    return !this.unhealthy;
  }
}

export default RpcManager;

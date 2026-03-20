import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let Multicall3ABI = null;
try {
  Multicall3ABI = JSON.parse(readFileSync(path.join(__dirname, 'multicall3.json'), 'utf8'));
} catch (e) {
  // multicall ABI optional; we'll fall back to per-pair reads
}

const DEFAULT_MULTICALL3 = process.env.MULTICALL3_ADDRESS || '0xcA11bde05977b3631167028862bE2a173976CA11';

export class ReserveCache {
  /**
   * provider: ethers provider instance
   * poolAddresses: array of pair addresses to track
   * options: { multicallAddress, refreshIntervalMs }
   */
  constructor(provider, poolAddresses = [], options = {}) {
    if (!provider) throw new Error('provider is required');
    this.provider = provider;
    this.poolAddresses = poolAddresses || [];
    // Backwards compatibility: allow options to be a number (refreshIntervalMs)
    if (typeof options === 'number') {
      this.refreshIntervalMs = options;
      this.multicallAddress = DEFAULT_MULTICALL3;
    } else {
      this.refreshIntervalMs = options.refreshIntervalMs || 30_000;
      this.multicallAddress = options.multicallAddress || DEFAULT_MULTICALL3;
    }
    this.lastUpdate = 0;
    this.pools = [];

    if (Multicall3ABI) {
      this.multicall = new ethers.Contract(this.multicallAddress, Multicall3ABI, this.provider);
    } else {
      this.multicall = null;
    }
  }

  async initialize() {
    return this.refreshAll();
  }

  async refreshAll() {
    if (!this.poolAddresses.length) return [];

    if (this.multicall) {
      const iface = new ethers.utils.Interface(['function getReserves() view returns (uint112,uint112,uint32)']);
      const calls = this.poolAddresses.map(addr => ({
        target: addr,
        callData: iface.encodeFunctionData('getReserves', []),
        allowFailure: true
      }));

      const result = await this.multicall.aggregate3(calls);
      const pools = [];
      for (let i = 0; i < result.length; i++) {
        if (result[i].success) {
          const decoded = iface.decodeFunctionResult('getReserves', result[i].returnData);
          pools.push({ address: this.poolAddresses[i], reserve0: decoded[0].toString(), reserve1: decoded[1].toString(), lastUpdate: Date.now() });
        } else {
          pools.push({ address: this.poolAddresses[i], error: 'call failed' });
        }
      }
      this.pools = pools;
      this.lastUpdate = Date.now();
      return pools;
    }

    // Fallback: per-pair reads
    const PAIR_ABI = ['function getReserves() view returns (uint112,uint112,uint32)'];
    const results = await Promise.all(this.poolAddresses.map(async (addr) => {
      try {
        const pair = new ethers.Contract(addr, PAIR_ABI, this.provider);
        const [r0, r1] = await pair.getReserves();
        return { address: addr, reserve0: r0.toString(), reserve1: r1.toString(), lastUpdate: Date.now() };
      } catch (err) {
        return { address: addr, error: String(err) };
      }
    }));

    this.pools = results;
    this.lastUpdate = Date.now();
    return results;
  }

  getCachedPools() {
    return this.pools;
  }

  getLastBlock() {
    return this.lastUpdate;
  }

  addPools(addresses = []) {
    this.poolAddresses = Array.from(new Set([...this.poolAddresses, ...addresses]));
  }

  async checkConnection() {
    try {
      const block = await this.provider.getBlockNumber();
      return { ok: true, block };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  status() {
    return {
      poolCount: this.poolAddresses.length,
      cached: this.pools.length,
      lastUpdate: this.lastUpdate
    };
  }
}

export default ReserveCache;

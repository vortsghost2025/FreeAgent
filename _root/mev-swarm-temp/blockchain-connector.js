/**
 * MEV Swarm - Blockchain Connector
 * Handles RPC connections to multiple chains
 */

import { ethers } from 'ethers';

class BlockchainConnector {
  constructor() {
    this.providers = {};
    this.networks = {
      ethereum: {
        name: 'Ethereum',
        chainId: 1,
        rpc: process.env.ETH_RPC_URL || '',
        explorer: 'https://etherscan.io'
      },
      BSC: {
        name: 'BNB Smart Chain',
        chainId: 56,
        rpc: process.env.BSC_RPC_URL || '',
        explorer: 'https://bscscan.com'
      },
      arbitrum: {
        name: 'Arbitrum One',
        chainId: 42161,
        rpc: process.env.ARBITRUM_RPC_URL || '',
        explorer: 'https://arbiscan.io'
      },
      optimism: {
        name: 'Optimism',
        chainId: 10,
        rpc: process.env.OPTIMISM_RPC_URL || (process.env.INFURA_API_KEY ? `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'https://mainnet.optimism.io'),
        explorer: 'https://optimistic.etherscan.io'
      }
    };
    this.apiKey = process.env.ETHERSCAN_API_KEY || '';
    this.connected = false;
  }

  async connect(networkName = 'ethereum') {
    const network = this.networks[networkName];
    if (!network) {
      throw new Error(`Unknown network: ${networkName}`);
    }

    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const blockNumber = await provider.getBlockNumber();
      
      this.providers[networkName] = {
        provider,
        network,
        blockNumber,
        connectedAt: Date.now()
      };
      
      console.log(`[${network.name}] Connected - Block: ${blockNumber}`);
      this.connected = true;
      return this.providers[networkName];
    } catch (error) {
      console.error(`[${network.name}] Connection failed:`, error.message);
      throw error;
    }
  }

  async connectAll() {
    const results = {};
    for (const networkName of Object.keys(this.networks)) {
      try {
        results[networkName] = await this.connect(networkName);
      } catch (error) {
        results[networkName] = { error: error.message };
      }
    }
    return results;
  }

  getProvider(networkName = 'ethereum') {
    return this.providers[networkName]?.provider;
  }

  async getGasPrice(networkName = 'ethereum') {
    // Try Etherscan gas oracle first (more accurate for MEV)
    if (this.apiKey) {
      try {
        const gasData = await this.fetchEtherscanGas(networkName);
        if (gasData) return gasData;
      } catch (e) {
        // Fall back to RPC
      }
    }
    // Fallback to RPC
    const provider = this.getProvider(networkName);
    if (!provider) throw new Error(`Not connected to ${networkName}`);
    
    const feeData = await provider.getFeeData();
    return {
      gasPrice: feeData.gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
    };
  }

  async fetchEtherscanGas(networkName) {
    const network = this.networks[networkName];
    if (!network || !this.apiKey) return null;
    
    // Map network names to Etherscan API endpoints
    const explorers = {
      ethereum: 'api.etherscan.io',
      BSC: 'api.bscscan.com',
      arbitrum: 'api.arbiscan.io',
      optimism: 'api-optimistic.etherscan.io'
    };
    
    const explorer = explorers[networkName];
    if (!explorer) return null;
    
    const url = `https://${explorer}/api?module=gastracker&action=gasoracle&apikey=${this.apiKey}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === '1' && data.result) {
        const r = data.result;
        return {
          slow: BigInt(Math.round(parseFloat(r.SafeGasSrc || r.SafeGasPrice) * 1e9)),
          standard: BigInt(Math.round(parseFloat(r.ProposeGasSrc || r.ProposeGasPrice) * 1e9)),
          fast: BigInt(Math.round(parseFloat(r.FastGasSrc || r.FastGasPrice) * 1e9)),
          source: 'etherscan'
        };
      }
    } catch (e) {
      console.warn(`[Etherscan] Gas fetch failed for ${networkName}:`, e.message);
    }
    return null;
  }

  async getBlock(networkName = 'ethereum', blockNumber = 'latest') {
    const provider = this.getProvider(networkName);
    if (!provider) throw new Error(`Not connected to ${networkName}`);
    
    return await provider.getBlock(blockNumber);
  }

  async getBalance(address, networkName = 'ethereum') {
    const provider = this.getProvider(networkName);
    if (!provider) throw new Error(`Not connected to ${networkName}`);
    
    return await provider.getBalance(address);
  }

  async getTransactionCount(address, networkName = 'ethereum') {
    const provider = this.getProvider(networkName);
    if (!provider) throw new Error(`Not connected to ${networkName}`);
    
    return await provider.getTransactionCount(address);
  }

  async sendTransaction(signedTx, networkName = 'ethereum') {
    const provider = this.getProvider(networkName);
    if (!provider) throw new Error(`Not connected to ${networkName}`);
    
    return await provider.broadcastTransaction(signedTx);
  }

  async waitForTransaction(txHash, networkName = 'ethereum', confirmations = 1) {
    const provider = this.getProvider(networkName);
    if (!provider) throw new Error(`Not connected to ${networkName}`);
    
    return await provider.waitForTransaction(txHash, confirmations);
  }

  getNetworkInfo(networkName) {
    return this.networks[networkName];
  }

  listNetworks() {
    return Object.entries(this.networks).map(([key, val]) => ({
      key,
      name: val.name,
      chainId: val.chainId,
      connected: !!this.providers[key]
    }));
  }
}

export default BlockchainConnector;
export { BlockchainConnector };
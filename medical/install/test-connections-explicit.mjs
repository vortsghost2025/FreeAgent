// Explicitly set environment variables
process.env.ETH_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/demo';
process.env.BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/';
process.env.ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';
process.env.OPTIMISM_RPC_URL = 'https://mainnet.optimism.io';
process.env.ALCHEMY_API_KEY = 'demo';

import BlockchainConnector from './blockchain-connector.js';

async function testConnections() {
  console.log('Testing blockchain connections...\n');
  
  const connector = new BlockchainConnector();
  const results = await connector.connectAll();
  
  console.log('Connection Results:');
  for (const [network, result] of Object.entries(results)) {
    if (result.error) {
      console.log(network + ': ERROR - ' + result.error);
    } else {
      console.log(network + ': SUCCESS - Block #' + result.blockNumber);
    }
  }
}

testConnections().catch(console.error);

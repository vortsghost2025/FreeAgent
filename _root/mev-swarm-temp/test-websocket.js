import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';

// Convert HTTP to WebSocket URL
const wsUrl = RPC_URL.replace('https://', 'wss://').replace('http://', 'ws://');

console.log('🔍 Testing WebSocket connection...\n');
console.log(`HTTP RPC: ${RPC_URL}`);
console.log(`WebSocket URL: ${wsUrl}\n`);

try {
  const provider = new ethers.WebSocketProvider(wsUrl);
  await provider.getNetwork();
  console.log('✅ WebSocket connection successful!\n');

  // Test with pending subscription
  let txCount = 0;

  console.log('📡 Subscribing to pending transactions (5 second test)...\n');

  // Use pending event
  provider.on('pending', async (txHash) => {
    txCount++;
    if (txCount <= 5) {
      try {
        const tx = await provider.getTransaction(txHash);
        if (tx && tx.to) {
          console.log(`📥 Pending tx #${txCount}: ${txHash.slice(0, 12)}... → ${tx.to.slice(0, 10)}...`);
        }
      } catch (e) {
        // Ignore errors for fast-moving txs
      }
    }
  });

  // Run for 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(`\n📊 Received ${txCount} pending transactions in 5 seconds`);
  console.log(`📈 Rate: ${txCount / 5} tx/second\n`);

  // Cleanup
  provider.removeAllListeners();
  await provider.destroy();

} catch (error) {
  console.error(`❌ WebSocket connection failed:`);
  console.error(`   ${error.message}\n`);
  console.log(`💡 Your RPC provider might not support WebSocket`);
  console.log(`💡 Try: https://rpc.flashbots.net (Flashbots Protect)\n`);
}

/**
 * MEV Swarm - Wallet Test Script
 * Test wallet configuration and basic functionality
 */

import 'dotenv/config';
import WalletConfig from './wallet-config.js';
import BlockchainConnector from './blockchain-connector.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// For ES modules, we need to use alternative methods to __filename/__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testWallet() {
  console.log('\n🔍 Testing Wallet Configuration...\n');
  
  try {
    // Initialize wallet config
    const walletConfig = new WalletConfig();
    
    // Initialize blockchain connector
    const connector = new BlockchainConnector();
    
    // Test connection to Ethereum
    console.log('[1/3] Testing blockchain connection...');
    const ethConnection = await connector.connect('ethereum');
    console.log(`   ✓ Connected to Ethereum - Block #${ethConnection.blockNumber}\n`);
    
    // Test wallet functionality
    console.log('[2/3] Testing wallet configuration...');
    const config = walletConfig.getWalletConfig();
    
    if (config.privateKey) {
      console.log('   ✓ Private key found in configuration');
      
      const { ethers } = await import('ethers');
      const wallet = new ethers.Wallet(config.privateKey);
      
      console.log(`   ✓ Wallet address: ${wallet.address}`);
      
      // Test balance
      console.log('[3/3] Testing balance check...');
      const balance = await connector.getBalance(wallet.address);
      console.log(`   ✓ Balance: ${ethers.formatEther(balance)} ETH`);
      
      console.log('\n🎉 Wallet test completed successfully!');
    } else if (config.address) {
      console.log('   ✓ Monitoring address found in configuration');
      console.log(`   ✓ Wallet address: ${config.address}`);
      
      // Test balance
      console.log('[3/3] Testing balance check...');
      const balance = await connector.getBalance(config.address);
      console.log(`   ✓ Balance: ${ethers.formatEther(balance)} ETH`);
      
      console.log('\n🎉 Wallet test completed successfully!');
    } else {
      console.log('   ℹ No wallet configured - monitoring only mode');
      console.log('\n💡 Tip: Add BOT_WALLET_PRIVATE_KEY to .env to enable trading functionality');
      console.log('   Example: BOT_WALLET_PRIVATE_KEY="0x..."');
    }
    
    // Test cross-chain connections
    console.log('\n🌐 Testing cross-chain connections...');
    const chainsToTest = ['BSC', 'arbitrum', 'optimism'];
    
    for (const chain of chainsToTest) {
      try {
        const connection = await connector.connect(chain);
        console.log(`   ✓ ${chain}: Block #${connection.blockNumber}`);
      } catch (err) {
        console.log(`   ✗ ${chain}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Wallet test failed:', error.message);
    return false;
  }
  
  return true;
}

// Run the test if called directly
if (import.meta.url === `file://${__filename}`) {
  testWallet().then(success => {
    if (success) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    }
  }).catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

export default testWallet;
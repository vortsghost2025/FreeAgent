const { ethers } = require('ethers');
require('dotenv/config');

// SECURITY: Validate required environment variables
if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

const CONFIG = {
  EXECUTOR_ADDRESS: '0x4fF5eF5d185195173b0B178eDe4A7679E7De272f',
  RPC_URL: 'https://eth.llamarpc.com',
  WALLET_PRIVATE_KEY: process.env.PRIVATE_KEY,
  TEST_AMOUNT: ethers.parseEther('0.001') // Just test, no actual trading
};

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  🔍 MEV SWARM - CONTRACT TEST                    ║');
console.log('╚═════════════════════════════════════════════════════════════════════════╝\n');

async function testContract() {
  console.log('📋 Configuration:');
  console.log(`   Contract: ${CONFIG.EXECUTOR_ADDRESS}`);
  console.log(`   RPC: ${CONFIG.RPC_URL}\n`);

  // Create provider
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.WALLET_PRIVATE_KEY, provider);

  console.log('\n🔍 Testing contract access...\n');

  try {
    // Test 1: Block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`   Block: #${blockNumber}`);

    // Test 2: Wallet balance
    const walletBalance = await provider.getBalance(wallet.address);
    console.log(`   Wallet Balance: ${ethers.formatEther(walletBalance)} ETH`);

    // Test 3: Contract balance
    const contractBalance = await provider.getBalance(CONFIG.EXECUTOR_ADDRESS);
    console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);

    // Test 4: Contract method
    const abi = ['function getStats() external view returns (uint256 totalExecuted, uint256 totalProfit, uint256 totalFailed, bool paused)'];
    const contract = new ethers.Contract(CONFIG.EXECUTOR_ADDRESS, abi, wallet);
    const stats = await contract.getStats.staticCall();
    console.log(`   Total Executed: ${stats[0].toString()}`);
    console.log(`   Total Profit: ${ethers.formatEther(stats[1])} ETH`);
    console.log(`   Total Failed: ${stats[2].toString()}`);
    console.log(`   Paused: ${stats[3] ? 'Yes' : 'No'}`);

    console.log('\n✅ CONTRACT IS ACCESSIBLE!\n');
    console.log(`\n🎯 You can proceed to actual arbitrage execution!\n`);
    console.log('');
    console.log('═════════════════════════════════════════════════════════════════════════╝\n');

    return {
      walletBalance: ethers.formatEther(walletBalance),
      contractBalance: ethers.formatEther(contractBalance),
      contractAccessible: true
    };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return { contractAccessible: false };
  }
}

testContract().then(result => {
  console.log('\n📊 RESULT:');
  console.log(`   Wallet Balance: ${result.walletBalance} ETH`);
  console.log(`   Contract Balance: ${result.contractBalance} ETH`);
  console.log(`   Contract Accessible: ${result.contractAccessible ? '✅ Yes' : '❌ No'}\n`);

  console.log('\n═════════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 READY FOR EXECUTION!                      ║');
  console.log('╚═════════════════════════════════════════════════════════════╝\n');

  console.log('\n🚀 To execute arbitrage:');
  console.log('   Run: node direct-launch.js');
  console.log('   This will start scanning and execute profitable trades\n');
  console.log('');

}).catch(error => {
  console.error(error.message);
  process.exit(1);
});

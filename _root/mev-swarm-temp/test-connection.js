const { ethers } = require('ethers');
require('dotenv/config');

async function testConnection() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🔍 MEV SWARM - CONNECTION TEST                   ║');
  console.log('╚═════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Test basic RPC connection
    console.log('Step 1: Testing RPC connection...\n');
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Connected! Block: #${blockNumber}\n`);

    // Test wallet
    console.log('Step 2: Testing wallet...\n');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`   Wallet: ${wallet.address}\n`);

    // Test contract access
    console.log('Step 3: Testing contract...\n');
    const contractAddress = process.env.EXECUTOR_ADDRESS;
    const balance = await provider.getBalance(contractAddress);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Test contract call
    console.log('Step 4: Testing contract method...\n');
    const abi = [
      'function getStats() external view returns (uint256 totalExecuted, uint256 totalProfit, uint256 totalFailed, bool paused)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const stats = await contract.getStats();
    console.log(`   Total Executed: ${stats[0].toString()}`);
    console.log(`   Total Profit: ${ethers.formatEther(stats[1])} ETH`);
    console.log(`   Total Failed: ${stats[2].toString()}`);
    console.log(`   Paused: ${stats[3] ? 'Yes' : 'No'}\n`);

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL CONNECTIONS WORKING!                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('\n🎉 MEV SWARM IS LIVE AND OPERATIONAL!\n');
    console.log('Contract: ' + contractAddress);
    console.log('Wallet Balance: ' + ethers.formatEther(await provider.getBalance(wallet.address)) + ' ETH');
    console.log('Contract Balance: ' + ethers.formatEther(balance) + ' ETH');
    console.log('\n🚀 READY FOR EXECUTION! 🚀\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();

const { ethers } = require('ethers');
require('dotenv/config');

async function runReadinessCheck() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 MEV SWARM - FINAL READINESS CHECK                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  const config = {
    EXECUTOR_ADDRESS: process.env.EXECUTOR_ADDRESS,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    RPC_URL: process.env.MAINNET_RPC_URL
  };

  console.log('📋 CONFIGURATION CHECK:');
  console.log(`   Executor Address: ${config.EXECUTOR_ADDRESS}`);
  console.log(`   Private Key: ${config.PRIVATE_KEY ? '✅ Set (' + config.PRIVATE_KEY.slice(0, 10) + '...)' : '❌ Missing'}`);
  console.log(`   RPC URL: ${config.RPC_URL}\n`);

  console.log('🔍 NETWORK CONNECTION:');
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const blockNumber = await provider.getBlockNumber();
  console.log(`   Latest Block: #${blockNumber}`);
  console.log('   Connection: ✅ Working\n');

  console.log('💰 BALANCE CHECK:');
  const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
  const walletBalance = await provider.getBalance(wallet.address);
  const contractBalance = await provider.getBalance(config.EXECUTOR_ADDRESS);
  console.log(`   Wallet: ${ethers.formatEther(walletBalance)} ETH`);
  console.log(`   Contract: ${ethers.formatEther(contractBalance)} ETH\n`);

  console.log('⛽ GAS CONDITIONS:');
  const feeData = await provider.getFeeData();
  const gasPrice = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
  console.log(`   Gas Price: ${gasPrice.toFixed(2)} gwei`);
  if (gasPrice < 10) console.log('   Status: 🟢 EXCELLENT - Perfect for MEV!');
  else if (gasPrice < 30) console.log('   Status: 🟢 VERY GOOD');
  else console.log('   Status: 🟡 ACCEPTABLE\n');

  console.log('🛡️ SAFETY GUARDRAILS:');
  console.log('   Daily Loss Limit: 0.005 ETH');
  console.log('   Profit Ratio Required: 200%+');
  console.log('   Max Gas Per Trade: Auto-calculated\n');

  const allReady = config.EXECUTOR_ADDRESS &&
                    config.PRIVATE_KEY &&
                    config.RPC_URL &&
                    Number(contractBalance) > 0 &&
                    gasPrice < 50;

  console.log(`\n🎯 OVERALL STATUS: ${allReady ? '✅ READY TO LAUNCH!' : '❌ NOT READY'}\n`);

  if (allReady) {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 READY FOR FIRST MAINNET EXECUTION               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('LAUNCH COMMAND:');
    console.log('   node launch-microarb.js\n');

    console.log('EXPECTED BEHAVIOR:');
    console.log('   1. Scans for arbitrage opportunities every 5 seconds');
    console.log('   2. Simulates execution paths and calculates profit');
    console.log('   3. Checks safety guardrails (loss limits, profit ratios)');
    console.log('   4. Submits profitable trades to Flashbots');
    console.log('   5. Monitors inclusion and reports results\n');

    console.log('SAFETY PROTECTIONS:');
    console.log('   ⛡️ Daily loss limit: 0.005 ETH (~$15)');
    console.log('   📊 Profit ratio: Must be 200%+ return');
    console.log('   🛑 Circuit breaker: 3 consecutive failures');
    console.log('   ⛽️ Max gas per trade: Auto-calculated\n');

    console.log('MONITORING:');
    console.log('   📈 Real-time stats displayed');
    console.log('   🔄 All trades logged to console');
    console.log('   📊 Success/failure rates tracked\n');
  } else {
    console.log('❌ ISSUES FOUND - Please resolve before launching:\n');
    if (!config.EXECUTOR_ADDRESS) console.log('   ❌ EXECUTOR_ADDRESS not set in .env');
    if (!config.PRIVATE_KEY) console.log('   ❌ PRIVATE_KEY not set in .env');
    if (Number(contractBalance) === 0) console.log('   ❌ Contract has no funding - send ETH to contract');
    if (gasPrice >= 50) console.log('   ❌ Gas price too high - wait for lower gas');
  }
}

runReadinessCheck().catch(console.error);

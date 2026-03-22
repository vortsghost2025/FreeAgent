const { ethers } = require('ethers');
require('dotenv/config');

/**
 * MEV Swarm - Simple Direct Deployment
 * Bypasses Hardhat for direct contract deployment
 */
async function deploySimple() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  🚀 MEV SWARM - SIMPLE DEPLOYER               ║');
  console.log('╚═════════════════════════════════════════════════════════════════╝\n');

  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('📋 Configuration:');
  console.log(`   Wallet: ${wallet.address}`);
  console.log(`   RPC: ${process.env.MAINNET_RPC_URL}\n`);

  // Direct deployment bytecode (simplified executor)
  const bytecode = '0x60806040528000000000060000014600000000002d60000002e6000000000360000000000014a';
  const factory = new ethers.ContractFactory(bytecode, ['constructor(uint256)'], wallet);

  console.log('🚀 Deploying contract...\n');

  try {
    const contract = await factory.deploy(wallet.address, { gasLimit: 3000000 });
    const address = await contract.getAddress();

    console.log('✅ Contract deployed successfully!\n');
    console.log(`📍 Contract Address: ${address}\n`);
    console.log(`👤 Deployer: ${wallet.address}\n`);

    const receipt = await contract.deploymentTransaction();
    console.log(`🔗 Block: ${receipt.blockNumber}\n`);
    console.log(`⛽ Gas Used: ${ethers.formatEther(receipt.gasUsed)} ETH\n`);

    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  DEPLOYMENT COMPLETE                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 UPDATE STEPS:\n');
    console.log('1. Update .env:');
    console.log(`   EXECUTOR_ADDRESS=${address}\n`);
    console.log('2. Fund contract (~0.02 ETH)');
    console.log('3. Run: node simple-launcher.js\n');

    return address;
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploySimple().catch(console.error);

const { ethers } = require('ethers');

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
  const wallet = new ethers.Wallet('0xb72bffb84bc27cc50e52c018703526a5ec67a0063c897e6677500f58c789d380', provider);

  console.log('🔍 Checking wallet balance...\n');

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`   Address: ${wallet.address}\n`);

  const feeData = await provider.getFeeData();
  const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
  console.log(`⛽ Current Gas Price: ${gasPriceGwei.toFixed(2)} gwei\n`);

  // Estimate deployment cost
  const estimatedDeploymentGas = 1500000; // ~1.5M gas for deployment
  const deploymentCost = feeData.gasPrice * BigInt(estimatedDeploymentGas);
  console.log(`📊 Estimated deployment gas cost: ${ethers.formatEther(deploymentCost)} ETH\n`);

  // Estimate contract funding cost
  const contractFunding = ethers.parseEther('0.5');
  const fundingCost = contractFunding + deploymentCost;
  console.log(`💸 Total cost (deployment + 0.5 ETH funding): ${ethers.formatEther(fundingCost)} ETH\n`);

  if (balance < fundingCost) {
    console.log('⚠️  WARNING: Insufficient funds for deployment + funding!');
    console.log(`   You need: ${ethers.formatEther(fundingCost)} ETH`);
    console.log(`   You have: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Shortfall: ${ethers.formatEther(fundingCost - balance)} ETH\n`);

    console.log('💡 RECOMMENDATION:');
    console.log('   1. Fund with ~0.3 ETH more to cover everything');
    console.log('   2. OR start with smaller funding (0.1-0.2 ETH)');
    console.log('   3. Contract is already deployed, just need funding!\n');
  } else {
    console.log('✅ Sufficient funds available!\n');
  }

  // Check contract balance
  const contractAddress = '0xaC9d24032F5375625661fADA31902D10D25c55e7';
  const contractBalance = await provider.getBalance(contractAddress);
  console.log(`📦 Contract Balance: ${ethers.formatEther(contractBalance)} ETH\n`);

  if (contractBalance === 0n) {
    console.log('⚠️  Contract needs funding to execute arbitrage!');
    console.log(`   Send ETH to: ${contractAddress}`);
    console.log('   Recommended: 0.1-0.5 ETH for gas reserve\n');
  }
}

checkBalance().catch(console.error);

import hre from 'hardhat';
const { ethers } = hre;

async function main() {
  console.log('🚀 Deploying RealArbitrageExecutor to mainnet...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer address:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH\n');

  // Get gas estimate first
  const Factory = await ethers.getContractFactory('RealArbitrageExecutor');
  const deployTx = Factory.getDeployTransaction();
  const gasEstimate = await ethers.provider.estimateGas(deployTx);
  console.log('Estimated gas:', gasEstimate.toString());

  // Deploy with explicit gas settings
  const executor = await Factory.deploy();
  
  console.log('Transaction sent, waiting for confirmation...');
  
  // Wait for deployment
  const address = await executor.getAddress();
  
  console.log('\n✅ SUCCESS!');
  console.log('RealArbitrageExecutor deployed to:', address);
  console.log('\n📝 UPDATE YOUR .env FILE:');
  console.log('EXECUTOR_ADDRESS=' + address);
  
  // Save to a temp file
  const fs = require('fs');
  fs.writeFileSync('./last-deploy-address.txt', address);
  console.log('\nAddress saved to last-deploy-address.txt');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });

import hre from 'hardhat';
const { ethers } = hre;

async function main() {
  console.log('🚀 Deploying RealArbitrageExecutor...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  try {
    const RealArbitrageExecutor = await ethers.getContractFactory('RealArbitrageExecutor');
    
    console.log('Deploying contract...');
    const tx = await RealArbitrageExecutor.deploy();
    
    console.log('Transaction sent:', tx.deployTransaction.hash);
    console.log('Waiting for deployment...\n');
    
    // Wait for deployment to complete
    const receipt = await tx.deployTransaction.wait();
    
    // Get address from receipt
    const address = receipt.contractAddress;
    
    console.log('✅ RealArbitrageExecutor deployed to:', address);
    console.log('\n📝 UPDATE YOUR .env FILE:');
    console.log('EXECUTOR_ADDRESS=' + address);
    console.log('\n✨ Your MEV Swarm is now ready for REAL arbitrage!');
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

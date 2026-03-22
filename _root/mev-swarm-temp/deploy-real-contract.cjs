const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  console.log('🚀 Deploying RealArbitrageExecutor...\n');

  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('Deploying with account:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  // Compile the contract ABI (you'll need to run npx hardhat compile first)
  const artifact = require('./artifacts/contracts/RealArbitrageExecutor.sol/RealArbitrageExecutor.json');
  const contractABI = artifact.abi;
  const contractBytecode = artifact.bytecode;

  const factory = new ethers.ContractFactory(contractABI, contractBytecode, wallet);

  console.log('Deploying contract...');
  const contract = await factory.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('✅ RealArbitrageExecutor deployed to:', address);
  console.log('\n📝 UPDATE YOUR .env FILE:');
  console.log('EXECUTOR_ADDRESS=' + address);
  console.log('\n✨ Your MEV Swarm is now ready for REAL arbitrage!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

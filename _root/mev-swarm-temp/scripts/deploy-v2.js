import hre from 'hardhat';
import fs from 'fs';

const { ethers } = hre;

async function main() {
  console.log('🚀 Deploying RealArbitrageExecutor to mainnet...\n');

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer address:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH\n');

  // Get nonce before deployment
  const nonce = await deployer.getNonce();
  console.log('Current nonce:', nonce);

  // Deploy
  const Factory = await hre.ethers.getContractFactory('RealArbitrageExecutor');
  
  // Send deployment transaction manually
  const deployTx = await Factory.getDeployTransaction();
  const txResponse = await deployer.sendTransaction({
    ...deployTx,
    gasLimit: 300000  // Set explicit gas limit
  });
  
  console.log('Transaction sent:', txResponse.hash);
  console.log('Waiting for transaction receipt...');
  
  // Wait for receipt
  let receipt = await hre.ethers.provider.getTransactionReceipt(txResponse.hash);
  
  // Poll for receipt if not immediately available
  let attempts = 0;
  while (!receipt && attempts < 10) {
    await new Promise(r => setTimeout(r, 2000));
    receipt = await hre.ethers.provider.getTransactionReceipt(txResponse.hash);
    attempts++;
    console.log(`Waiting... (attempt ${attempts})`);
  }
  
  if (receipt && receipt.contractAddress) {
    console.log('\n✅ SUCCESS!');
    console.log('Contract deployed to:', receipt.contractAddress);
    
    // Save to file
    fs.writeFileSync('./last-deploy-address.txt', receipt.contractAddress);
    console.log('Address saved to last-deploy-address.txt');
    
    console.log('\n📝 UPDATE YOUR .env FILE:');
    console.log('EXECUTOR_ADDRESS=' + receipt.contractAddress);
  } else {
    console.log('\n⚠️ Could not get contract address from receipt');
    console.log('Transaction hash:', txResponse.hash);
    console.log('Please verify on Etherscan');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });

import hre from 'hardhat';
import { ethers } from 'ethers';
import fs from 'fs';

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
  
  // Use lower gas to work with limited balance
  const txResponse = await deployer.sendTransaction({
    ...deployTx,
    gasLimit: 1500000, // Higher gas limit
    gasPrice: ethers.parseUnits('15', 'gwei') // Lower gas price to reduce cost
  });
  
  console.log('Transaction sent:', txResponse.hash);
  console.log('Waiting for transaction receipt...');
  
  // Wait for receipt
  let receipt;
  try {
    receipt = await txResponse.wait(1);
  } catch (e) {
    console.log('wait() error:', e.message);
    receipt = await hre.ethers.provider.getTransactionReceipt(txResponse.hash);
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
    console.log('Receipt status:', receipt?.status);
    console.log('Please verify on Etherscan: https://etherscan.io/tx/' + txResponse.hash);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });

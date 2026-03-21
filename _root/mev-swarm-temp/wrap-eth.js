# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';

async function main() {
  console.log('💰 Wrapping 0.01 ETH to WETH...\n');

  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const WETH_ADDRESS = 'REDACTED_ADDRESS';
  const EXECUTOR_ADDRESS = process.env.EXECUTOR_ADDRESS;

  console.log('From:', wallet.address);
  console.log('Executor Contract:', EXECUTOR_ADDRESS);
  console.log('WETH Address:', WETH_ADDRESS);
  console.log('');

  const wethContract = new ethers.Contract(WETH_ADDRESS, [
    'function deposit() payable',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address, uint256) returns (bool)'
  ], wallet);

  const currentWethBalance = await wethContract.balanceOf(wallet.address);
  console.log('Current WETH Balance:', ethers.formatEther(currentWethBalance), 'WETH');
  console.log('');

  console.log('Wrapping 0.01 ETH...');
  const wrapTx = await wethContract.deposit({ value: ethers.parseEther('0.01') });
  console.log('Wrap Tx:', wrapTx.hash);
  await wrapTx.wait();
  console.log('✅ Wrapped successfully!');

  const newWethBalance = await wethContract.balanceOf(wallet.address);
  console.log('📊 New WETH Balance:', ethers.formatEther(newWethBalance), 'WETH');
  console.log('');

  console.log('🔐 Approving contract to spend WETH...');
  const approveTx = await wethContract.approve(EXECUTOR_ADDRESS, ethers.parseEther('0.01'));
  console.log('Approve Tx:', approveTx.hash);
  await approveTx.wait();
  console.log('✅ Approved! Contract can now spend 0.01 WETH');
  console.log('');

  console.log('✅ EXECUTOR WALLET NOW READY TO TRADE!');
  console.log('🚀 Next opportunity will execute successfully!');
}

main().catch(console.error);

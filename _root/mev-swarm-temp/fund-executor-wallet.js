import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * Fund Executor Wallet with WETH
 * Your executor wallet has no WETH, so contract can't pull it to swap
 * This script wraps ETH to WETH and approves the contract
 */

async function main() {
  console.log('💰 Funding Executor Wallet with WETH...\n');

  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const EXECUTOR_CONTRACT = process.env.EXECUTOR_ADDRESS;
  const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

  console.log('Wallet:', wallet.address);
  console.log('Executor Contract:', EXECUTOR_CONTRACT);
  console.log('WETH Address:', WETH_ADDRESS);
  console.log('');

  // Check current WETH balance
  const wethContract = new ethers.Contract(WETH_ADDRESS, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address, uint256) returns (bool)',
    'function deposit() payable'
  ], wallet);

  const currentWethBalance = await wethContract.balanceOf(wallet.address);
  console.log('Current WETH Balance:', ethers.formatEther(currentWethBalance), 'WETH');
  console.log('');

  // Wrap 0.01 ETH to WETH (enough for testing)
  const WRAP_AMOUNT = ethers.parseEther('0.01');

  if (currentWethBalance < WRAP_AMOUNT) {
    console.log('⚠️  Insufficient WETH balance. Wrapping 0.001 ETH...');

    const wrapTx = await wethContract.deposit({ value: WRAP_AMOUNT });
    console.log('Wrap Transaction:', wrapTx.hash);
    await wrapTx.wait();
    console.log('✅ Wrapped! WETH Balance:', ethers.formatEther(await wethContract.balanceOf(wallet.address)), 'WETH');
  } else {
    console.log('✅ Sufficient WETH balance. Skipping wrap.');
  }

  console.log('');
  console.log('🔐 Approving contract to spend WETH...');

  const approveTx = await wethContract.approve(EXECUTOR_CONTRACT, WRAP_AMOUNT);
  console.log('Approve Transaction:', approveTx.hash);
  await approveTx.wait();
  console.log('✅ Approved! Contract can now spend', ethers.formatEther(WRAP_AMOUNT), 'WETH');
  console.log('');

  console.log('✅ EXECUTOR WALLET NOW FUNDED!');
  console.log('Next cycle will execute successfully! 🚀');
}

main().catch(console.error);

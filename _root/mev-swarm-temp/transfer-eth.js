/**
 * Transfer ETH from current account to another account
 * Run: node transfer-eth.js <destination_address> <amount_in_eth>
 */

import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';

async function transferETH() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('❌ Usage: node transfer-eth.js <destination_address> <amount_in_eth>');
    console.log('');
    console.log('Example: node transfer-eth.js 0x1234... 0.01');
    return;
  }

  const destinationAddress = args[0];
  const amountETH = args[1];

  console.log('🔄 Connecting to Ethereum...');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('📋 From Wallet:', wallet.address);
  console.log('📋 To Address:', destinationAddress);
  console.log('💰 Amount:', amountETH, 'ETH');

  // Check current balance
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH');

  const amountWei = ethers.parseEther(amountETH);

  if (balance < amountWei) {
    console.log('❌ Insufficient balance!');
    return;
  }

  console.log('📤 Sending transaction...');

  try {
    const tx = await wallet.sendTransaction({
      to: destinationAddress,
      value: amountWei
    });

    console.log('⏳ Transaction sent:', tx.hash);
    console.log('📝 Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Transfer successful!');
    console.log('📦 Block:', receipt.blockNumber);

    // Check new balance
    const newBalance = await provider.getBalance(wallet.address);
    console.log('💰 New Balance:', ethers.formatEther(newBalance), 'ETH');

  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
  }
}

transferETH();
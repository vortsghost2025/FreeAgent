# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';

const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');

const ownerWallet = 'REDACTED_ADDRESS';
const wallet2 = 'REDACTED_ADDRESS';
const contractAddress = 'REDACTED_ADDRESS';

async function main() {
  console.log('Checking balances...\n');
  
  const [ownerBal, wallet2Bal, contractBal] = await Promise.all([
    provider.getBalance(ownerWallet),
    provider.getBalance(wallet2),
    provider.getBalance(contractAddress)
  ]);

  console.log('=== Owner Wallet ===');
  console.log('Address:', ownerWallet);
  console.log('Balance:', ethers.formatEther(ownerBal), 'ETH');
  console.log('');
  console.log('=== Wallet 2 (with key: 0xe06a9...) ===');
  console.log('Address:', wallet2);
  console.log('Balance:', ethers.formatEther(wallet2Bal), 'ETH');
  console.log('');
  console.log('=== Contract ===');
  console.log('Address:', contractAddress);
  console.log('Balance:', ethers.formatEther(contractBal), 'ETH');
}

main().catch(console.error);

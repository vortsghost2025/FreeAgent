# REMOVED: sensitive data redacted by automated security cleanup
/**
 * Send ETH from your main wallet to bot wallet for gas
 * Run: node mev-swarm/send-gas.cjs
 */

require('dotenv').config();
const { ethers } = require('ethers');

const TO_ADDRESS = 'REDACTED_ADDRESS';
const SEND_AMOUNT = '0.005'; // 0.005 ETH for gas
const RPC_URL = process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL;

async function send() {
  console.log('🔄 Connecting to Ethereum...');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('📋 From wallet:', wallet.address);
  console.log('📋 To wallet:', TO_ADDRESS);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
  
  const sendAmount = ethers.parseEther(SEND_AMOUNT);
  
  if (balance < sendAmount) {
    console.log('❌ Not enough ETH to send');
    return;
  }
  
  console.log('📤 Sending', SEND_AMOUNT, 'ETH...');
  
  try {
    const tx = await wallet.sendTransaction({
      to: TO_ADDRESS,
      value: sendAmount
    });
    
    console.log('⏳ Transaction sent:', tx.hash);
    console.log('📝 Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Success! Transaction confirmed.');
    console.log('📋 Gas used:', receipt.gasUsed);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

send();

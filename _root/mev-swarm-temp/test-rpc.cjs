const { ethers } = require('ethers');
require('dotenv').config();

async function testRpc() {
  try {
    console.log('Testing RPC connection...');
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ RPC connection successful! Current block:', blockNumber);
    
    // Test wallet connection
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('✅ Wallet address:', wallet.address);
    
    // Test balance
    const balance = await wallet.getBalance();
    console.log('✅ Wallet balance:', ethers.formatEther(balance), 'ETH');
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ RPC test failed:', error.message);
    console.error('Error details:', error.stack);
  }
}

testRpc().catch(console.error);
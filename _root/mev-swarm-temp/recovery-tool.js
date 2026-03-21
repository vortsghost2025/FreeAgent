# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * Emergency Fund Recovery Tool
 * Helps recover funds from compromised wallet by finding the original sender
 */

async function recoverFunds() {
  const compromisedAddress = 'REDACTED_ADDRESS';
  const compromisedKey = 'REDACTED_PRIVATE_KEY';

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚨 EMERGENCY FUND RECOVERY TOOL                  ║');
  console.log('╚═════════════════════════════════════════════════════════════════════╝\n');

  console.log('Compromised Wallet: ' + compromisedAddress);
  console.log('Etherscan: https://etherscan.io/address/' + compromisedAddress + '\n');

  if (!process.env.MAINNET_RPC_URL) {
    console.log('❌ MAINNET_RPC_URL not found in .env');
    return;
  }

  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);

  try {
    // Check current balance
    const balance = await provider.getBalance(compromisedAddress);
    console.log('💰 Current Balance: ' + ethers.formatEther(balance) + ' ETH\n');

    if (balance === 0n) {
      console.log('❌ No funds to recover - wallet is empty');
      return;
    }

    // Get recent transactions
    console.log('🔍 Recent Transactions to/from this wallet:\n');

    const currentBlock = await provider.getBlockNumber();
    console.log('Current Block: #' + currentBlock + '\n');

    // Find transactions involving this address
    // Note: This requires Etherscan API or full node with transaction indexing

    const wallet = new ethers.Wallet(compromisedKey, provider);

    console.log('🔧 Recovery Options:\n');
    console.log('1. ✅ CREATE NEW SECURE WALLET and transfer funds immediately');
    console.log('2. 🔍 CHECK ORIGINAL WALLET: Look for the wallet that sent you these funds');
    console.log('3. 📋 GET TRANSACTION HISTORY: Use Etherscan to find sender addresses\n');

    // Generate a new secure wallet
    console.log('🆔 GENERATING NEW SECURE WALLET...\n');
    const newWallet = ethers.Wallet.createRandom();

    console.log('✅ NEW SECURE WALLET CREATED:');
    console.log('   Address: ' + newWallet.address);
    console.log('   Private Key: ' + newWallet.privateKey);
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Import this new wallet into MetaMask or your preferred wallet app');
    console.log('2. Send your funds FROM the compromised wallet TO this new wallet');
    console.log('3. Update your .env file with the new private key');
    console.log('4. NEVER use the compromised key again\n');

    // Create transaction to transfer funds
    console.log('💸 PREPARING FUND TRANSFER...\n');

    const tx = {
      to: newWallet.address,
      value: balance - ethers.parseEther('0.001'), // Leave some for gas
      gasLimit: 21000
    };

    console.log('Transaction Details:');
    console.log('   From: ' + compromisedAddress);
    console.log('   To: ' + newWallet.address);
    console.log('   Amount: ' + ethers.formatEther(tx.value) + ' ETH');
    console.log('   Gas: 0.001 ETH (estimated)\n');

    const gasPrice = await provider.getFeeData();
    console.log('Current Gas Price: ' + ethers.formatUnits(gasPrice.gasPrice, 'gwei') + ' gwei');

    // Calculate actual gas cost
    const gasCost = gasPrice.gasPrice * tx.gasLimit;
    const actualTransfer = balance - gasCost;

    console.log('Estimated Gas Cost: ' + ethers.formatEther(gasCost) + ' ETH');
    console.log('Actual Transfer Amount: ' + ethers.formatEther(actualTransfer) + ' ETH\n');

    console.log('⚠️  IMPORTANT: Run the recovery transaction now to save your funds!');
    console.log('╔════════════════════════════════════════════════════════════════╗\n');

  } catch (error) {
    console.log('❌ Error: ' + error.message);
  }
}

recoverFunds();
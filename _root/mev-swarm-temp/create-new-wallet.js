const { ethers } = require('ethers');

/**
 * Create a new secure wallet for MEV Swarm operations
 * This replaces the compromised key
 */
async function createNewWallet() {
  console.log('╔═════════════════════════════════════════════════════════════════╗');
  console.log('║  🔐 SECURE WALLET GENERATOR                           ║');
  console.log('╚═════════════════════════════════════════════════════════════════════╝\n');

  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();

  console.log('✅ NEW SECURE WALLET CREATED\n');

  console.log('📍 Wallet Address:');
  console.log(`   ${wallet.address}\n`);

  console.log('🔐 Private Key (SAVE SECURELY):');
  console.log(`   ${wallet.privateKey}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('⚠️  IMPORTANT SECURITY NOTES:\n');

  console.log('1. SAVE THIS KEY SECURELY:');
  console.log('   - Use a hardware wallet (Ledger, Trezor)');
  console.log('   - Or store in password manager (1Password, Bitwarden)');
  console.log('   - NEVER save to file, chat, or unsecured storage\n');

  console.log('2. FUNDS REQUIRED TO ACTIVATE:');
  console.log('   - Send ~0.05 ETH to this new address');
  console.log('   - This will cover deployment and initial operations\n');

  console.log('3. CONTRACT OPTIONS:');
  console.log('   A. Deploy NEW contract from this wallet (RECOMMENDED)');
  console.log('   B. Transfer ownership of existing contract');
  console.log('   C. Abandon existing contract\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 NEXT STEPS:\n');

  console.log('1. UPDATE MEV-SWARM/.ENV:');
  console.log(`   PRIVATE_KEY=${wallet.privateKey}\n`);

  console.log('2. UPDATE KILO MCP SETTINGS:');
  console.log('   File: C:\\Users\\seand\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\mcp_settings.json');
  console.log(`   Update "PRIVATE_KEY" to: ${wallet.privateKey}\n`);

  console.log('3. FUND NEW WALLET:');
  console.log(`   Send ETH to: ${wallet.address}`);
  console.log('   From MetaMask, Rabby, or exchange\n');

  console.log('4. DEPLOY NEW CONTRACT (RECOMMENDED):');
  console.log('   Run: npm run deploy:mainnet');
  console.log('   This will create fresh contract with secure key\n');

  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Write to file for reference
  const fs = require('fs');
  const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    createdAt: new Date().toISOString(),
    contract: '0xaC9d24032F5375625661fADA31902D10D25c55e7', // Old contract
    action: 'NEW_WALLET_CREATED'
  };

  fs.writeFileSync(
    'NEW-WALLET-INFO.json',
    JSON.stringify(walletInfo, null, 2)
  );

  console.log('💾 Saved to: NEW-WALLET-INFO.json\n');

  return wallet;
}

// Run if executed directly
if (require.main === module) {
  createNewWallet()
    .then(wallet => {
      console.log('\n🎉 WALLET GENERATION COMPLETE!\n');
      console.log('Proceed with the steps above to secure your MEV Swarm operations.\n');
    })
    .catch(error => {
      console.error('❌ Error generating wallet:', error.message);
      process.exit(1);
    });
}

module.exports = { createNewWallet };

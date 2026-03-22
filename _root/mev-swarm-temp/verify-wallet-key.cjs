/**
 * Wallet Key Verification Script
 * 
 * Run this to verify which wallet address your private key generates.
 * 
 * Usage: node verify-wallet-key.cjs
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

console.log('='.repeat(60));
console.log('KEY VERIFICATION RESULTS');
console.log('='.repeat(60));

// Collect keys from environment only — DO NOT HARD-CODE PRIVATE KEYS IN SOURCE.
// Accept either a single `PRIVATE_KEY` or a comma-separated `PRIVATE_KEYS` value.
const testKeys = [];

if (process.env.PRIVATE_KEYS) {
  const envKeys = process.env.PRIVATE_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  for (const k of envKeys) testKeys.push({ key: k, label: 'from PRIVATE_KEYS env' });
}

// Backwards-compatible single key
const privateKey = process.env.PRIVATE_KEY || process.env.MEV_PRIVATE_KEY;
if (privateKey) {
  testKeys.push({ key: privateKey, label: 'from PRIVATE_KEY env' });
}

if (testKeys.length === 0) {
  console.error('No private keys found in environment. Set PRIVATE_KEY or PRIVATE_KEYS (comma-separated).');
  console.error('For safety, do NOT commit private keys to source. Use secret managers or .env files excluded from Git.');
  process.exit(1);
}

// Test all keys
for (const { key, label } of testKeys) {
  try {
    const wallet = new ethers.Wallet(key);
    console.log(`\n📝 ${label}`);
    console.log(`   Address: ${wallet.address}`);
    
    // Check against known wallets
    const knownWallets = {
      '0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F': 'Trading Wallet (has $)',
      '0xC649A2F94AFc4E5649D3d575d16E739e70B2BA2F': 'WETH Holder Wallet',
      '0x34769bE7087F1fE5B9ad5C50cC1526BC63217341': 'Funding Wallet'
    };
    
    const matches = Object.entries(knownWallets).filter(([addr]) => 
      addr.toLowerCase() === wallet.address.toLowerCase()
    );
    
    if (matches.length > 0) {
      console.log(`   ✅ MATCHES: ` + matches.map(([_, l]) => l).join(', '));
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
}

console.log('\n' + '='.repeat(60));

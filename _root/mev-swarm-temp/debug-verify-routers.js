# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';

// Known correct router addresses for mainnet
const CORRECT_ROUTERS = {
  'Uniswap V2 Router': 'REDACTED_ADDRESS',
  'Uniswap V3 SwapRouter': 'REDACTED_ADDRESS',
  'SushiSwap Router': 'REDACTED_ADDRESS',
};

// What we have in the code
const OUR_ROUTERS = {
  'Uniswap V2': 'REDACTED_ADDRESS',
  'Uniswap V3': 'REDACTED_ADDRESS',
  'Sushiswap': 'REDACTED_ADDRESS',
};

console.log('🔍 Comparing router addresses...\n');

Object.entries(OUR_ROUTERS).forEach(([name, addr]) => {
  const correct = Object.values(CORRECT_ROUTERS).find(c => c.toLowerCase() === addr.toLowerCase());

  console.log(`${name}:`);
  console.log(`  Our: ${addr}`);
  console.log(`  Expected: ${Object.entries(CORRECT_ROUTERS).find(([n,a]) => n.toLowerCase().includes(name.toLowerCase()))?.[1] || 'Not found'}`);
  console.log(`  ✅ Match: ${!!correct}\n`);
});

// Test with ethers.getAddress to see if checksums match
console.log('💡 Testing checksums with ethers.getAddress()...\n');
Object.entries(OUR_ROUTERS).forEach(([name, addr]) => {
  try {
    const checksummed = ethers.getAddress(addr);
    console.log(`${name}: ${checksummed}`);
  } catch (e) {
    console.log(`${name}: ❌ ${e.message}`);
  }
});

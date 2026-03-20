import { ethers } from 'ethers';

// Known correct router addresses for mainnet
const CORRECT_ROUTERS = {
  'Uniswap V2 Router': '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  'Uniswap V3 SwapRouter': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  'SushiSwap Router': '0xd9e1cE17f2641f24aE83637ab66a2cca9C378b9F',
};

// What we have in the code
const OUR_ROUTERS = {
  'Uniswap V2': '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'Uniswap V3': '0xe592427a0aece92de3edee1f18e0157c05861564',
  'Sushiswap': '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
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

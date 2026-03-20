/**
 * Debug script to test RPC issue
 */
import 'dotenv/config';
import { ethers } from 'ethers';

async function test() {
  console.log('=== RPC Debug Test ===\n');
  
  // Test 1: Check what RPC URL is loaded
  console.log('1. Checking loaded RPC URL:');
  console.log('   MAINNET_RPC_URL:', process.env.MAINNET_RPC_URL);
  console.log('   ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL);
  
  // Test 2: Create provider the same way launcher does
  console.log('\n2. Creating provider from MAINNET_RPC_URL...');
  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  
  // Test 3: Test getBlockNumber (should work)
  console.log('\n3. Testing getBlockNumber...');
  try {
    const blockNum = await provider.getBlockNumber();
    console.log('   Block number:', blockNum);
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 4: Test getReserves (the failing call)
  console.log('\n4. Testing getReserves (single call)...');
  const PAIR_ABI = ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'];
  const poolAddr = '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc';
  
  try {
    const contract = new ethers.Contract(poolAddr, PAIR_ABI, provider);
    console.log('   Contract created, calling getReserves...');
    const reserves = await contract.getReserves();
    console.log('   SUCCESS! Reserves:', reserves.reserve0, reserves.reserve1);
  } catch (e) {
    console.log('   ERROR:', e.message);
    console.log('   Full error:', JSON.stringify(e, null, 2));
  }
  
  // Test 5: Test with Promise.all like launcher does
  console.log('\n5. Testing with Promise.all (like launcher)...');
  try {
    const results = await Promise.all([
      new ethers.Contract(poolAddr, PAIR_ABI, provider).getReserves(),
      new ethers.Contract('0x397ff1542f962076d0bfe58ea045ffa2d347aca0', PAIR_ABI, provider).getReserves()
    ]);
    console.log('   SUCCESS! Results:', results.length);
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  console.log('\n=== Test Complete ===');
}

test().catch(console.error);

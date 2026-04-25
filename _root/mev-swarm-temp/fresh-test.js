# REMOVED: sensitive data redacted by automated security cleanup
/**
 * FRESH LAUNCHER - Test version with debugging
 */
import 'dotenv/config';
import { ethers } from 'ethers';

async function main() {
  console.log('=== FRESH LAUNCHER TEST ===\n');
  
  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const PAIR_ABI = ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'];
  const pool = 'REDACTED_ADDRESS';
  
  console.log('Calling getReserves on pool...');
  
  try {
    const reserves = await new ethers.Contract(pool, PAIR_ABI, provider).getReserves();
    console.log('SUCCESS! Reserves:', reserves.reserve0, reserves.reserve1);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

main().catch(console.error);

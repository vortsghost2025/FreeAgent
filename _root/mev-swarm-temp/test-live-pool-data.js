# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';

const USDC_ETH_POOL = 'REDACTED_ADDRESS';
const POOL_ABI = ['function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'];

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const pool = new ethers.Contract(USDC_ETH_POOL, POOL_ABI, provider);

console.log('Testing live pool data from Uniswap V3 USDC/ETH...');
console.log('Checking if tick values change over time...\n');

let previousTick = null;
const samples = [];

for (let i = 0; i < 5; i++) {
  const slot0 = await pool.slot0();
  const tick = slot0.tick;
  const sqrtPriceX96 = slot0.sqrtPriceX96;

  console.log(`Sample ${i + 1}:`);
  console.log(`  Tick: ${tick}`);
  console.log(`  sqrtPriceX96: ${sqrtPriceX96}`);

  if (previousTick !== null) {
    const tickDiff = tick - previousTick;
    console.log(`  Tick change: ${tickDiff > 0 ? '+' : ''}${tickDiff}`);
  }

  samples.push({ tick, sqrtPriceX96: sqrtPriceX96.toString() });
  previousTick = tick;

  // Wait 5 seconds between samples
  await new Promise(r => setTimeout(r, 5000));
  console.log('');
}

// Check if all values are identical
const allSame = samples.every(s => s.tick === samples[0].tick);
console.log('=== ANALYSIS ===');
console.log(`All samples identical: ${allSame}`);
console.log(`Samples collected: ${samples.length}`);
if (allSame) {
  console.log('⚠️  WARNING: Pool data appears cached or not updating');
} else {
  console.log('✅ Pool data is updating normally');
  const minTick = Math.min(...samples.map(s => s.tick));
  const maxTick = Math.max(...samples.map(s => s.tick));
  console.log(`Tick range: ${minTick} to ${maxTick}`);
}

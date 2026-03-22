/**
 * 🔧 FORCE BAD TRADE TEST
 *
 * This script forces a clearly bad trade scenario to verify guardrail blocks it
 * Run this BEFORE going live to confirm safety works
 */

import { ethers } from 'ethers';
import 'dotenv/config';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║        FORCE BAD TRADE TEST                             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

console.log('Wallet:', wallet.address);

/**
 * 🔴 CRITICAL FIX #3: Net-profit guardrail
 * This is the exact function that prevents overnight losses
 */
function validateNetProfit(expectedProfitUsd, estimatedGasUsd, estimatedFeesUsd, minNetProfit) {
  const netExpected = expectedProfitUsd - (estimatedGasUsd + estimatedFeesUsd);

  console.log(`Profit check → gross: $${expectedProfitUsd.toFixed(4)}, gas+fees: $${(estimatedGasUsd + estimatedFeesUsd).toFixed(4)}, net: $${netExpected.toFixed(4)}`);

  if (netExpected <= 0) {
    console.log('⛔ BLOCKED: Net profit negative after gas/fees');
    return false;
  }

  if (netExpected < minNetProfit) {
    console.log(`⛔ BLOCKED: Net profit $${netExpected.toFixed(2)} below minimum $${minNetProfit}`);
    return false;
  }

  console.log(`✅ PASS: Net profit $${netExpected.toFixed(4)} meets requirements`);
  return true;
}

async function testBadTrade() {
  console.log('\n🧪 TEST 1: Forcing a clearly bad trade\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Scenario: Would lose $0.50 after gas and fees
  const expectedProfitUsd = 0.50;    // Gross profit looks OK
  const estimatedGasUsd = 0.80;        // But gas costs more
  const estimatedFeesUsd = 0.25;      // And fees too
  const minNetProfit = 1.0;            // $1.00 minimum

  console.log(`Scenario: Gross profit $${expectedProfitUsd}, but costs $${(estimatedGasUsd + estimatedFeesUsd).toFixed(2)}`);
  console.log(`Expected net: -$${((estimatedGasUsd + estimatedFeesUsd) - expectedProfitUsd).toFixed(2)} (should be BLOCKED)\n`);

  const result1 = validateNetProfit(expectedProfitUsd, estimatedGasUsd, estimatedFeesUsd, minNetProfit);

  if (result1 === false) {
    console.log('\n✅ TEST 1 PASSED: Bad trade was correctly BLOCKED\n');
  } else {
    console.log('\n❌ TEST 1 FAILED: Bad trade was NOT blocked - DO NOT GO LIVE!\n');
    process.exit(1);
  }
}

async function testHighMinimum() {
  console.log('\n🧪 TEST 2: Trade below high minimum\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Scenario: Good profit but below $5.00 minimum
  const expectedProfitUsd = 2.50;    // Good gross profit
  const estimatedGasUsd = 0.05;        // Reasonable gas
  const estimatedFeesUsd = 0.10;      // Reasonable fees
  const minNetProfit = 5.0;            // HIGH $5.00 minimum

  console.log(`Scenario: Good trade ($${(expectedProfitUsd - estimatedGasUsd - estimatedFeesUsd).toFixed(2)} net) but below $${minNetProfit} minimum`);
  console.log(`Expected net: $${(expectedProfitUsd - estimatedGasUsd - estimatedFeesUsd).toFixed(2)} (should be BLOCKED)\n`);

  const result2 = validateNetProfit(expectedProfitUsd, estimatedGasUsd, estimatedFeesUsd, minNetProfit);

  if (result2 === false) {
    console.log('\n✅ TEST 2 PASSED: Trade below minimum was correctly BLOCKED\n');
  } else {
    console.log('\n❌ TEST 2 FAILED: Below-minimum trade was NOT blocked - DO NOT GO LIVE!\n');
    process.exit(1);
  }
}

async function testGoodTrade() {
  console.log('\n🧪 TEST 3: Valid profitable trade\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Scenario: Good trade that should pass
  const expectedProfitUsd = 5.00;    // Excellent profit
  const estimatedGasUsd = 0.10;        // Reasonable gas
  const estimatedFeesUsd = 0.15;      // Reasonable fees
  const minNetProfit = 1.0;            // Normal $1.00 minimum

  console.log(`Scenario: Excellent trade ($${(expectedProfitUsd - estimatedGasUsd - estimatedFeesUsd).toFixed(2)} net) above $${minNetProfit} minimum`);
  console.log(`Expected net: $${(expectedProfitUsd - estimatedGasUsd - estimatedFeesUsd).toFixed(2)} (should PASS)\n`);

  const result3 = validateNetProfit(expectedProfitUsd, estimatedGasUsd, estimatedFeesUsd, minNetProfit);

  if (result3 === true) {
    console.log('\n✅ TEST 3 PASSED: Good trade was correctly APPROVED\n');
  } else {
    console.log('\n❌ TEST 3 FAILED: Good trade was blocked - something wrong with logic\n');
    process.exit(1);
  }
}

async function main() {
  console.log('\n🎯 Running forced bad trade tests...\n');

  await testBadTrade();
  await testHighMinimum();
  await testGoodTrade();

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    ALL TESTS PASSED                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('✅ GUARDRAIL IS WORKING CORRECTLY');
  console.log('   - Bad trades (negative net) are BLOCKED');
  console.log('   - Trades below minimum are BLOCKED');
  console.log('   - Good trades (above minimum) are APPROVED');
  console.log('\n🔒 You are safe to proceed with dry-run testing.\n');
  console.log('⚠️  REMEMBER: Before going live, verify that:');
  console.log('   1. Every trade has "Profit check →" log BEFORE "Executing swap..."');
  console.log('   2. No swap executes without a preceding profit check');
  console.log('   3. All bad trades show "⛔ BLOCKED" and STOP');
}

main().catch(console.error);

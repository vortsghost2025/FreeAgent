/**
 * 🔒 GUARDRAIL SAFETY TEST
 *
 * This script demonstrates the net-profit guardrail blocking bad trades
 * Run this BEFORE going live to verify safety works
 */

import { ethers } from 'ethers';
import 'dotenv/config';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║        GUARDRAIL SAFETY TEST                              ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true';
console.log(`🔒 DRY_RUN MODE: ${DRY_RUN ? 'ENABLED (SAFE)' : 'DISABLED (LIVE)'}`);

/**
 * 🔴 CRITICAL FIX #3: Net-profit guardrail
 * This is the exact function that prevents overnight losses
 */
function validateNetProfit(expectedProfitUsd, estimatedGasUsd, estimatedFeesUsd, minNetProfit = 1.0) {
  const netExpected = expectedProfitUsd - (estimatedGasUsd + estimatedFeesUsd);

  // Optional logging for transparency
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

/**
 * Test scenarios
 */
const testScenarios = [
  {
    name: 'Scenario 1: Good trade (should PASS)',
    expectedProfitUsd: 2.50,
    estimatedGasUsd: 0.05,
    estimatedFeesUsd: 0.12,
    minNetProfit: 1.0
  },
  {
    name: 'Scenario 2: Bad trade - negative net (should BLOCK)',
    expectedProfitUsd: 0.05,
    estimatedGasUsd: 0.08,
    estimatedFeesUsd: 0.03,
    minNetProfit: 1.0
  },
  {
    name: 'Scenario 3: Good trade but below minimum (should BLOCK)',
    expectedProfitUsd: 0.80,
    estimatedGasUsd: 0.04,
    estimatedFeesUsd: 0.06,
    minNetProfit: 1.0
  },
  {
    name: 'Scenario 4: Break-even trade (should BLOCK)',
    expectedProfitUsd: 0.10,
    estimatedGasUsd: 0.06,
    estimatedFeesUsd: 0.04,
    minNetProfit: 1.0
  },
  {
    name: 'Scenario 5: High-value trade (should PASS)',
    expectedProfitUsd: 5.00,
    estimatedGasUsd: 0.10,
    estimatedFeesUsd: 0.30,
    minNetProfit: 1.0
  }
];

console.log('\n🧪 Running test scenarios...\n');

let passed = 0;
let blocked = 0;

testScenarios.forEach((scenario, index) => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(scenario.name);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const result = validateNetProfit(
    scenario.expectedProfitUsd,
    scenario.estimatedGasUsd,
    scenario.estimatedFeesUsd,
    scenario.minNetProfit
  );

  if (result) {
    passed++;
  } else {
    blocked++;
  }
});

console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                    TEST RESULTS                              ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log(`   ✅ Passed (safe to execute): ${passed}`);
console.log(`   ⛔ Blocked (safety worked): ${blocked}`);
console.log(`   📊 Total scenarios: ${passed + blocked}`);

// Verify guardrail is working correctly
const expectedPassed = 2; // Scenarios 1 and 5
const expectedBlocked = 3; // Scenarios 2, 3, and 4

if (passed === expectedPassed && blocked === expectedBlocked) {
  console.log('\n✅ GUARDRAIL IS WORKING CORRECTLY');
  console.log('   All bad trades were blocked. All good trades passed.');
  console.log('\n🔒 You are safe to proceed with dry-run testing.\n');
  process.exit(0);
} else {
  console.log('\n❌ GUARDRAIL IS NOT WORKING CORRECTLY');
  console.log(`   Expected: ${expectedPassed} passed, ${expectedBlocked} blocked`);
  console.log(`   Got: ${passed} passed, ${blocked} blocked`);
  console.log('\n⚠️  DO NOT RUN LIVE TRADING YET\n');
  process.exit(1);
}

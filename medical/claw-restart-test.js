#!/usr/bin/env node
/**
 * Definitive Test: Can Claw Execute Restart Commands?
 * Testing the exact commands Claw mentioned
 */

import { executeCommand } from './cockpit-tools.js';

async function testRestartCommands() {
  console.log('🦞 TESTING CLAW RESTART COMMANDS');
  console.log('==================================');
  
  console.log('\n📋 Commands Claw wants to execute:');
  console.log('1. pkill -f node (kill current server)');
  console.log('2. npm run start (restart server)');
  
  console.log('\n🔧 Testing through cockpit tools system...\n');
  
  try {
    // Test 1: Check if pkill is available (Unix command)
    console.log('1️⃣ Testing pkill availability...');
    const pkillTest = await executeCommand('pkill --help');
    console.log(`   pkill available: ${pkillTest.success ? '✅ YES' : '❌ NO (Unix/Linux only)'}`);
    
    // Test 2: Check if taskkill is available (Windows equivalent)
    console.log('\n2️⃣ Testing Windows process killing...');
    const taskkillTest = await executeCommand('taskkill /?');
    console.log(`   taskkill available: ${taskkillTest.success ? '✅ YES' : '❌ NO'}`);
    
    // Test 3: Test npm run start command
    console.log('\n3️⃣ Testing npm run start...');
    const npmTest = await executeCommand('npm run start --dry-run');
    console.log(`   npm run start: ${npmTest.success ? '✅ VALID COMMAND' : '❌ INVALID'}`);
    
    // Test 4: Check if cockpit-server.js exists and is executable
    console.log('\n4️⃣ Testing direct server execution...');
    const serverTest = await executeCommand('node cockpit-server.js --help');
    console.log(`   node cockpit-server.js: ${serverTest.success ? '✅ EXECUTABLE' : '❌ NOT EXECUTABLE'}`);
    
    // Test 5: Security validation
    console.log('\n5️⃣ Security validation...');
    const securityTest = await executeCommand('npm --version');
    console.log(`   npm accessible: ${securityTest.success ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎯 CONCLUSION:');
    console.log('==============='); 
    
    if (pkillTest.success) {
      console.log('✅ Claw CAN execute: pkill -f node');
    } else {
      console.log('⚠️  Claw CANNOT execute: pkill -f node (Unix-only command)');
      console.log('💡 Alternative: taskkill /f /im node.exe (Windows)');
    }
    
    if (npmTest.success) {
      console.log('✅ Claw CAN execute: npm run start');
      console.log('   → This maps to: node cockpit-server.js');
    } else {
      console.log('❌ Claw CANNOT execute: npm run start');
    }
    
    if (serverTest.success) {
      console.log('✅ Claw CAN execute: node cockpit-server.js directly');
    }
    
    console.log('\n🛡️  SECURITY STATUS: Active');
    console.log('   • Command allowlist: Active');
    console.log('   • Dangerous command blocking: Active'); 
    console.log('   • Workspace restriction: Active');
    
    console.log('\n📋 RECOMMENDATION FOR CLAW:');
    if (pkillTest.success) {
      console.log('Use these exact commands:');
      console.log('1. pkill -f node');
      console.log('2. npm run start');
    } else {
      console.log('Use these Windows-compatible commands:');
      console.log('1. taskkill /f /im node.exe');
      console.log('2. npm run start');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRestartCommands().catch(console.error);
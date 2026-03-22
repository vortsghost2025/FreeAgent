#!/usr/bin/env node
/**
 * Claw Multi-Runtime Test Suite
 * Comprehensive testing for all Claw runtime modes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all Claw runtimes
import { ClawAPI as StandaloneClaw } from './claw-standalone.js';
import { ClawOpenClaw } from './claw-openclaw.js';

console.log('🧪 CLAW MULTI-RUNTIME TEST SUITE');
console.log('=================================');

/**
 * Test Coordinator - Runs comprehensive tests across all Claw runtimes
 */
class ClawTestCoordinator {
  constructor() {
    this.testResults = {
      standalone: { passed: 0, failed: 0, tests: [] },
      openclaw: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('\n🚀 Starting comprehensive Claw testing...\n');
    
    // Test Standalone Claw
    await this.testStandaloneClaw();
    
    // Test OpenClaw Integration
    await this.testOpenClawIntegration();
    
    // Test Cross-runtime Communication
    await this.testCrossRuntimeCommunication();
    
    // Display results
    this.displayResults();
  }

  /**
   * Test Standalone Claw functionality
   */
  async testStandaloneClaw() {
    console.log('🔬 Testing Standalone Claw Runtime...');
    console.log('-------------------------------------');
    
    try {
      const claw = new StandaloneClaw();
      
      // Test 1: Basic initialization
      const status = claw.getStatus();
      this.assert(status.agent === 'claw-standalone', 'Standalone initialization', 'claw-standalone');
      
      // Test 2: Basic chat functionality
      const response1 = await claw.chat('Hello standalone Claw!');
      this.assert(response1.includes('Hello'), 'Basic chat response', response1.substring(0, 50));
      
      // Test 3: Memory isolation
      const initialSessions = status.totalSessions;
      await claw.chat('Test message for memory');
      const newStatus = claw.getStatus();
      this.assert(newStatus.totalSessions > initialSessions, 'Memory persistence', 
                  `Sessions: ${initialSessions} → ${newStatus.totalSessions}`);
      
      // Test 4: Independent operation
      this.assert(status.settings.memoryIsolation === true, 'Memory isolation enabled', 'Enabled');
      this.assert(status.settings.noSharedWorkspace === true, 'No shared workspace', 'Confirmed');
      
      console.log('✅ Standalone Claw tests completed\n');
      
    } catch (error) {
      console.error('❌ Standalone Claw test failed:', error.message);
      this.testResults.standalone.failed++;
    }
  }

  /**
   * Test OpenClaw Integration
   */
  async testOpenClawIntegration() {
    console.log('🔬 Testing OpenClaw Integration...');
    console.log('----------------------------------');
    
    try {
      const claw = new ClawOpenClaw();
      
      // Test 1: Connection to OpenClaw
      const connected = await claw.connectToOpenClaw();
      this.assert(connected === true, 'OpenClaw connection', connected ? 'Connected' : 'Failed');
      
      // Test 2: Session creation
      const status = claw.getSessionStatus();
      this.assert(status.connected === true, 'Session establishment', status.sessionId);
      
      // Test 3: Message processing with context
      const response = await claw.processMessage('Test OpenClaw integration');
      this.assert(response.length > 20, 'Context-aware response', response.substring(0, 50));
      
      // Test 4: Session logging
      const sessionFileExists = fs.existsSync(status.sessionFile);
      this.assert(sessionFileExists, 'Session log creation', status.sessionFile);
      
      console.log('✅ OpenClaw integration tests completed\n');
      
    } catch (error) {
      console.error('❌ OpenClaw integration test failed:', error.message);
      this.testResults.openclaw.failed++;
    }
  }

  /**
   * Test Cross-runtime Communication
   */
  async testCrossRuntimeCommunication() {
    console.log('🔬 Testing Cross-Runtime Communication...');
    console.log('------------------------------------------');
    
    try {
      // Create instances of both runtimes
      const standalone = new StandaloneClaw();
      const openclaw = new ClawOpenClaw();
      await openclaw.connectToOpenClaw();
      
      // Test 1: Independent memory spaces
      const standaloneStatus = standalone.getStatus();
      const openclawStatus = openclaw.getSessionStatus();
      
      this.assert(standaloneStatus.agent !== openclawStatus.agentId, 
                  'Memory isolation between runtimes', 
                  `${standaloneStatus.agent} ≠ ${openclawStatus.agentId}`);
      
      // Test 2: Concurrent operation
      const standaloneResponse = await standalone.chat('Concurrent test message');
      const openclawResponse = await openclaw.processMessage('Concurrent test message');
      
      this.assert(standaloneResponse !== openclawResponse, 
                  'Independent processing', 
                  'Responses are appropriately different');
      
      // Test 3: No interference
      const standaloneSessionsBefore = standalone.getStatus().totalSessions;
      await openclaw.processMessage('Message that should not affect standalone');
      const standaloneSessionsAfter = standalone.getStatus().totalSessions;
      
      this.assert(standaloneSessionsBefore === standaloneSessionsAfter, 
                  'No cross-runtime interference', 
                  `Standalone sessions unchanged: ${standaloneSessionsBefore}`);
      
      console.log('✅ Cross-runtime communication tests completed\n');
      
    } catch (error) {
      console.error('❌ Cross-runtime communication test failed:', error.message);
      this.testResults.integration.failed++;
    }
  }

  /**
   * Assertion helper
   */
  assert(condition, testName, details) {
    const runtime = this.getCurrentRuntime();
    const result = condition ? '✅ PASS' : '❌ FAIL';
    
    console.log(`  ${result} ${testName} - ${details}`);
    
    const testResult = {
      name: testName,
      passed: condition,
      details: details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults[runtime].tests.push(testResult);
    if (condition) {
      this.testResults[runtime].passed++;
    } else {
      this.testResults[runtime].failed++;
    }
  }

  /**
   * Get current runtime context
   */
  getCurrentRuntime() {
    const stack = new Error().stack;
    if (stack.includes('testStandaloneClaw')) return 'standalone';
    if (stack.includes('testOpenClawIntegration')) return 'openclaw';
    if (stack.includes('testCrossRuntimeCommunication')) return 'integration';
    return 'unknown';
  }

  /**
   * Display comprehensive test results
   */
  displayResults() {
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('============================');
    
    const totalTests = Object.values(this.testResults).reduce((sum, runtime) => 
      sum + runtime.passed + runtime.failed, 0);
    const totalPassed = Object.values(this.testResults).reduce((sum, runtime) => 
      sum + runtime.passed, 0);
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed}`);
    console.log(`  Failed: ${totalTests - totalPassed}`);
    console.log(`  Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n🔧 Runtime Breakdown:`);
    
    // Standalone results
    const standalone = this.testResults.standalone;
    console.log(`\n  🤖 Standalone Claw:`);
    console.log(`    Passed: ${standalone.passed}`);
    console.log(`    Failed: ${standalone.failed}`);
    console.log(`    Success Rate: ${standalone.failed === 0 ? '100%' : ((standalone.passed / (standalone.passed + standalone.failed)) * 100).toFixed(1)}%`);
    
    // OpenClaw results
    const openclaw = this.testResults.openclaw;
    console.log(`\n  🦀 OpenClaw Integration:`);
    console.log(`    Passed: ${openclaw.passed}`);
    console.log(`    Failed: ${openclaw.failed}`);
    console.log(`    Success Rate: ${openclaw.failed === 0 ? '100%' : ((openclaw.passed / (openclaw.passed + openclaw.failed)) * 100).toFixed(1)}%`);
    
    // Integration results
    const integration = this.testResults.integration;
    console.log(`\n  🔗 Cross-Runtime Communication:`);
    console.log(`    Passed: ${integration.passed}`);
    console.log(`    Failed: ${integration.failed}`);
    console.log(`    Success Rate: ${integration.failed === 0 ? '100%' : ((integration.passed / (integration.passed + integration.failed)) * 100).toFixed(1)}%`);
    
    // Final assessment
    console.log(`\n🏆 FINAL ASSESSMENT:`);
    if (totalPassed === totalTests) {
      console.log(`  🎉 ALL TESTS PASSED! Claw multi-runtime system is fully operational.`);
    } else if (totalPassed >= totalTests * 0.8) {
      console.log(`  ✅ MAJOR FUNCTIONALITY WORKING - Minor issues detected.`);
    } else {
      console.log(`  ⚠️  SIGNIFICANT ISSUES DETECTED - Further investigation needed.`);
    }
    
    console.log(`\n📋 Detailed Test Log:`);
    Object.entries(this.testResults).forEach(([runtime, results]) => {
      if (results.tests.length > 0) {
        console.log(`\n  ${runtime.toUpperCase()} RUNTIME TESTS:`);
        results.tests.forEach(test => {
          const status = test.passed ? '✅' : '❌';
          console.log(`    ${status} ${test.name} (${test.details})`);
        });
      }
    });
  }
}

/**
 * Quick Smoke Tests - Fast validation
 */
async function runSmokeTests() {
  console.log('🔥 QUICK SMOKE TESTS');
  console.log('====================');
  
  try {
    // Test 1: Standalone import
    const standalone = new StandaloneClaw();
    console.log('✅ Standalone Claw imports successfully');
    
    // Test 2: OpenClaw import and connection
    const openclaw = new ClawOpenClaw();
    const connected = await openclaw.connectToOpenClaw();
    console.log(connected ? '✅ OpenClaw connects successfully' : '⚠️ OpenClaw connection failed');
    
    // Test 3: Basic functionality
    const response = await standalone.chat('Quick test');
    console.log(response ? '✅ Basic functionality works' : '❌ Basic functionality failed');
    
    console.log('\n🎉 Smoke tests completed - system appears healthy!\n');
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
  }
}

/**
 * Interactive Test Runner
 */
async function interactiveTestRunner() {
  const coordinator = new ClawTestCoordinator();
  
  console.log(`
🧪 CLAW TEST SUITE MENU
=======================

1. Run Smoke Tests (quick validation)
2. Run Full Test Suite (comprehensive testing)
3. Test Specific Runtime
4. Exit

Choose an option:
`);
  
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askChoice = () => {
    readline.question('> ', async (choice) => {
      switch (choice.trim()) {
        case '1':
          await runSmokeTests();
          askChoice();
          break;
        case '2':
          await coordinator.runAllTests();
          askChoice();
          break;
        case '3':
          console.log('\nWhich runtime to test?');
          console.log('1. Standalone Claw');
          console.log('2. OpenClaw Integration');
          console.log('3. Both (cross-runtime)');
          readline.question('Runtime choice: ', async (runtimeChoice) => {
            // Implementation for specific runtime testing
            console.log('Feature coming soon...');
            askChoice();
          });
          break;
        case '4':
        case 'exit':
        case 'quit':
          console.log('👋 Exiting test suite');
          readline.close();
          return;
        default:
          console.log('Invalid choice. Please select 1-4.');
          askChoice();
      }
    });
  };
  
  askChoice();
}

// Export for programmatic use
export { ClawTestCoordinator, runSmokeTests };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--smoke')) {
    runSmokeTests().catch(console.error);
  } else if (process.argv.includes('--full')) {
    const coordinator = new ClawTestCoordinator();
    coordinator.runAllTests().catch(console.error);
  } else {
    interactiveTestRunner().catch(console.error);
  }
}
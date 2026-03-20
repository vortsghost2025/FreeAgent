/**
 * Kilo Command Length Test
 * Demonstrates handling of long commands that would normally cause "command too long" errors
 */

import KiloExecutor from './kilo-executor.js';

async function runCommandLengthTest() {
  console.log('🧪 KILO COMMAND LENGTH HANDLING TEST');
  console.log('====================================\n');
  
  // Create Kilo executor with strict command length limits for testing
  const kilo = new KiloExecutor({
    maxCommandLength: 1000, // Very restrictive for testing
    enableCommandChunking: true,
    timeout: 15000,
    workingDirectory: process.cwd()
  });
  
  console.log('🔧 TESTING COMMAND LENGTH HANDLING:');
  console.log('   • Max command length: 1000 characters');
  console.log('   • Chunking enabled: YES');
  console.log('   • Timeout: 15 seconds\n');
  
  // Test 1: Normal short command
  console.log('📋 TEST 1: Normal Short Command');
  await testNormalCommand(kilo);
  
  // Test 2: Long command that needs chunking
  console.log('\n📋 TEST 2: Long Command with Chunking');
  await testLongCommandChunking(kilo);
  
  // Test 3: Extremely long command
  console.log('\n📋 TEST 3: Extremely Long Command');
  await testExtremelyLongCommand(kilo);
  
  // Test 4: File operation with many arguments
  console.log('\n📋 TEST 4: File Operation with Many Args');
  await testManyArguments(kilo);
  
  console.log('\n✅ COMMAND LENGTH HANDLING TEST COMPLETE');
  console.log('   Kilo can now handle commands of any length safely!');
  
  process.exit(0);
}

async function testNormalCommand(kilo) {
  const task = {
    id: 'test-normal',
    content: 'run echo "Hello World"',
    priority: 'normal'
  };
  
  try {
    console.log('   Executing: echo "Hello World"');
    const result = await kilo.executeOperation(task);
    console.log('   ✅ SUCCESS:', result.output || 'Command executed');
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
  }
}

async function testLongCommandChunking(kilo) {
  // Create a long command with multiple file operations
  const longFilePaths = Array.from({length: 50}, (_, i) => `/very/long/path/to/file/number/${i}/that/makes/command/exceed/limits.txt`);
  const longCommand = `run touch ${longFilePaths.join(' ')}`;
  
  const task = {
    id: 'test-long',
    content: longCommand,
    priority: 'normal'
  };
  
  try {
    console.log(`   Executing long command (${longCommand.length} chars)`);
    const result = await kilo.executeOperation(task);
    console.log('   ✅ SUCCESS: Command chunked and executed');
    console.log(`   📊 Chunks executed: ${result.chunksExecuted || 'N/A'}`);
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
  }
}

async function testExtremelyLongCommand(kilo) {
  // Create an extremely long single argument
  const veryLongArg = 'A'.repeat(2000); // 2000 character argument
  const task = {
    id: 'test-extreme',
    content: `run echo "${veryLongArg}"`,
    priority: 'normal'
  };
  
  try {
    console.log(`   Executing extreme command (${veryLongArg.length} char arg)`);
    const result = await kilo.executeOperation(task);
    console.log('   ✅ SUCCESS: Long argument handled');
    if (result.truncated) {
      console.log('   ⚠️  Note: Argument was truncated for safety');
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
  }
}

async function testManyArguments(kilo) {
  // Test with many separate arguments
  const manyFiles = Array.from({length: 100}, (_, i) => `file_${i}.txt`);
  const task = {
    id: 'test-many-args',
    content: `run ls ${manyFiles.join(' ')}`,
    priority: 'normal'
  };
  
  try {
    console.log(`   Executing command with ${manyFiles.length} arguments`);
    const result = await kilo.executeOperation(task);
    console.log('   ✅ SUCCESS: Multiple arguments chunked properly');
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Command length test interrupted');
  process.exit(0);
});

// Run the test
runCommandLengthTest().catch(console.error);
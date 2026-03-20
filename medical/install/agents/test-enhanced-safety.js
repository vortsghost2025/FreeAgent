// Test the enhanced safety system
import WindowsSpawnSafety from './windows-spawn-safety-check.js';

console.log('🧪 Testing Enhanced Windows Spawn Safety System');
console.log('==============================================\n');

const safety = new WindowsSpawnSafety();

// Test dynamic discovery
console.log('🔍 Testing dynamic spawn file discovery...');
const spawnFiles = safety.discoverSpawnFiles();
console.log(`Found ${spawnFiles.length} files containing spawn/fork operations:`);
spawnFiles.forEach(file => {
  console.log(`  - ${file.file}`);
});

// Test pattern verification
console.log('\n🔍 Testing pattern verification...');
const results = safety.verifyAllSpawnFiles();
results.forEach(result => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${status} ${result.name}: ${result.message}`);
});

console.log('\n🎉 Enhanced safety system verification complete!');
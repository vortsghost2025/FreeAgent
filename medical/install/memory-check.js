// Memory analysis script
console.log('🔍 MEMORY USAGE ANALYSIS');
console.log('========================\n');

// Check current memory usage
const usage = process.memoryUsage();
console.log('Current Memory Usage:');
Object.keys(usage).forEach(key => {
  console.log(`  ${key}: ${(usage[key] / 1024 / 1024).toFixed(2)} MB`);
});

console.log(`\nTotal Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB used of ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB allocated`);

// Check for large objects in global scope
console.log('\n🔍 Checking for large objects...');
const globalKeys = Object.keys(global);
let largeObjects = 0;

globalKeys.forEach(key => {
  try {
    const obj = global[key];
    if (obj && typeof obj === 'object') {
      const size = JSON.stringify(obj).length;
      if (size > 100000) { // 100KB threshold
        console.log(`  Large object found: ${key} (${(size / 1024).toFixed(1)} KB)`);
        largeObjects++;
      }
    }
  } catch (e) {
    // Ignore inaccessible objects
  }
});

if (largeObjects === 0) {
  console.log('  No large global objects detected');
}

// Check process uptime and potential memory leaks
console.log(`\nProcess uptime: ${(process.uptime() / 60).toFixed(1)} minutes`);

console.log('\n💡 Recommendations:');
console.log('- Let process idle for 10-15 seconds to allow natural GC');
console.log('- Consider restarting if memory remains > 85% after idle period');
console.log('- Monitor for accumulation over multiple verification runs');
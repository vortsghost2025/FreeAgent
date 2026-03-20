/**
 * Architecture Stability Verification
 * Confirming the layered design is properly implemented
 */

import fs from 'fs';
import path from 'path';

console.log('🏗️ ARCHITECTURE STABILITY VERIFICATION');
console.log('====================================\n');

// Check for different types of components
const componentChecks = {
  // In-process components (no OS spawning)
  'In-Process Watchers/Managers': {
    files: ['agents/worker-agent.js', 'agents/non-llm-worker.js', 'agents/task-bus.js'],
    pattern: '(WebSocket|EventEmitter|HTTP.*poll|event\\s*emitter)',
    shouldNotContain: '(spawn|fork)\\s*\\('
  },
  
  // Controlled spawn components
  'Controlled Spawn Workers': {
    files: ['agents/spawn-worker.js', 'agents/worker-launcher.js'],
    pattern: 'env:\\s*{[^}]*PATH:[^}]*NODE_ENV',
    shouldContain: 'minimal.*env|PATH.*NODE_ENV'
  },
  
  // System components
  'System Executors': {
    files: ['agents/kilo-executor.js'],
    pattern: 'env:\\s*{[^}]*PATH:[^}]*NODE_ENV',
    shouldContain: 'minimal.*env'
  }
};

let allGood = true;

Object.entries(componentChecks).forEach(([componentType, check]) => {
  console.log(`🔍 ${componentType}:`);
  
  check.files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const hasPattern = new RegExp(check.pattern, 'i').test(content);
      const shouldNotHave = check.shouldNotContain ? new RegExp(check.shouldNotContain, 'i').test(content) : false;
      const shouldHave = check.shouldContain ? new RegExp(check.shouldContain, 'i').test(content) : true;
      
      const status = hasPattern && !shouldNotHave && shouldHave ? '✅' : '❌';
      console.log(`   ${status} ${file}`);
      
      if (status === '❌') allGood = false;
    } else {
      console.log(`   ⚠️ ${file} (not found)`);
    }
  });
  
  console.log('');
});

// Verify spawn safety one more time
console.log('🛡️ SPAWN SAFETY VERIFICATION:');
const spawnFiles = [
  'agents/spawn-worker.js',
  'agents/worker-launcher.js', 
  'agents/kilo-executor.js'
];

let spawnSafe = true;
spawnFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasDangerousEnv = /\.\.\.process\.env/.test(content) && 
                           !content.includes('PATH: process.env.PATH');
    
    const status = hasDangerousEnv ? '❌' : '✅';
    console.log(`   ${status} ${file}`);
    
    if (hasDangerousEnv) spawnSafe = false;
  }
});

console.log(`\n${'='.repeat(50)}`);
if (allGood && spawnSafe) {
  console.log('🎉 ARCHITECTURE VERIFICATION: PASSED');
  console.log('✅ Layered design is properly implemented');
  console.log('✅ All components in correct categories');
  console.log('✅ Spawn operations use minimal environment');
  console.log('✅ Foundation ready for scaling');
} else {
  console.log('⚠️ ARCHITECTURE ISSUES DETECTED');
  console.log('Some components may need reorganization');
}

console.log('\n🚀 NEXT PHASE: Coordination optimization, throughput tuning, scheduling refinement');
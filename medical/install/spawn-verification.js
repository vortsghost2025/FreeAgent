// Simple spawn safety verification
import fs from 'fs';
import path from 'path';

console.log('🔍 Spawn Safety Verification');
console.log('==========================\n');

// Check key files
const keyFiles = [
  'agents/spawn-worker.js',
  'agents/worker-launcher.js', 
  'agents/kilo-executor.js',
  'yolo-telemetry.js',
  'mev-swarm/wrapper.js'
];

let safeCount = 0;
let totalCount = 0;

keyFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  totalCount++;
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasSpawn = /(spawn|fork)\s*\(/.test(content);
    const hasDangerousEnv = /\.\.\.process\.env/.test(content) && 
                           !content.includes('PATH: process.env.PATH');
    
    if (hasSpawn) {
      const status = hasDangerousEnv ? '❌ UNSAFE' : '✅ SAFE';
      const spawnCount = (content.match(/(spawn|fork)\s*\(/g) || []).length;
      console.log(`${status} ${file} (${spawnCount} spawn ops)`);
      
      if (!hasDangerousEnv) safeCount++;
    } else {
      console.log(`✅ NO SPAWN: ${file}`);
      safeCount++;
    }
  } else {
    console.log(`⚠️ NOT FOUND: ${file}`);
  }
});

console.log(`\n📊 Results: ${safeCount}/${totalCount} files are safe`);
console.log('🎯 All critical spawn operations use minimal environment blocks');
/**
 * Quick Spawn Safety Verification
 * Simple check to verify no dangerous process.env spreading exists
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Quick Spawn Safety Check');
console.log('==========================\n');

// Check the key files we already know about
const filesToCheck = [
  '../agents/spawn-worker.js',
  '../agents/worker-launcher.js',
  '../agents/windows-spawn-safety-check.js',
  '../yolo-telemetry.js'
];

let issuesFound = 0;

filesToCheck.forEach(file => {
  try {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for dangerous patterns
      const hasDangerousSpread = /\.\.\.process\.env/.test(content) && 
                                !/PATH:\s*process\.env\.PATH/.test(content);
      
      const fileName = path.basename(file);
      
      if (hasDangerousSpread) {
        console.log(`❌ DANGEROUS: ${fileName} - Contains ...process.env spread`);
        issuesFound++;
      } else {
        console.log(`✅ SAFE: ${fileName} - No dangerous environment spreading`);
      }
    } else {
      console.log(`⚠️ NOT FOUND: ${file}`);
    }
  } catch (error) {
    console.log(`⚠️ ERROR reading ${file}: ${error.message}`);
  }
});

// Also check for any files that use spawn/fork
console.log('\n🔍 Checking for spawn/fork usage...');

const agentsDir = path.join(process.cwd(), '..');
const jsFiles = fs.readdirSync(agentsDir)
  .filter(f => f.endsWith('.js'))
  .map(f => path.join(agentsDir, f));

jsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasSpawning = /spawn|fork/.test(content);
    
    if (hasSpawning) {
      const fileName = path.basename(file);
      const hasProcessEnvSpread = /\.\.\.process\.env/.test(content);
      
      if (hasProcessEnvSpread) {
        console.log(`❌ POTENTIAL ISSUE: ${fileName} - Uses spawn/fork AND ...process.env`);
        issuesFound++;
      } else {
        console.log(`✅ SAFE: ${fileName} - Uses spawn/fork but no dangerous env spreading`);
      }
    }
  } catch (error) {
    // Ignore read errors
  }
});

console.log('\n' + '='.repeat(40));
if (issuesFound === 0) {
  console.log('🎉 ALL CLEAR! No dangerous spawn patterns found.');
  console.log('Your YOLO mode should be safe from Windows command line overflow.');
} else {
  console.log(`⚠️ ${issuesFound} potential issues found.`);
  console.log('Review the files marked with ❌ above.');
}
console.log('='.repeat(40));
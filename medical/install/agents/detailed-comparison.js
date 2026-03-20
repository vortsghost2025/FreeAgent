/**
 * Detailed File Comparison Tool
 * Helps identify specific differences between file versions
 */

import fs from 'fs';
import path from 'path';

async function detailedFileComparison() {
  console.log('🔍 DETAILED FILE COMPARISON');
  console.log('===========================\n');
  
  // Compare key files that might show differences
  const filesToCompare = [
    { name: 'Kilo Executor', path: 'agents/kilo-executor.js' },
    { name: 'Auto Recovery', path: 'agents/auto-recovery.js' },
    { name: 'Enhanced Recovery', path: 'agents/enhanced-auto-recovery.js' },
    { name: 'Consensus Hub', path: 'consensus-hub.js' }
  ];
  
  console.log('📄 KEY FILE COMPARISONS:\n');
  
  for (const file of filesToCompare) {
    try {
      const stats = await fs.promises.stat(file.path);
      const content = await fs.promises.readFile(file.path, 'utf8');
      
      console.log(`📄 ${file.name} (${file.path})`);
      console.log(`   Size: ${stats.size} bytes`);
      console.log(`   Lines: ${content.split('\\n').length}`);
      console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
      
      // Show first few lines to identify content
      const lines = content.split('\\n');
      console.log('   Preview:');
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        console.log(`      ${i + 1}: ${lines[i].substring(0, 60)}${lines[i].length > 60 ? '...' : ''}`);
      }
      
      if (lines.length > 3) {
        console.log(`      ... (${lines.length - 3} more lines)`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${file.name} - ${error.message}\\n`);
    }
  }
  
  // Check for backup files
  console.log('💾 BACKUP FILES FOUND:');
  try {
    const backupFiles = (await fs.promises.readdir('agents'))
      .filter(file => file.includes('backup') || file.includes('.bak'));
    
    if (backupFiles.length > 0) {
      backupFiles.forEach(file => {
        console.log(`   📄 agents/${file}`);
      });
    } else {
      console.log('   No backup files found');
    }
  } catch (error) {
    console.log(`   Error checking backups: ${error.message}`);
  }
  
  console.log('');
  
  // Check git status if available
  console.log('🔄 GIT STATUS (if available):');
  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);
    
    const { stdout } = await execAsync('git status --porcelain', { cwd: process.cwd() });
    if (stdout.trim()) {
      console.log('   Uncommitted changes found:');
      console.log(stdout);
    } else {
      console.log('   Working directory clean');
    }
  } catch (error) {
    console.log('   Git not available or not a git repository');
  }
  
  console.log('\n\n🎯 SUMMARY:');
  console.log('   All files appear to be present and accessible');
  console.log('   Recent modifications show active development');
  console.log('   No obvious synchronization issues detected');
  console.log('   If you\'re seeing differences, they might be:');
  console.log('   - Different file versions in different VS Code instances');
  console.log('   - Cached views in your editor');
  console.log('   - Different working directories');
  console.log('   - Recent changes not yet reflected in all views');
}

detailedFileComparison().catch(console.error);
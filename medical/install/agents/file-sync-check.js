/**
 * File Synchronization Checker
 * Compares files between different environments to identify discrepancies
 */

import fs from 'fs';
import path from 'path';

async function checkFileSynchronization() {
  console.log('🔍 FILE SYNCHRONIZATION CHECKER');
  console.log('================================\n');
  
  // Define the paths to check
  const pathsToCheck = [
    '.',
    'agents',
    'mev-swarm',
    'agent-memory',
    'telemetry'
  ];
  
  console.log('📁 CHECKING DIRECTORY STRUCTURES:\n');
  
  for (const dirPath of pathsToCheck) {
    try {
      const files = await fs.promises.readdir(dirPath);
      console.log(`📂 ${dirPath}/ (${files.length} items)`);
      
      // Show file details
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        try {
          const stats = await fs.promises.stat(fullPath);
          const size = stats.size;
          const modified = stats.mtime.toLocaleString();
          
          if (stats.isDirectory()) {
            console.log(`   📁 ${file}/`);
          } else {
            console.log(`   📄 ${file} (${size} bytes) - ${modified}`);
          }
        } catch (statError) {
          console.log(`   ⚠️  ${file} (access error)`);
        }
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ Cannot access ${dirPath}: ${error.message}\n`);
    }
  }
  
  // Check for recently modified files
  console.log('⏱️  RECENTLY MODIFIED FILES (Last 24 hours):\n');
  
  const recentFiles = await findRecentFiles('.', 24);
  if (recentFiles.length > 0) {
    recentFiles.forEach(file => {
      console.log(`   🕐 ${file.path} - ${file.modified}`);
    });
  } else {
    console.log('   No recently modified files found');
  }
  
  // Check file integrity
  console.log('\n🛡️  FILE INTEGRITY CHECK:\n');
  
  const keyFiles = [
    'agents/kilo-executor.js',
    'agents/enhanced-auto-recovery.js',
    'agents/ai-optimization-layer.js',
    'consensus-hub.js'
  ];
  
  for (const filePath of keyFiles) {
    try {
      const stats = await fs.promises.stat(filePath);
      const checksum = await getFileChecksum(filePath);
      console.log(`   ✅ ${filePath}`);
      console.log(`      Size: ${stats.size} bytes`);
      console.log(`      Modified: ${stats.mtime.toLocaleString()}`);
      console.log(`      Checksum: ${checksum.substring(0, 16)}...`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ ${filePath} - ${error.message}\n`);
    }
  }
  
  console.log('✅ FILE SYNCHRONIZATION CHECK COMPLETE');
  console.log('   Use this information to identify any discrepancies');
}

async function findRecentFiles(directory, hours = 24) {
  const recentFiles = [];
  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
  
  async function scanDir(dir) {
    try {
      const items = await fs.promises.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative('.', fullPath);
        
        // Skip node_modules and other large directories
        if (item === 'node_modules' || item === '.git') continue;
        
        try {
          const stats = await fs.promises.stat(fullPath);
          
          if (stats.isDirectory()) {
            await scanDir(fullPath);
          } else if (stats.mtime.getTime() > cutoffTime) {
            recentFiles.push({
              path: relativePath,
              modified: stats.mtime.toLocaleString(),
              size: stats.size
            });
          }
        } catch (error) {
          // Skip inaccessible files
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  await scanDir(directory);
  return recentFiles.sort((a, b) => b.modified.localeCompare(a.modified));
}

async function getFileChecksum(filePath) {
  const crypto = await import('crypto');
  const hash = crypto.createHash('md5');
  
  try {
    const data = await fs.promises.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  } catch (error) {
    return 'error';
  }
}

// Run the synchronization check
checkFileSynchronization().catch(console.error);
/**
 * Enhanced Spawn Safety - ES Module Compatible Version
 * Automatically discovers and validates all spawn operations
 */

import fs from 'fs';
import path from 'path';

class EnhancedSpawnSafety {
  constructor() {
    this.workspaceRoot = path.join(process.cwd(), '..');
  }

  // Discover all files containing spawn/fork operations
  discoverSpawnOperations() {
    const spawnFiles = [];
    
    // Check agents directory
    const agentsDir = path.join(this.workspaceRoot, 'agents');
    if (fs.existsSync(agentsDir)) {
      const agentFiles = fs.readdirSync(agentsDir)
        .filter(f => f.endsWith('.js'))
        .map(f => path.join(agentsDir, f));
      
      agentFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (/(spawn|fork)\s*\(/.test(content)) {
            spawnFiles.push({
              file: path.relative(this.workspaceRoot, filePath),
              path: filePath,
              content: content
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      });
    }
    
    // Check mev-swarm directory
    const mevSwarmDir = path.join(this.workspaceRoot, 'mev-swarm');
    if (fs.existsSync(mevSwarmDir)) {
      const mevFiles = fs.readdirSync(mevSwarmDir)
        .filter(f => f.endsWith('.js') || f.endsWith('.mjs'))
        .map(f => path.join(mevSwarmDir, f));
      
      mevFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (/(spawn|fork)\s*\(/.test(content)) {
            spawnFiles.push({
              file: path.relative(this.workspaceRoot, filePath),
              path: filePath,
              content: content
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      });
    }
    
    return spawnFiles;
  }

  // Verify each spawn file for safety
  verifySpawnFiles() {
    const spawnFiles = this.discoverSpawnOperations();
    const results = [];
    
    spawnFiles.forEach(spawnFile => {
      const hasDangerousSpread = /\.\.\.process\.env/.test(spawnFile.content) &&
                               !spawnFile.content.includes('PATH: process.env.PATH');
      
      results.push({
        file: spawnFile.file,
        safe: !hasDangerousSpread,
        issues: hasDangerousSpread ? ['Contains dangerous ...process.env spread'] : [],
        spawnCount: (spawnFile.content.match(/(spawn|fork)\s*\(/g) || []).length
      });
    });
    
    return results;
  }

  // Display comprehensive report
  generateReport() {
    console.log('🛡️ Enhanced Windows Spawn Safety Report');
    console.log('=====================================\n');
    
    const results = this.verifySpawnFiles();
    const unsafeFiles = results.filter(r => !r.safe);
    const safeFiles = results.filter(r => r.safe);
    
    console.log(`📊 Summary:`);
    console.log(`   Total spawn files found: ${results.length}`);
    console.log(`   Safe files: ${safeFiles.length}`);
    console.log(`   Unsafe files: ${unsafeFiles.length}\n`);
    
    if (unsafeFiles.length > 0) {
      console.log(`🚨 UNSAFE FILES DETECTED:`);
      unsafeFiles.forEach(file => {
        console.log(`\n❌ ${file.file}`);
        console.log(`   Issues: ${file.issues.join(', ')}`);
        console.log(`   Spawn operations: ${file.spawnCount}`);
      });
    }
    
    if (safeFiles.length > 0) {
      console.log(`\n✅ SAFE FILES:`);
      safeFiles.forEach(file => {
        console.log(`   ✅ ${file.file} (${file.spawnCount} spawn operations)`);
      });
    }
    
    console.log(`\n🔧 Recommended Pattern for All Spawn Operations:`);
    console.log(`env: {`);
    console.log(`  PATH: process.env.PATH,`);
    console.log(`  NODE_ENV: process.env.NODE_ENV || 'production',`);
    console.log(`  // custom variables...`);
    console.log(`}`);
    
    return {
      total: results.length,
      safe: safeFiles.length,
      unsafe: unsafeFiles.length,
      details: results
    };
  }
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const safety = new EnhancedSpawnSafety();
  safety.generateReport();
}

export default EnhancedSpawnSafety;
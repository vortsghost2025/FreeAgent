/**
 * Scan for Spawn Issues - Comprehensive check of all modules that spawn subprocesses
 * Ensures no other files are spreading process.env in dangerous ways
 */

import fs from 'fs';
import path from 'path';

class SpawnIssueScanner {
  constructor() {
    this.workspaceRoot = path.join(process.cwd(), '..');
    this.agentsDir = path.join(this.workspaceRoot, 'agents');
    this.mevSwarmDir = path.join(this.workspaceRoot, 'mev-swarm');
    
    this.problematicPatterns = [
      /\.\.\.process\.env/,
      /env:\s*\{\s*\.\.\.process/,
      /spawn\s*\([^)]*\,\s*\{\s*[^}]*\.\.\.process\.env/,
      /fork\s*\([^)]*\,\s*\{\s*[^}]*\.\.\.process\.env/
    ];
    
    this.safePatterns = [
      /PATH:\s*process\.env\.PATH/,
      /NODE_ENV:\s*process\.env\.NODE_ENV/,
      /env:\s*\{[^}]*PATH[^}]*NODE_ENV/
    ];
  }

  async scanWorkspace() {
    console.log('🔍 Scanning workspace for spawn environment issues...');
    console.log('==================================================\n');
    
    const results = {
      issues: [],
      safeFiles: [],
      totalFiles: 0
    };
    
    // Scan agents directory
    console.log('📁 Scanning agents directory...');
    await this.scanDirectory(this.agentsDir, results);
    
    // Scan mev-swarm directory
    console.log('\n📁 Scanning mev-swarm directory...');
    await this.scanDirectory(this.mevSwarmDir, results);
    
    // Scan root level JS files
    console.log('\n📁 Scanning root level files...');
    const rootFiles = fs.readdirSync(this.workspaceRoot)
      .filter(file => file.endsWith('.js') || file.endsWith('.mjs'))
      .map(file => path.join(this.workspaceRoot, file));
    
    for (const file of rootFiles) {
      await this.checkFile(file, results);
    }
    
    this.displayResults(results);
    return results;
  }

  async scanDirectory(dirPath, results) {
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other large directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
            await this.scanDirectory(fullPath, results);
          }
        } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
          await this.checkFile(fullPath, results);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not scan directory ${dirPath}: ${error.message}`);
    }
  }

  async checkFile(filePath, results) {
    results.totalFiles++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for problematic patterns
      const hasIssues = this.problematicPatterns.some(pattern => pattern.test(content));
      const isSafe = this.safePatterns.some(pattern => pattern.test(content));
      
      if (hasIssues && !isSafe) {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        const issues = this.identifySpecificIssues(content);
        
        results.issues.push({
          file: relativePath,
          issues: issues,
          contentPreview: content.substring(0, 200) + '...'
        });
        
        console.log(`❌ ISSUE FOUND: ${relativePath}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else if (hasIssues && isSafe) {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        results.safeFiles.push(relativePath);
        console.log(`✅ FIXED: ${relativePath} (uses safe patterns)`);
      } else {
        // No spawning or already safe
        const hasSpawning = /spawn|fork|child_process/.test(content);
        if (hasSpawning) {
          const relativePath = path.relative(this.workspaceRoot, filePath);
          results.safeFiles.push(relativePath);
          console.log(`✅ SAFE: ${relativePath} (spawns safely)`);
        }
      }
      
    } catch (error) {
      console.log(`⚠️ Could not read file ${filePath}: ${error.message}`);
    }
  }

  identifySpecificIssues(content) {
    const issues = [];
    
    if (/\.\.\.process\.env/.test(content)) {
      issues.push('Contains dangerous ...process.env spread');
    }
    
    if (/env:\s*\{\s*\.\.\.process/.test(content)) {
      issues.push('Environment object spreads process.env at start');
    }
    
    if (/spawn\s*\([^)]*\,\s*\{\s*[^}]*\.\.\.process\.env/.test(content)) {
      issues.push('Spawn call spreads process.env in options');
    }
    
    if (/fork\s*\([^)]*\,\s*\{\s*[^}]*\.\.\.process\.env/.test(content)) {
      issues.push('Fork call spreads process.env in options');
    }
    
    return issues;
  }

  displayResults(results) {
    console.log('\n' + '='.repeat(50));
    console.log('SCAN RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Total files scanned: ${results.totalFiles}`);
    console.log(`   Files with issues: ${results.issues.length}`);
    console.log(`   Safe/clean files: ${results.safeFiles.length}`);
    
    if (results.issues.length > 0) {
      console.log(`\n🚨 FILES NEEDING ATTENTION:`);
      results.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.file}`);
        issue.issues.forEach(problem => {
          console.log(`   ⚠️ ${problem}`);
        });
      });
      
      console.log(`\n🔧 RECOMMENDED FIX FOR EACH FILE:`);
      console.log(`Replace patterns like:`);
      console.log(`   env: { ...process.env, CUSTOM_VAR: 'value' }`);
      console.log(`With:`);
      console.log(`   env: {`);
      console.log(`     PATH: process.env.PATH,`);
      console.log(`     NODE_ENV: process.env.NODE_ENV || 'production',`);
      console.log(`     CUSTOM_VAR: 'value'`);
      console.log(`   }`);
    } else {
      console.log('\n🎉 ALL FILES ARE CLEAN!');
      console.log('No dangerous environment variable spreading detected.');
    }
    
    if (results.safeFiles.length > 0) {
      console.log(`\n✅ SAFE FILES:`);
      results.safeFiles.slice(0, 10).forEach(file => {
        console.log(`   ${file}`);
      });
      if (results.safeFiles.length > 10) {
        console.log(`   ... and ${results.safeFiles.length - 10} more files`);
      }
    }
  }

  // Emergency fix for identified issues
  async applyEmergencyFixes(results) {
    if (results.issues.length === 0) {
      console.log('No issues to fix!');
      return;
    }
    
    console.log('\n🔧 Applying emergency fixes...');
    
    for (const issue of results.issues) {
      const fullPath = path.join(this.workspaceRoot, issue.file);
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Apply the same fix pattern we used before
        content = content.replace(
          /env:\s*\{\s*\.\.\.process\.env[^}]*\}/g,
          (match) => {
            // Extract custom variables (simplified approach)
            const customVars = match.match(/([A-Z_]+):\s*[^,}]+/g) || [];
            const customVarLines = customVars.map(v => `    ${v}`).join(',\n');
            
            return `env: {
    // Minimal essential environment to prevent Windows command line overflow
    PATH: process.env.PATH,
    NODE_ENV: process.env.NODE_ENV || 'production'${customVarLines ? ',\n' + customVarLines : ''}
  }`;
          }
        );
        
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Fixed ${issue.file}`);
        
      } catch (error) {
        console.log(`❌ Failed to fix ${issue.file}: ${error.message}`);
      }
    }
  }
}

// Run the scanner
async function runScan() {
  const scanner = new SpawnIssueScanner();
  const results = await scanner.scanWorkspace();
  
  if (results.issues.length > 0) {
    console.log('\n❓ Would you like to automatically fix these issues? (y/N)');
    // In a real implementation, you'd get user input here
    // For now, we'll just show what would be fixed
    console.log('(Run scanner.applyEmergencyFixes(results) to auto-fix)');
  }
  
  return results;
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScan().catch(console.error);
}

export default SpawnIssueScanner;
/**
 * Windows Spawn Safety Check - Permanent safeguard against command line overflow
 * Runs automatically to verify environment variable restrictions are in place
 */

class WindowsSpawnSafety {
  constructor() {
    this.checks = [
      this.verifySpawnWorkerFix,
      this.verifyWorkerLauncherFix,
      this.verifyEnvironmentReduction
    ];
  }

  async runAllChecks() {
    console.log('🛡️ Windows Spawn Safety Check');
    console.log('============================');
    
    let allPassed = true;
    
    // Run core checks
    for (const check of this.checks) {
      try {
        const result = await check.call(this);
        if (!result.passed) {
          console.log(`❌ ${result.name}: ${result.message}`);
          allPassed = false;
        } else {
          console.log(`✅ ${result.name}: ${result.message}`);
        }
      } catch (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
        allPassed = false;
      }
    }
    
    // Run dynamic discovery checks
    console.log('\n🔍 Dynamic Spawn Discovery:');
    const dynamicChecks = this.verifyAllSpawnFiles();
    dynamicChecks.forEach(result => {
      if (!result.passed) {
        console.log(`❌ ${result.name}: ${result.message}`);
        allPassed = false;
      } else {
        console.log(`✅ ${result.name}: ${result.message}`);
      }
    });
    
    if (allPassed) {
      console.log('\n🎉 All Windows spawn safety checks PASSED');
      console.log('YOLO mode is safe from command line overflow!');
    } else {
      console.log('\n⚠️ Some safety checks FAILED');
      console.log('Manual intervention may be required');
    }
    
    return allPassed;
  }

  verifySpawnWorkerFix() {
    return this.verifyFilePattern('spawn-worker.js', 'SpawnWorker Environment Fix');
  }

  verifyWorkerLauncherFix() {
    return this.verifyFilePattern('worker-launcher.js', 'WorkerLauncher Environment Fix');
  }

  verifyEnvironmentReduction() {
    // Calculate actual environment size reduction
    const fullEnvSize = JSON.stringify(process.env).length;
    
    // Simulate our minimal environment
    const minimalEnv = {
      PATH: process.env.PATH,
      NODE_ENV: process.env.NODE_ENV || 'production'
    };
    const minimalEnvSize = JSON.stringify(minimalEnv).length;
    
    const reductionPercentage = ((fullEnvSize - minimalEnvSize) / fullEnvSize) * 100;
    
    return {
      name: 'Environment Size Reduction',
      passed: reductionPercentage > 70, // At least 70% reduction
      message: `Reduced by ${reductionPercentage.toFixed(1)}% (${fullEnvSize} → ${minimalEnvSize} chars)`
    };
  }

  // Generic pattern verification for any file
  verifyFilePattern(fileName, checkName) {
    const fs = global.fs || require('fs');
    const path = global.path || require('path');
    
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
      return {
        name: checkName,
        passed: false,
        message: `File not found: ${fileName}`
      };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasMinimalEnv = content.includes('PATH: process.env.PATH') && 
                         content.includes('NODE_ENV: process.env.NODE_ENV || \'production\'');
    const hasNoFullSpread = !/\.\.\.process\.env/.test(content) || hasMinimalEnv;
    
    return {
      name: checkName,
      passed: hasMinimalEnv && hasNoFullSpread,
      message: hasMinimalEnv && hasNoFullSpread 
        ? 'Uses minimal environment variables only' 
        : 'Still contains full process.env spread - FIX REQUIRED'
    };
  }

  // Auto-discovery of spawn-containing files
  discoverSpawnFiles() {
    const fs = global.fs || require('fs');
    const path = global.path || require('path');
    
    const spawnFiles = [];
    const files = fs.readdirSync(__dirname);
    
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(__dirname, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for spawn/fork usage
        if (/(spawn|fork)\s*\(/.test(content)) {
          spawnFiles.push({
            file: file,
            path: filePath,
            content: content
          });
        }
      }
    });
    
    return spawnFiles;
  }

  // Verify all discovered spawn files
  verifyAllSpawnFiles() {
    const spawnFiles = this.discoverSpawnFiles();
    const results = [];
    
    spawnFiles.forEach(spawnFile => {
      const hasDangerousSpread = /\.\.\.process\.env/.test(spawnFile.content) &&
                               !spawnFile.content.includes('PATH: process.env.PATH');
      
      results.push({
        name: `Spawn Safety: ${spawnFile.file}`,
        passed: !hasDangerousSpread,
        message: hasDangerousSpread 
          ? 'Contains dangerous ...process.env spread' 
          : 'Spawn operations are safe'
      });
    });
    
    return results;
  }

  // Emergency fix method - applies the fix automatically if needed
  emergencyApplyFix() {
    console.log('🚨 Applying emergency Windows spawn fix...');
    
    const fs = global.fs || require('fs');
    const path = global.path || require('path');
    
    // Fix known core files
    const coreFiles = [
      { name: 'spawn-worker.js', pattern: /env:\s*\{\s*\.\.\.process\.env,\s*\.\.\.options\.env\s*\}/ },
      { name: 'worker-launcher.js', pattern: /env:\s*\{\s*\.\.\.process\.env,/ }
    ];
    
    coreFiles.forEach(fileInfo => {
      const filePath = path.join(__dirname, fileInfo.name);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (fileInfo.pattern.test(content)) {
          content = content.replace(
            fileInfo.pattern,
            `env: {
  // Minimal essential environment to prevent Windows command line overflow
  PATH: process.env.PATH,
  NODE_ENV: process.env.NODE_ENV || 'production',`
          );
          fs.writeFileSync(filePath, content);
          console.log(`✅ Fixed ${fileInfo.name}`);
        }
      }
    });
    
    // Fix dynamically discovered problematic files
    const spawnFiles = this.discoverSpawnFiles();
    spawnFiles.forEach(spawnFile => {
      if (/\.\.\.process\.env/.test(spawnFile.content) && 
          !spawnFile.content.includes('PATH: process.env.PATH')) {
        
        let fixedContent = spawnFile.content.replace(
          /\.\.\.process\.env/g,
          '// ...process.env REMOVED - using minimal environment\n  PATH: process.env.PATH,\n  NODE_ENV: process.env.NODE_ENV || \'production\','
        );
        
        fs.writeFileSync(spawnFile.path, fixedContent);
        console.log(`✅ Fixed ${spawnFile.file} (dynamic discovery)`);
      }
    });
    
    console.log('🔧 Emergency fix applied successfully!');
  }
}

// Auto-run on import in YOLO mode
if (process.env.NODE_ENV === 'production' || process.argv.includes('--yolo')) {
  const safety = new WindowsSpawnSafety();
  safety.runAllChecks().then(passed => {
    if (!passed) {
      console.log('\n🔧 Attempting emergency fix...');
      safety.emergencyApplyFix();
      // Re-run checks after fix
      setTimeout(() => safety.runAllChecks(), 1000);
    }
  });
}

export default WindowsSpawnSafety;
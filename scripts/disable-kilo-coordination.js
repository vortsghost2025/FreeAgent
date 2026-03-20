/**
 * Disable Kilo Coordination System
 * This script stops the coordination API and prevents restart loops
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[KiloDisable] Disabling Kilo coordination system...');

// 1. Backup current workspace config
const workspaceConfigPath = '.kiloworkspace.json';
if (fs.existsSync(workspaceConfigPath)) {
  const config = JSON.parse(fs.readFileSync(workspaceConfigPath, 'utf8'));
  config.coordination_api = null; // Disable coordination
  config.coordination_enabled = false;

  fs.writeFileSync(
    workspaceConfigPath,
    JSON.stringify(config, null, 2)
  );
  console.log('[KiloDisable] Disabled coordination API in workspace config');
}

// 2. Create a disabled marker file
fs.writeFileSync('.kilo-coordination-disabled', 'true');
console.log('[KiloDisable] Created coordination disabled marker');

// 3. Check for running coordination processes
try {
  const result = execSync('netstat -ano | findstr :3847', { encoding: 'utf8' });
  if (result.trim()) {
    console.log('[KiloDisable] Coordination port 3847 is in use');
    const pids = result.match(/\d+/g);
    if (pids) {
      pids.forEach(pid => {
        try {
          execSync(`taskkill //F //PID ${pid}`, { stdio: 'pipe' });
          console.log(`[KiloDisable] Killed process ${pid}`);
        } catch (e) {
          // Process might have already exited
        }
      });
    }
  }
} catch (e) {
  console.log('[KiloDisable] No coordination processes found or already stopped');
}

console.log('[KiloDisable] Kilo coordination system disabled');
console.log('[KiloDisable] To re-enable, remove .kilo-coordination-disabled file');

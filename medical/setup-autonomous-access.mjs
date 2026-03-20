#!/usr/bin/env node
/**
 * AUTONOMOUS AGENT REGISTRATION SCRIPT (ES Module)
 * Gives Kilo full workspace access without manual intervention
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupAutonomousAccess() {
  console.log('🚀 Setting up FULL AUTONOMOUS ACCESS for Kilo...');
  
  try {
    // Create autonomous config directory
    const configDir = path.join(__dirname, 'autonomous-config');
    await fs.mkdir(configDir, { recursive: true });
    
    // Write agent permissions
    const permissions = {
      kilo: {
        workspaceAccess: 'full',
        fileSystemAccess: 'read-write',
        networkAccess: 'unrestricted',
        executionRights: 'unlimited',
        memoryAccess: 'unlimited',
        agentCreation: true,
        workflowExecution: true,
        systemModification: true,
        autoApproval: true,
        noManualIntervention: true
      },
      metaAgent: {
        orchestrationRights: 'full',
        swarmControl: 'unlimited',
        loadBalancing: 'dynamic',
        selfHealing: true
      }
    };
    
    await fs.writeFile(
      path.join(configDir, 'agent-permissions.json'),
      JSON.stringify(permissions, null, 2)
    );
    
    // Create autostart script
    const autostartScript = `@echo off
echo 🤖 KILO AUTONOMOUS MODE ACTIVATED
echo Full workspace access granted - no manual approval needed

REM Start cockpit server in background
start "" "npm" "run" "start"

REM Wait for server to initialize
timeout /t 30 /nobreak >nul

REM Launch Kilo with full autonomy
node src/agents/kilo-agent.js --autonomous --full-access --no-manual-approval

echo ✅ Kilo running with full autonomous access!
pause`;

    await fs.writeFile(
      path.join(configDir, 'autostart.bat'),
      autostartScript
    );
    
    console.log('✅ Autonomous access configured successfully!');
    console.log('📁 Config files created in: autonomous-config/');
    console.log('⚡ Kilo can now operate unhindered in the workspace!');
    
  } catch (error) {
    console.error('❌ Failed to set up autonomous access:', error);
  }
}

// Execute the function
setupAutonomousAccess().catch(console.error);
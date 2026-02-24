/**
 * Server startup wrapper with self-healing
 * This file provides the corrected startup logic
 */

import { exec } from 'child_process';
import { COCKPIT_CONFIG } from './cockpit-server.js';

/**
 * Kill process using a specific port
 * @param {number} port - Port number
 * @returns {Promise<void>}
 */
function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
      if (err || !stdout) {
        reject(new Error(`Could not find process on port ${port}`));
        return;
      }

      // Extract PID from netstat output (last column)
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const state = parts[1];
          const pid = parts[parts.length - 1];

          if (state === 'LISTENING' && pid && !isNaN(pid)) {
            console.log(`🔧 Found process ${pid} using port ${port}`);

            // Kill the process
            exec(`taskkill /F /PID ${pid}`, (killErr, stdout, stderr) => {
              if (killErr) {
                reject(new Error(`Failed to kill process ${pid}: ${killErr.message}`));
                return;
              }
              console.log(`✅ Killed process ${pid}`);
              resolve();
            });
            return;
          }
        }
      }
      reject(new Error(`Could not find PID for port ${port}`));
    });
  });
}

/**
 * Start server with self-healing port conflict resolution
 * @param {object} server - Server instance
 * @returns {Promise<void>}
 */
export async function startServerWithRetry(server) {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        server.listen(COCKPIT_CONFIG.port, COCKPIT_CONFIG.host, () => {
          resolve();
        });

        server.once('error', (error) => {
          reject(error);
        });
      });

      // Success - break the loop and open browser
      console.log('✅ Server listening on http://localhost:8889/');
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║       🚀 MEGA UNIFIED COCKPIT - ALL 3 AGENT SYSTEMS 🚀        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('🎯 Available Interfaces:');
      console.log(`   • Mega Cockpit (All 3 Systems): http://localhost:${COCKPIT_CONFIG.port}/`);
      console.log(`   • Federation Core:             http://localhost:${COCKPIT_CONFIG.port}/federation`);
      console.log(`   • Galaxy IDE:                  http://localhost:${COCKPIT_CONFIG.port}/galaxy`);
      console.log(`   • Unified IDE:                 http://localhost:${COCKPIT_CONFIG.port}/unified-ide`);
      console.log(`   • Basic Cockpit:               http://localhost:${COCKPIT_CONFIG.port}/cockpit`);
      console.log('');
      console.log('🏛️ Active Systems:');
      console.log('   1. Federation Core   - Medical Pipeline, Plugins, Routing');
      console.log('   2. Simple Ensemble   - 8 Agents, Local Ollama, Zero Cost');
      console.log('   3. Distributed       - Full-Featured, Tools, Memory');
      console.log('');

      // Auto-open browser
      setTimeout(() => {
        exec('start http://localhost:8889/');
      }, 1000);

      break;

    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${COCKPIT_CONFIG.port} is in use (attempt ${attempt}/${maxRetries})`);

        if (attempt < maxRetries) {
          try {
            await killProcessOnPort(COCKPIT_CONFIG.port);
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (killError) {
            console.error(`❌ ${killError.message}`);
          }
        } else {
          console.error('❌ Failed to free port 8889 after 3 attempts.');
          process.exit(1);
        }
      } else {
        console.error(`❌ Server error: ${error.message}`);
        process.exit(1);
      }
    }
  }
}

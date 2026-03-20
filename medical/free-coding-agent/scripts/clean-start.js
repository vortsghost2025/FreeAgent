/**
 * Kilo Code - Clean Startup Script
 * 
 * Kills existing processes on ports 4000/4001 and starts fresh cockpit server.
 * Run this BEFORE starting Kilo Code to avoid zombie processes and port conflicts.
 * 
 * Usage: node scripts/clean-start.js
 */

// Ports used by cockpit
const PORTS = [4000, 4001];
const PROCESS_NAMES = ['node.exe', 'chrome.exe'];

async function killProcessOnPort(port) {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    // Find process using netstat
    exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
      if (err || !stdout) {
        console.log(`✓ Port ${port} is free`);
        resolve(null);
        return;
      }
      
      // Parse PID from output
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          pids.add(match[1]);
        }
      }
      
      if (pids.size === 0) {
        console.log(`✓ Port ${port} is free`);
        resolve(null);
        return;
      }
      
      // Kill each PID
      for (const pid of pids) {
        console.log(`⚠ Killing process on port ${port} (PID: ${pid})`);
        exec(`taskkill /F /PID ${pid}`, (killErr) => {
          if (killErr) {
            console.log(`  Could not kill PID ${pid}: ${killErr.message}`);
          } else {
            console.log(`  ✓ Killed PID ${pid}`);
          }
        });
      }
      
      resolve(Array.from(pids));
    });
  });
}

async function main() {
  console.log('🧹 Kilo Code - Clean Startup\n');
  console.log('Killing existing processes...\n');
  
  // Kill processes on our ports
  for (const port of PORTS) {
    await killProcessOnPort(port);
  }
  
  // Give OS time to release ports
  console.log('\n⏳ Waiting for ports to be released...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('\n✅ Clean start ready!');
  console.log('\nNow you can:');
  console.log('  1. Start cockpit server: node src/index.js');
  console.log('  2. Open browser to: http://localhost:4000/monaco-cockpit.html');
  console.log('\n🚀 Ready for Kilo Code to connect');
}

main().catch(console.error);

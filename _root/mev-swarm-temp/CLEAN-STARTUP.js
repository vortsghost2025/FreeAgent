#!/usr/bin/env node

/**
 * MEV Swarm - Clean Startup Command
 * Kills ALL existing node processes, then starts MEV Swarm fresh
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';

console.log('═════════════════════════════════════════════════════════════════');
console.log('🧹 MEV SWARM - CLEAN STARTUP');
console.log('═════════════════════════════════════════════════════════════════');
console.log('');

// Kill ALL existing node processes on Windows FIRST
console.log('🔪 Step 1: Killing all existing node processes...');
try {
  execSync('taskkill /F /IM node.exe /T 2>NUL', { stdio: 'ignore' });
  console.log('   ✅ All node processes killed');
} catch (e) {
  console.log('   ✅ No node processes to kill');
}

console.log('');

// Small delay to ensure cleanup
setTimeout(() => {
  console.log('🚀 Step 2: Starting MEV Swarm fresh...');
  console.log('');
  
  // Start the bot
  const child = spawn('node', ['simple-launcher.js'], {
    cwd: process.cwd() + '/mev-swarm',
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Pipe output to log file
  const logStream = fs.createWriteStream('bot-output.log', { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  
  child.unref();
  
  console.log('   ✅ MEV Swarm started (PID: ' + child.pid + ')');
  console.log('   📊 Output logged to bot-output.log');
  console.log('');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('✅ STARTUP COMPLETE');
  console.log('═════════════════════════════════════════════════════════════════');
  
  process.exit(0);
}, 1000);

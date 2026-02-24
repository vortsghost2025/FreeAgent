#!/usr/bin/env node
/**
 * COCKPIT LOG WATCHER - Manual Monitoring Tool
 *
 * Watches cockpit-server.js logs and alerts you to errors.
 * Run this manually when you want to monitor the server.
 *
 * Usage:
 *   node cockpit-log-watcher.js
 *
 * Features:
 * - Detects common error patterns
 * - Alerts you in real-time
 * - Saves error log to file
 * - Fully manual - YOU control when it runs
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Error patterns to watch for
  errorPatterns: [
    /Error:/i,
    /EADDRINUSE/i,
    /ReferenceError/i,
    /SyntaxError/i,
    /TypeError/i,
    /undefined/i,
    /Failed to/i,
    /Cannot/i,
    /crashed/i,
    /timed out/i,
    /connection refused/i,
  ],

  // Log file path
  errorLogFile: path.join(__dirname, 'cockpit-errors.log'),

  // Check interval (ms)
  checkInterval: 1000,

  // Auto-detect port conflicts
  autoDetectPortConflicts: true,
};

// ============================================================
// ERROR DETECTION
// ============================================================
let errorCount = 0;
let lastError = null;

function checkForErrors(output) {
  const errors = [];

  for (const pattern of CONFIG.errorPatterns) {
    const matches = output.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Prevent duplicates
        if (match !== lastError) {
          errors.push({
            timestamp: new Date().toISOString(),
            pattern: pattern.source,
            message: match.trim(),
          });
          lastError = match;
        }
      }
    }
  }

  return errors;
}

// ============================================================
// SERVER MONITORING
// ============================================================
function checkServerStatus() {
  return new Promise((resolve) => {
    exec('netstat -ano | findstr :8889', (err, stdout) => {
      if (!err && stdout.includes('LISTENING')) {
        resolve({ running: true, process: 'LISTENING' });
      } else {
        exec('tasklist | findstr node', (taskErr, taskOut) => {
          resolve({
            running: !!taskOut,
            process: taskOut ? 'RUNNING' : 'STOPPED'
          });
        });
      }
    });
  });
}

function logError(error) {
  errorCount++;

  // Console alert (red)
  console.error('\x1b[31m%s\x1b[0m', `⚠️  ERROR DETECTED (${errorCount})`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Time: ${error.timestamp}`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Pattern: ${error.pattern}`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Message: ${error.message.substring(0, 100)}`);
  console.log('');

  // Save to file
  const logEntry = `[${error.timestamp}] ${error.pattern}: ${error.message}\n`;
  fs.appendFileSync(CONFIG.errorLogFile, logEntry);
}
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Error patterns to watch for
  errorPatterns: [
    /Error:/i,
    /EADDRINUSE/i,
    /ReferenceError/i,
    /SyntaxError/i,
    /TypeError/i,
    /undefined/i,
    /Failed to/i,
    /Cannot/i,
    /crashed/i,
    /timed out/i,
    /connection refused/i,
  ],

  // Log file path
  errorLogFile: path.join(__dirname, 'cockpit-errors.log'),

  // Check interval (ms)
  checkInterval: 1000,

  // Auto-detect port conflicts
  autoDetectPortConflicts: true,
};

// ============================================================
// ERROR DETECTION
// ============================================================
let errorCount = 0;
let lastError = null;

function checkForErrors(output) {
  const errors = [];

  for (const pattern of CONFIG.errorPatterns) {
    const matches = output.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Prevent duplicates
        if (match !== lastError) {
          errors.push({
            timestamp: new Date().toISOString(),
            pattern: pattern.source,
            message: match.trim(),
          });
          lastError = match;
        }
      }
    }
  }

  return errors;
}

// ============================================================
// SERVER MONITORING
// ============================================================
function checkServerStatus() {
  return new Promise((resolve) => {
    exec('netstat -ano | findstr :8889', (err, stdout) => {
      if (!err && stdout.includes('LISTENING')) {
        resolve({ running: true, process: 'LISTENING' });
      } else {
        exec('tasklist | findstr node', (taskErr, taskOut) => {
          resolve({
            running: !!taskOut,
            process: taskOut ? 'RUNNING' : 'STOPPED'
          });
        });
      }
    });
  });
}

function logError(error) {
  errorCount++;

  // Console alert (red)
  console.error('\x1b[31m%s\x1b[0m', `⚠️  ERROR DETECTED (${errorCount})`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Time: ${error.timestamp}`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Pattern: ${error.pattern}`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Message: ${error.message.substring(0, 100)}`);
  console.log('');

  // Save to file
  const logEntry = `[${error.timestamp}] ${error.pattern}: ${error.message}\n`;
  fs.appendFileSync(CONFIG.errorLogFile, logEntry);
}

// ============================================================
// MAIN WATCHER LOOP
// ============================================================
async function startWatching() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         COCKPIT SERVER LOG WATCHER - MANUAL MODE            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('✅ Watching for errors...');
  console.log('✅ Error log: cockpit-errors.log');
  console.log('');
  console.log('Press Ctrl+C to stop watching');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log('');

  // Initial check
  const initialStatus = await checkServerStatus();
  console.log(`📊 Server status: ${initialStatus.process}`);

  // Watch loop
  setInterval(async () => {
    const status = await checkServerStatus();

    // Check for port conflicts
    if (CONFIG.autoDetectPortConflicts && status.process === 'STOPPED') {
      console.error('\x1b[31m%s\x1b[0m', '⚠️  SERVER NOT RUNNING');
      console.error('   Check your server terminal for errors.');
    }
  }, CONFIG.checkInterval);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('');
    console.log('✅ Log watcher stopped by user.');
    console.log(`   Total errors detected: ${errorCount}`);
    console.log(`   Error log saved to: ${CONFIG.errorLogFile}`);
    process.exit(0);
  });
}

// ============================================================
// START
// ============================================================
startWatching();

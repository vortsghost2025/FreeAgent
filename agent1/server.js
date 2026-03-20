const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { getOrchestrator } = require('../orchestrator');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================
// STARTUP CHECKS - Handles keys, config, env
// ============================================

function runStartupChecks() {
  console.log('\n========== AGENT 1 STARTUP CHECKS ==========\n');
  
  const results = {
    env: checkEnvironment(),
    keys: checkApiKeys(),
    ports: checkPorts(),
    files: checkRequiredFiles()
  };
  
  // Summary
  console.log('\n========== STARTUP SUMMARY ==========');
  const allPassed = results.env.ok && results.keys.ok && results.ports.ok && results.files.ok;
  
  if (allPassed) {
    console.log('✅ All startup checks PASSED');
  } else {
    console.log('⚠️  Some startup checks FAILED - see details above');
  }
  console.log('======================================\n');
  
  return allPassed;
}

function checkEnvironment() {
  console.log('[Check] Environment variables...');
  const required = ['PORT'];
  const optional = ['CLAUDE_API_KEY', 'GCP_PROJECT', 'GCP_LOCATION', 'PREFER_LOCAL', 'MEMORY_ENABLED', 'SESSION_ENABLED'];
  
  const result = { ok: true, issues: [] };
  
  required.forEach(key => {
    if (!process.env[key]) {
      console.log(`  ⚠️  ${key} not set (using default)`);
    } else {
      console.log(`  ✅ ${key}=${process.env[key]}`);
    }
  });
  
  optional.forEach(key => {
    const val = process.env[key];
    if (val !== undefined) {
      const display = key.includes('KEY') ? '[SET]' : val;
      console.log(`  ✅ ${key}=${display}`);
    }
  });
  
  console.log('[Check] Environment: OK\n');
  return result;
}

function checkApiKeys() {
  console.log('[Check] API Keys...');
  const result = { ok: true, issues: [] };
  
  // Check Claude API key
  const claudeKey = process.env.CLAUDE_API_KEY;
  if (!claudeKey) {
    console.log('  ⚠️  CLAUDE_API_KEY not set - Claude unavailable');
  } else {
    console.log('  ✅ CLAUDE_API_KEY configured');
  }
  
  // Check GCP credentials
  const gcpProject = process.env.GCP_PROJECT;
  const gcpLocation = process.env.GCP_LOCATION || 'us-central1';
  if (!gcpProject) {
    console.log('  ⚠️  GCP_PROJECT not set - Gemini unavailable');
  } else {
    console.log(`  ✅ GCP_PROJECT=${gcpProject} configured`);
  }
  
  // Check local model
  const localUrl = process.env.LOCAL_MODEL_URL || 'http://localhost:3847';
  console.log(`  ✅ LOCAL_MODEL_URL=${localUrl}`);
  
  console.log('[Check] API Keys: OK\n');
  return result;
}

function checkPorts() {
  console.log('[Check] Port Configuration...');
  const result = { ok: true, issues: [] };
  
  const port = process.env.PORT || 54121;
  console.log(`  ✅ Server port: ${port}`);
  
  const localPort = process.env.LOCAL_MODEL_URL?.split(':').pop() || '3847';
  console.log(`  ✅ Local model port: ${localPort}`);
  
  console.log('[Check] Ports: OK\n');
  return result;
}

function checkRequiredFiles() {
  console.log('[Check] Required Files...');
  const result = { ok: true, issues: [] };
  
  const required = [
    '../orchestrator/orchestrator.js',
    '../orchestrator/clients/claudeClient.js',
    '../orchestrator/clients/localModelClient.js',
    '../orchestrator/memory.js',
    '../orchestrator/sessions.js'
  ];
  
  required.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} MISSING`);
      result.issues.push(file);
      result.ok = false;
    }
  });
  
  console.log('[Check] Files: ' + (result.ok ? 'OK' : 'FAILED') + '\n');
  return result;
}

// Auto-open browser on server start
function openBrowser(port) {
  const url = `http://localhost:${port}`;
  
  // Try multiple browser paths (order matters - preferred first)
  const browserPaths = [
    'S:\\chrome-win\\chrome-win\\chrome.exe',
    'C:\\Users\\seand\\AppData\\Local\\Chromium\\Application\\chrome.exe',
    'C:\\Users\\seand\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  // Chrome flags for local development
  global.chromeFlags = [
    '--user-data-dir=S:\\kilo\\chromium-profile',
    '--disk-cache-dir=S:\\kilo\\chromium-cache',
    '--remote-debugging-port=9222',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--disable-features=IsolateOrigins,site-per-process',
    '--allow-file-access-from-files',
    '--allow-insecure-localhost',
    '--disable-gpu-sandbox',
    '--no-sandbox'
  ];
  
  // Try each browser until one works
  tryBrowser(0, browserPaths, url);
}

function tryBrowser(index, browsers, url) {
  if (index >= browsers.length) {
    // Fallback to system default
    console.log('[Server] Trying system default browser...');
    exec(`start "" "${url}"`, (err) => {
      if (err) {
        console.error('[Server] Failed to open browser:', err.message);
      } else {
        console.log('[Server] Browser opened (system default)');
      }
    });
    return;
  }
  
  const browser = browsers[index];
  
  // Check if file exists first
  if (!fs.existsSync(browser)) {
    tryBrowser(index + 1, browsers, url);
    return;
  }
  
  console.log(`[Server] Opening: ${browser} with flags`);
  
  // Build command with Chrome flags
  const cmd = `"${browser}" ${global.chromeFlags.join(' ')} "${url}"`;
  
  exec(cmd, (err) => {
    if (err) {
      console.log(`  ⚠ Error: ${err.message}`);
      tryBrowser(index + 1, browsers, url);
    } else {
      console.log(`[Server] ✅ Browser opened: ${browser}`);
    }
  });
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

let orchestrator = null;

// Initialize orchestrator synchronously
function initOrchestrator() {
  try {
    orchestrator = getOrchestrator();
    console.log('[Server] Orchestrator initialized');
  } catch (err) {
    console.error('[Server] Failed to initialize orchestrator:', err);
  }
}

// Run startup checks first
runStartupChecks();

initOrchestrator();

// Health check
app.get('/api/health', async (req, res) => {
  if (!orchestrator) return res.json({ ok: false });

  const health = await orchestrator.healthCheck();
  res.json(health);
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  if (!orchestrator) return res.status(500).json({ error: 'Orchestrator not ready' });

  try {
    const result = await orchestrator.process(req.body);
    res.json(result);
  } catch (err) {
    console.error('[Server] Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Memory search
app.post('/api/memory/search', async (req, res) => {
  try {
    const results = await orchestrator.searchMemory(req.body.query, req.body.options || {});
    res.json(results);
  } catch (err) {
    console.error('[Server] Memory search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Memory add
app.post('/api/memory/add', async (req, res) => {
  try {
    const entry = await orchestrator.addMemory(req.body.content, req.body.options || {});
    res.json(entry);
  } catch (err) {
    console.error('[Server] Memory add error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 54121;
app.listen(PORT, () => {
  console.log(`[Server] Agent 1 listening on port ${PORT}`);
  
  // Auto-open browser (skip if NO_BROWSER env var is set)
  if (process.env.NO_BROWSER !== 'true') {
    // Small delay to ensure server is ready
    setTimeout(() => openBrowser(PORT), 500);
  }
});

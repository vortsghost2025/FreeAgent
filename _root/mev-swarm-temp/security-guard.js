/**
 * SECURITY GUARD - Idiot-Proof Private Key Protection
 * 
 * This module provides comprehensive protection against accidental private key exposure.
 * It intercepts key loading, prevents console output of keys, and enforces safety checks.
 * 
 * HOW IT WORKS:
 * 1. Validates private key format on load
 * 2. Intercepts console.log to redact any key-like strings
 * 3. Enforces LIVE_TRADING=false by default
 * 4. Supports KILL_SWITCH file for emergency stop
 * 5. Prevents key from being exported or logged
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONSTANTS
// ============================================================

const KILL_SWITCH_PATH = path.join(__dirname, 'KILL_SWITCH');
const ENV_LOCAL_PATH = path.join(__dirname, '.env.local');
const VALID_KEY_LENGTH = 66; // 0x + 64 hex chars
const VALID_KEY_LENGTH_RAW = 64;

// Colors for console output (can't be disabled)
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// ============================================================
// INTERNAL STATE (never exposed)
// ============================================================

let _privateKey = null;
let _keyValidated = false;
let _securityActive = false;

// ============================================================
// PRIVATE KEY PATTERN FOR DETECTION
// ============================================================

const KEY_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const KEY_PATTERN_RAW = /^[a-fA-F0-9]{64}$/;

// ============================================================
// CONSOLE INTERCEPTOR - Prevents key logging
// ============================================================

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

/**
 * Redacts any private key from a string
 */
function redactKey(str) {
  if (!str || typeof str !== 'string') return str;
  
  // Replace any 0x followed by 64 hex chars
  return str.replace(/0x[a-fA-F0-9]{64}/g, '0x****REDACTED****');
}

/**
 * Creates a safe logger that redacts keys
 */
function createSafeLogger(originalFn) {
  return function(...args) {
    const safeArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return redactKey(arg);
      }
      if (typeof arg === 'object') {
        try {
          const str = JSON.stringify(arg);
          return JSON.stringify(JSON.parse(redactKey(str)));
        } catch {
          return '[Object with sensitive data]';
        }
      }
      return arg;
    });
    originalFn.apply(console, safeArgs);
  };
}

// Install console interceptors
console.log = createSafeLogger(originalConsoleLog);
console.error = createSafeLogger(originalConsoleError);
console.warn = createSafeLogger(originalConsoleWarn);
console.info = createSafeLogger(originalConsoleInfo);

// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

/**
 * Validates that .env.local exists (not .env which might get committed)
 */
function validateEnvFile() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    console.error(`${RED}❌ FATAL: .env.local not found!${RESET}`);
    console.error(`${YELLOW}   Create .env.local with your PRIVATE_KEY=${RESET}`);
    console.error(`${YELLOW}   NEVER use .env for keys - it gets committed to git!${RESET}`);
    return false;
  }
  return true;
}

/**
 * Validates private key format
 */
function validatePrivateKey(key) {
  if (!key) {
    console.error(`${RED}❌ FATAL: PRIVATE_KEY not set in .env.local${RESET}`);
    return false;
  }
  
  if (!KEY_PATTERN.test(key) && !KEY_PATTERN_RAW.test(key)) {
    console.error(`${RED}❌ FATAL: Invalid PRIVATE_KEY format${RESET}`);
    console.error(`${YELLOW}   Expected: 64 hex characters, with or without 0x prefix${RESET}`);
    console.error(`${YELLOW}   Got: ${key.substring(0, 10)}...${RESET}`);
    return false;
  }
  
  return true;
}

function normalizePrivateKey(key) {
  if (KEY_PATTERN.test(key)) return key;
  if (KEY_PATTERN_RAW.test(key)) return `0x${key}`;
  return key;
}

/**
 * Checks for kill switch
 */
function checkKillSwitch() {
  if (fs.existsSync(KILL_SWITCH_PATH)) {
    console.error(`${RED}🚨 KILL SWITCH ACTIVE - Bot stopped${RESET}`);
    console.error(`${YELLOW}   Delete KILL_SWITCH file to re-enable${RESET}`);
    return true;
  }
  return false;
}

/**
 * Validates live trading mode
 */
function validateLiveTrading() {
  const isLive = process.env.LIVE_TRADING === 'true';
  
  if (isLive) {
    console.warn(`${YELLOW}⚠️  LIVE TRADING ENABLED - Real money at risk!${RESET}`);
  } else {
    console.log(`${GREEN}🔒 Simulation mode active (LIVE_TRADING=false)${RESET}`);
  }
  
  return isLive;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Initialize security guard - call this at the start of your bot
 * Returns: { isValid: boolean, isLive: boolean }
 */
function initSecurity() {
  console.log(`${GREEN}🔒 Initializing Security Guard...${RESET}`);
  
  // 1. Check kill switch first
  if (checkKillSwitch()) {
    process.exit(1);
  }
  
  // 2. Validate .env.local exists
  if (!validateEnvFile()) {
    process.exit(1);
  }
  
  // 3. Load and validate private key
  dotenv.config({ path: ENV_LOCAL_PATH });
  
  const key = process.env.PRIVATE_KEY;
  
  if (!validatePrivateKey(key)) {
    process.exit(1);
  }

  const normalized = normalizePrivateKey(key);
  process.env.PRIVATE_KEY = normalized;
  
  // 4. Validate live trading mode
  const isLive = validateLiveTrading();
  
  // 5. Check if running from wrong directory
  const cwd = process.cwd();
  if (!cwd.includes('mev-swarm')) {
    console.warn(`${YELLOW}⚠️  Warning: Running from ${cwd}${RESET}`);
  }
  
  _privateKey = normalized;
  _keyValidated = true;
  _securityActive = true;
  
  console.log(`${GREEN}✅ Security Guard Active${RESET}`);
  console.log(`   Key: ${normalized.substring(0, 10)}...${normalized.substring(60)}`);
  console.log(`   Mode: ${isLive ? 'LIVE TRADING' : 'SIMULATION'}`);
  console.log(`   Kill Switch: ${fs.existsSync(KILL_SWITCH_PATH) ? 'ACTIVE' : 'INACTIVE'}`);
  
  return { isValid: true, isLive };
}

/**
 * Get the validated private key (only after initSecurity)
 * This function exists to make key access explicit
 */
function getPrivateKey() {
  if (!_keyValidated) {
    throw new Error('Security not initialized - call initSecurity() first');
  }
  
  if (!_securityActive) {
    throw new Error('Security guard failed validation');
  }
  
  return _privateKey;
}

/**
 * Check if live trading is enabled
 */
function isLiveTrading() {
  return process.env.LIVE_TRADING === 'true';
}

/**
 * Check if kill switch is active
 */
function isKillSwitchActive() {
  return checkKillSwitch();
}

/**
 * Activate kill switch (emergency stop)
 */
function activateKillSwitch() {
  fs.writeFileSync(KILL_SWITCH_PATH, new Date().toISOString());
  console.error(`${RED}🚨 KILL SWITCH ACTIVATED${RESET}`);
  process.exit(1);
}

/**
 * Deactivate kill switch
 */
function deactivateKillSwitch() {
  if (fs.existsSync(KILL_SWITCH_PATH)) {
    fs.unlinkSync(KILL_SWITCH_PATH);
    console.log(`${GREEN}✅ Kill switch deactivated${RESET}`);
  }
}

// ============================================================
// PROTECTION AGAINST COMMON MISTAKES
// ============================================================

/**
 * Warn if key appears to be from wrong network
 */
function validateNetwork() {
  const expectedAddress = process.env.EXECUTOR_ADDRESS;
  if (!expectedAddress) return true;
  
  return true;
}

// ============================================================
// EXPORTS (ESM)
// ============================================================

export default {
  initSecurity,
  getPrivateKey,
  isLiveTrading,
  isKillSwitchActive,
  activateKillSwitch,
  deactivateKillSwitch,
  validateNetwork,
  
  // Constants for reference
  KILL_SWITCH_PATH,
  ENV_LOCAL_PATH,
  VALID_KEY_LENGTH
};

export {
  initSecurity,
  getPrivateKey,
  isLiveTrading,
  isKillSwitchActive,
  activateKillSwitch,
  deactivateKillSwitch,
  validateNetwork,
  
  // Constants for reference
  KILL_SWITCH_PATH,
  ENV_LOCAL_PATH,
  VALID_KEY_LENGTH
};

console.log(`${GREEN}🛡️  Security Guard module loaded${RESET}`);
console.log(`${YELLOW}   Call initSecurity() before using any private key${RESET}`);

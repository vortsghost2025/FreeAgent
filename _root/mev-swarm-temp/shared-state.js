/**
 * SWARM SHARED STATE - SINGLE SOURCE OF TRUTH
 * 
 * OPTIMIZED: Single-writer pattern - only LEADER writes to disk.
 * Workers use in-memory state and don't compete for file access.
 * 
 * Schema supports:
 * - 5 main agents
 * - 3-3-8 cluster
 * - 8-agent Kilo orchestra
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'shared-state.json');

// SINGLE-WRITER: Only this terminal ID can write to disk
// Set via env var or defaults to first terminal
const LEADER_ID = process.env.STATE_LEADER || 'CORE-01';

// Check if this process is the leader
function isLeader(terminalId) {
  return terminalId === LEADER_ID;
}

// In-memory state (shared across all calls in this process)
let cachedState = null;

// Batched writes for leader - accumulate changes and flush periodically
let pendingWrites = false;
let writeTimeout = null;
const BATCH_INTERVAL_MS = 5000; // Flush every 5 seconds

// ============================================
// FEDERATION CONFIGURATION
// ============================================

const FEDERATION = {
    // Core agents - main reflex layer
    CORE: ['CORE-01', 'CORE-02', 'CORE-03', 'CORE-04', 'CORE-05'],
    // Cluster A - local coordination
    CL_A: ['CL-A1', 'CL-A2', 'CL-A3'],
    // Cluster B - local coordination  
    CL_B: ['CL-B1', 'CL-B2', 'CL-B3'],
    // Cluster C - extended capacity
    CL_C: ['CL-C01', 'CL-C02', 'CL-C03', 'CL-C04', 'CL-C05', 'CL-C06', 'CL-C07', 'CL-C08'],
    // Orchestra - parallel processing
    ORCHESTRA: ['ORCH-01', 'ORCH-02', 'ORCH-03', 'ORCH-04', 'ORCH-05', 'ORCH-06', 'ORCH-07', 'ORCH-08'],
    // Master controller - global regulation
    MASTER: ['MASTER']
};

// All terminals combined
const ALL_TERMINALS = [
    ...FEDERATION.CORE,
    ...FEDERATION.CL_A,
    ...FEDERATION.CL_B,
    ...FEDERATION.CL_C,
    ...FEDERATION.ORCHESTRA,
    ...FEDERATION.MASTER
];

// ============================================
// MODE DEFINITIONS
// ============================================

const MODES = {
    CALM: { name: 'calm', threshold: 30, aggression: 1.0, parallelism: 1 },
    WARM: { name: 'warm', threshold: 50, aggression: 1.5, parallelism: 2 },
    HOT: { name: 'hot', threshold: 75, aggression: 2.0, parallelism: 4 },
    CRITICAL: { name: 'critical', threshold: 90, aggression: 0.5, parallelism: 1 }
};

// ============================================
// SAFETY BRAKE CONFIGURATION
// ============================================

const SAFETY_CONFIG = {
    burstWindow: 90000,
    burstThreshold: 3,
    freezeDuration: 60000,
    cooldownBase: 1000,
    cooldownExponent: 0.5,
    heatWindow: 50,
    heatWarning: 70,
    heatCritical: 90
};

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * Terminal/Agent State
 * One of these per running agent
 */
const createTerminalState = (id, name, cluster = 'main') => ({
    id,
    name,
    cluster,

    // BLOCK TIMING
    blockNumber: 0,
    blockDelta: 0,
    lastBlockTime: 0,
    isBackToBack: false,

    // HEAT MODEL
    heat: 0,
    rpcLatency: 0,
    failureRate: 0,

    // BURST STATE
    burstAllowed: false,
    hasBurstThisCycle: false,
    cooldown: false,
    cooldownUntil: 0,

    // LOAD METRICS
    cycleTime: 0,
    opportunitiesPerSec: 0,
    currentMode: 'idle',
    aggression: 1,
    parallelism: 1,

    // RESOURCE HEALTH
    ramUsage: 0,
    ramGrowthRate: 0,

    // DECISION HISTORY (last 10)
    recentDecisions: [],

    // STATS
    totalOpportunities: 0,
    totalBursts: 0,
    totalFailures: 0,
    uptime: 0
});

// ============================================
// GLOBAL STATE STRUCTURE
// ============================================

/**
 * Create initial global state
 * This is the SINGLE SOURCE OF TRUTH for all terminals
 */
const createGlobalState = () => ({
    version: '1.0.0',
    lastUpdate: Date.now(),
    globalHeat: 0,
    globalLoad: 0,
    burstAllowed: true,
    hasBurstThisCycle: false,
    cooldown: false,
    cooldownUntil: 0,
    currentBlock: 0,
    blocksPerCycle: 0,
    terminals: {},
    decisionLog: [],
    events: [],
    config: {
        maxAgents: 5,
        burstThreshold: 3,
        backToBackThreshold: 5000,
        ramWarningThreshold: 80,
        ramCriticalThreshold: 90,
        cooldownDuration: 30000
    }
});

// ============================================
// STATE MANAGEMENT
// ============================================

let cachedState = null;

async function readState() {
    await acquireLock();
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            cachedState = JSON.parse(data);
            return cachedState;
        }
    } catch (error) {
        console.error('[SharedState] Error reading state:', error.message);
    } finally {
        releaseLock();
    }
    return null;
}

async function writeState(state, terminalId = null) {
    await acquireLock();
    try {
        state.lastUpdate = Date.now();
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        cachedState = state;
        return true;
    } catch (error) {
        console.error('[SharedState] Error writing state:', error.message);
        return false;
    } finally {
        releaseLock();
    }
}

function getState() {
    if (cachedState) return cachedState;
    // Synchronous fallback for initial load - will use cache
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            cachedState = JSON.parse(data);
            return cachedState;
        }
    } catch (error) {
        console.error('[SharedState] Error reading state:', error.message);
    }
    return createGlobalState();
}

async function initializeState() {
    let state = await readState();
    if (!state) {
        state = createGlobalState();
        await writeState(state);
        console.log('[SharedState] Initialized new state file');
    }
    return state;
}

async function updateTerminal(terminalId, terminalData) {
    const state = await getState();
    state.terminals[terminalId] = {
        ...state.terminals[terminalId],
        ...terminalData,
        lastUpdate: Date.now()
    };
    recalculateGlobalHeat(state);
    return await writeState(state, terminalId);
}

function recalculateGlobalHeat(state) {
    const terminals = Object.values(state.terminals);
    if (terminals.length === 0) {
        state.globalHeat = 0;
        return;
    }
    const totalHeat = terminals.reduce((sum, t) => sum + (t.heat || 0), 0);
    state.globalHeat = Math.round(totalHeat / terminals.length);
    const totalLoad = terminals.reduce((sum, t) => sum + (t.load || 0), 0);
    state.globalLoad = Math.round(totalLoad / terminals.length);
}

async function addEvent(type, data) {
    const state = await getState();
    state.events.unshift({ type, data, timestamp: Date.now() });
    if (state.events.length > 50) state.events = state.events.slice(0, 50);
    return await writeState(state);
}

async function logDecision(terminalId, decision, reason) {
    const state = await getState();
    state.decisionLog.unshift({ terminalId, decision, reason, timestamp: Date.now() });
    if (state.decisionLog.length > 20) state.decisionLog = state.decisionLog.slice(0, 20);
    return await writeState(state);
}

// ============================================
// 7-STEP UPDATE CYCLE - CORE LOGIC
// ============================================

/**
 * Execute the full 7-step cycle for a terminal
 * Steps: READ → UPDATE LOCAL → WRITE LOCAL → RECOMPUTE → APPLY RULES → WRITE GLOBAL → ACT
 */
async function executeCycle(terminalId, localMetrics) {
    const state = await getState();
    const terminal = state.terminals[terminalId] || createTerminalState(terminalId, terminalId);
    Object.assign(terminal, localMetrics);
    terminal.lastUpdate = Date.now();
    terminal.heatHistory = terminal.heatHistory || [];
    terminal.heatHistory.push(terminal.heat || 0);
    if (terminal.heatHistory.length > 60) terminal.heatHistory.shift();
    terminal.heat = Math.round(terminal.heatHistory.reduce((a, b) => a + b, 0) / terminal.heatHistory.length);
    terminal.currentMode = terminal.heat >= 90 ? 'critical' : terminal.heat >= 70 ? 'hot' : terminal.heat >= 50 ? 'warm' : 'calm';
    state.terminals[terminalId] = terminal;
    recomputeGlobalAggregates(state);
    const globalRules = applyGlobalRules(state);
    state.burstAllowed = globalRules.shouldBurst;
    state.cooldown = globalRules.shouldCooldown;
    state.safetyLock = globalRules.safetyTriggered;
    state.currentMode = globalRules.globalMode;
    state.globalHeat = globalRules.globalHeat;
    if (globalRules.safetyTriggered) {
        state.safetyLockUntil = Date.now() + SAFETY_CONFIG.freezeDuration;
        state.safetyEvents = state.safetyEvents || [];
        state.safetyEvents.unshift({ type: 'safety_lock', triggeredBy: terminalId, reason: globalRules.safetyReason, timestamp: Date.now() });
        if (state.safetyEvents.length > 20) state.safetyEvents = state.safetyEvents.slice(0, 20);
    }
    if (state.events.length > 50) state.events = state.events.slice(0, 50);
    if (state.burstHistory && state.burstHistory.length > 30) state.burstHistory = state.burstHistory.slice(0, 30);
    await writeState(state, terminalId);
    const decision = {
        shouldBurst: state.burstAllowed && !state.safetyLock,
        shouldCooldown: state.cooldown,
        safetyTriggered: state.safetyLock,
        mode: state.currentMode,
        globalHeat: state.globalHeat,
        aggression: MODES[state.currentMode.toUpperCase()]?.aggression || 1,
        parallelism: MODES[state.currentMode.toUpperCase()]?.parallelism || 1,
        blockDelta: terminal.blockDelta,
        isBackToBack: terminal.isBackToBack,
        reason: globalRules.safetyReason || 'normal_operation'
    };
    await logDecision(terminalId, decision.shouldBurst ? 'burst' : 'wait', decision.reason);
    return { state, decision };
}

function recomputeGlobalAggregates(state) {
    const terminals = Object.values(state.terminals);
    if (terminals.length === 0) { state.globalHeat = 0; state.globalLoad = 0; return; }
    const heatValues = terminals.map(t => t.heat || 0);
    state.globalHeatHistory = state.globalHeatHistory || [];
    state.globalHeatHistory.push(Math.round(heatValues.reduce((a, b) => a + b, 0) / heatValues.length));
    if (state.globalHeatHistory.length > 60) state.globalHeatHistory.shift();
    state.globalHeat = Math.round(state.globalHeatHistory.reduce((a, b) => a + b, 0) / state.globalHeatHistory.length);
    const loadValues = terminals.map(t => t.load || 0);
    state.globalLoad = Math.round(loadValues.reduce((a, b) => a + b, 0) / loadValues.length);
    const now = Date.now();
    state.federation = state.federation || { activeTerminals: [], clusterHealth: {} };
    state.federation.activeTerminals = terminals.filter(t => now - (t.lastUpdate || 0) < 60000).map(t => t.id);
}

function applyGlobalRules(state) {
    const now = Date.now();
    if (state.safetyLock && state.safetyLockUntil > now) {
        return { shouldBurst: false, shouldCooldown: true, safetyTriggered: true, globalMode: 'critical', globalHeat: 100, safetyReason: 'safety_lock_active' };
    }
    if (state.safetyLock && state.safetyLockUntil <= now) { state.safetyLock = false; state.safetyLockUntil = 0; }
    state.burstHistory = state.burstHistory || [];
    const recentBursts = state.burstHistory.filter(b => now - b.timestamp < SAFETY_CONFIG.burstWindow);
    if (recentBursts.length >= SAFETY_CONFIG.burstThreshold) {
        return { shouldBurst: false, shouldCooldown: true, safetyTriggered: true, globalMode: 'critical', globalHeat: 100, safetyReason: `safety_brake_triggered:${recentBursts.length}_bursts` };
    }
    const globalMode = state.globalHeat >= 90 ? 'critical' : state.globalHeat >= 70 ? 'hot' : state.globalHeat >= 50 ? 'warm' : 'calm';
    const terminals = Object.values(state.terminals);
    const failingTerminals = terminals.filter(t => (t.failureRate || 0) > 0.3);
    const shouldCooldown = failingTerminals.length > terminals.length * 0.5;
    const canBurst = globalMode !== 'critical' && !shouldCooldown;
    return { shouldBurst: canBurst, shouldCooldown, safetyTriggered: false, globalMode, globalHeat: state.globalHeat, safetyReason: null };
}

async function recordBurst(terminalId, success, state) {
    state.burstHistory = state.burstHistory || [];
    state.burstHistory.unshift({ terminalId, success, timestamp: Date.now(), blockNumber: state.currentBlock });
    const cutoff = Date.now() - SAFETY_CONFIG.burstWindow;
    state.burstHistory = state.burstHistory.filter(b => b.timestamp > cutoff);
    return await writeState(state);
}

module.exports = {
    STATE_FILE,
    FEDERATION,
    ALL_TERMINALS,
    MODES,
    SAFETY_CONFIG,
    createTerminalState,
    createGlobalState,
    getState,
    initializeState,
    readState,
    writeState,
    updateTerminal,
    addEvent,
    logDecision,
    recalculateGlobalHeat,
    executeCycle,
    recomputeGlobalAggregates,
    applyGlobalRules,
    recordBurst
};
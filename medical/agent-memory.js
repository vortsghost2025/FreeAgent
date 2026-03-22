/**
 * Agent Memory System - Persistent memory for all agents
 * Handles loading/saving sessions and shared memory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_DIR = path.join(__dirname, 'agent-memory');
const MAX_SESSIONS = 10; // Keep last 10 sessions per agent

// Ensure memory directory exists
function ensureMemoryDir() {
    if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
        console.log('[Memory] Created agent-memory directory');
    }
}

// Load an agent's memory file
function loadAgentMemory(agentName) {
    ensureMemoryDir();
    const filePath = path.join(MEMORY_DIR, `${agentName}.json`);

    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error(`[Memory] Error loading ${agentName} memory:`, err.message);
    }

    // Return default structure if file doesn't exist
    return {
        agent: agentName,
        sessions: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
}

// Save an agent's memory file
function saveAgentMemory(agentName, memory) {
    ensureMemoryDir();
    const filePath = path.join(MEMORY_DIR, `${agentName}.json`);

    try {
        memory.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
        return true;
    } catch (err) {
        console.error(`[Memory] Error saving ${agentName} memory:`, err.message);
        return false;
    }
}

// Add a session to agent memory
function addSession(agentName, session) {
    const memory = loadAgentMemory(agentName);

    // Add new session
    memory.sessions.push({
        ...session,
        timestamp: new Date().toISOString()
    });

    // Keep only last MAX_SESSIONS
    if (memory.sessions.length > MAX_SESSIONS) {
        memory.sessions = memory.sessions.slice(-MAX_SESSIONS);
    }

    saveAgentMemory(agentName, memory);
    return memory;
}

// Domain mapping for inheritance
const DOMAIN_INHERITANCE = {
  'code': ['shared', 'kilo'],
  'clinical': ['shared', 'kilo'],
  'data': ['shared', 'kilo'],
  'test': ['shared', 'kilo'],
  'security': ['shared', 'kilo'],
  'devops': ['shared', 'kilo'],
  'api': ['shared', 'kilo'],
  'db': ['shared', 'kilo'],
  'kilo': ['shared'],
  'claw': ['shared'],
  'shared': []
};

/**
 * Bootstrap a new agent with unified memory context
 */
export function bootstrapAgent(agentName, domain = null) {
    console.log(`[Memory] Bootstrapping agent: ${agentName}`);
    const effectiveDomain = domain || agentName;
    const inheritance = DOMAIN_INHERITANCE[effectiveDomain] || ['shared', 'kilo'];
    const context = {
        agent: agentName,
        domain: effectiveDomain,
        inheritance: inheritance,
        memories: {},
        bootstrapTime: new Date().toISOString()
    };
    for (const memAgent of inheritance) {
        const memory = loadAgentMemory(memAgent);
        context.memories[memAgent] = {
            description: memory.description,
            sessions: memory.sessions || [],
            lastUpdated: memory.lastUpdated
        };
    }
    const manifestPath = path.join(MEMORY_DIR, 'bootstrap-manifests.json');
    if (fs.existsSync(manifestPath)) {
        try {
            const manifests = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            context.manifest = manifests[effectiveDomain] || null;
        } catch (err) {
            console.error('[Memory] Error loading manifests:', err.message);
        }
    }
    console.log(`[Memory] Agent ${agentName} bootstrapped with ${inheritance.length} inherited memories`);
    return context;
}

/**
 * Get unified brain data
 */
export function getUnifiedBrain() {
    const brainPath = path.join(MEMORY_DIR, 'unified-brain.json');
    if (fs.existsSync(brainPath)) {
        try {
            return JSON.parse(fs.readFileSync(brainPath, 'utf8'));
        } catch (err) {
            console.error('[Memory] Error loading unified brain:', err.message);
        }
    }
    return null;
}

/**
 * Run memory consolidation (daily merge)
 */
export async function runMemoryConsolidation() {
    const { consolidate } = await import('./utils/memory-consolidator.js');
    return consolidate();
}

export default {
    loadAgentMemory,
    saveAgentMemory,
    addSession,
    bootstrapAgent,
    getUnifiedBrain,
    runMemoryConsolidation,
    getBootstrapContext,
    loadSharedMemory,
    saveSharedMemory,
    addSharedEntry,
    getSharedContext,
    extractKeyContext,
    MEMORY_DIR
};

// Get bootstrap context from agent's last N sessions
function getBootstrapContext(agentName, numSessions = 10) {
    const memory = loadAgentMemory(agentName);

    console.log(`[Memory] getBootstrapContext for '${agentName}': found ${memory.sessions?.length || 0} sessions`);

    if (!memory.sessions || memory.sessions.length === 0) {
        return '';
    }

    const recentSessions = memory.sessions.slice(-numSessions);
    console.log(`[Memory] Using last ${recentSessions.length} sessions for context`);

    const contextParts = recentSessions.map((session, idx) => {
        let context = `Session ${idx + 1} (${session.timestamp}):\n`;
        if (session.messages) {
            session.messages.forEach(msg => {
                context += `${msg.role}: ${msg.content.substring(0, 200)}\n`;
            });
        }
        if (session.decisions && session.decisions.length > 0) {
            context += `Decisions: ${session.decisions.join(', ')}\n`;
        }
        if (session.keyContext) {
            context += `Key context: ${session.keyContext}\n`;
        }
        return context;
    });

    const result = contextParts.join('\n---\n');
    console.log(`[Memory] Bootstrap context length: ${result.length} chars`);
    return result;
}

// Load shared memory
function loadSharedMemory() {
    ensureMemoryDir();
    const filePath = path.join(MEMORY_DIR, 'shared.json');

    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[Memory] Error loading shared memory:', err.message);
    }

    return {
        type: 'shared',
        entries: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
}

// Save shared memory
function saveSharedMemory(memory) {
    ensureMemoryDir();
    const filePath = path.join(MEMORY_DIR, 'shared.json');

    try {
        memory.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
        return true;
    } catch (err) {
        console.error('[Memory] Error saving shared memory:', err.message);
        return false;
    }
}

// Add entry to shared memory (accessible by all agents)
function addSharedEntry(entry) {
    const memory = loadSharedMemory();

    memory.entries.push({
        ...entry,
        timestamp: new Date().toISOString()
    });

    // Keep last 50 shared entries
    if (memory.entries.length > 50) {
        memory.entries = memory.entries.slice(-50);
    }

    saveSharedMemory(memory);
    return memory;
}

// Get shared memory context for bootstrap
function getSharedContext() {
    const memory = loadSharedMemory();

    if (!memory.entries || memory.entries.length === 0) {
        return '';
    }

    const recentEntries = memory.entries.slice(-20);
    const contextParts = recentEntries.map(entry => {
        return `[${entry.timestamp}] ${entry.agent || 'system'}: ${entry.content}`;
    });

    return 'SHARED KNOWLEDGE BASE:\n' + contextParts.join('\n');
}

// Extract key decisions/facts from response for memory storage
function extractKeyContext(message, response) {
    const keyFacts = [];

    // Simple extraction - look for important patterns
    const importantPatterns = [
        /created (.*?)(?:\.|$)/i,
        /implemented (.*?)(?:\.|$)/i,
        /fixed (.*?)(?:\.|$)/i,
        /decided to (.*?)(?:\.|$)/i,
        /learned (.*?)(?:\.|$)/i,
        /remember (.*?)(?:\.|$)/i,
        /important: (.*?)(?:\.|$)/i
    ];

    const fullText = `${message} ${response}`;

    importantPatterns.forEach(pattern => {
        const match = fullText.match(pattern);
        if (match && match[1]) {
            keyFacts.push(match[1].trim());
        }
    });

    return keyFacts.length > 0 ? keyFacts.join('; ') : null;
}

// Memory directory path
export { MEMORY_DIR };

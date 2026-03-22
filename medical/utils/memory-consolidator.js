/**
 * Memory Consolidator - Reads, deduplicates, and categorizes agent memories
 * 
 * Enhanced with Working Memory and Episodic Memory integration
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { workingMemory } from "../memory/working-memory.js";
import { episodicMemory } from "../memory/episodic-memory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_DIR = path.join(__dirname, "..", "agent-memory");
const EPISODE_STORAGE = path.join(__dirname, "..", "memory", "episodes");

// Domain categorization mapping
const DOMAIN_MAP = {
  "code": "coding",
  "clinical": "medical",
  "data": "data",
  "test": "testing",
  "security": "security",
  "devops": "operations",
  "api": "api",
  "db": "database",
  "kilo": "architecture",
  "claw": "architecture",
  "shared": "shared",
  "episodic": "episodic"
};

export function readAllAgentFiles() {
  const agents = {};
  
  if (!fs.existsSync(MEMORY_DIR)) {
    console.log("[Consolidator] Memory directory does not exist");
    return agents;
  }
  
  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith(".json"));
  
  for (const file of files) {
    const agentName = file.replace(".json", "");
    const filePath = path.join(MEMORY_DIR, file);
    
    try {
      const content = fs.readFileSync(filePath, "utf8");
      agents[agentName] = JSON.parse(content);
    } catch (err) {
      console.error("[Consolidator] Error reading " + file + ":", err.message);
    }
  }
  
  return agents;
}

function extractLearnings(agentData) {
  const learnings = [];
  
  if (agentData.sessions) {
    for (const session of agentData.sessions) {
      if (session.messages && session.messages.length > 0) {
        const lastMsg = session.messages[session.messages.length - 1];
        if (lastMsg && lastMsg.content) {
          learnings.push({
            type: "session",
            content: lastMsg.content.substring(0, 300),
            timestamp: session.timestamp
          });
        }
      }
    }
  }
  
  if (agentData.entries) {
    for (const entry of agentData.entries) {
      if (entry.content) {
        learnings.push({
          type: entry.type || "learning",
          content: entry.content.substring(0, 300),
          timestamp: entry.timestamp
        });
      }
    }
  }
  
  return learnings;
}

function deduplicate(learnings) {
  const seen = new Set();
  const unique = [];
  
  for (const item of learnings) {
    const key = item.content.substring(0, 100).toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  
  return unique;
}

function categorizeByDomain(agents) {
  const domains = {
    coding: [],
    medical: [],
    data: [],
    testing: [],
    security: [],
    operations: [],
    api: [],
    database: [],
    architecture: [],
    shared: [],
    episodic: []
  };
  
  for (const [agentName, agentData] of Object.entries(agents)) {
    const domain = DOMAIN_MAP[agentName] || "shared";
    const learnings = extractLearnings(agentData);
    
    if (learnings.length > 0) {
      domains[domain].push({
        agent: agentName,
        learnings: learnings
      });
    }
  }
  
  return domains;
}

// NEW: Extract learnings from episodic memory
export async function extractEpisodicLearnings(days = 7) {
  try {
    const { getEpisodicMemory } = await import("../memory/episodic-memory.js");
    const episodic = getEpisodicMemory();
    const learnings = episodic.extractLearnings(days);
    console.log("[Consolidator] Extracted " + learnings.length + " episodic learnings");
    return learnings;
  } catch (err) {
    console.error("[Consolidator] Error extracting episodic learnings:", err.message);
    return [];
  }
}

// NEW: Get working memory stats
export async function getWorkingMemoryStats() {
  try {
    const { getWorkingMemory } = await import("../memory/working-memory.js");
    const wm = getWorkingMemory();
    return wm.getStats();
  } catch (err) {
    console.error("[Consolidator] Error getting working memory stats:", err.message);
    return null;
  }
}

// NEW: Get episodic memory stats
export async function getEpisodicMemoryStats() {
  try {
    const { getEpisodicMemory } = await import("../memory/episodic-memory.js");
    const em = getEpisodicMemory();
    return em.getStats();
  } catch (err) {
    console.error("[Consolidator] Error getting episodic memory stats:", err.message);
    return null;
  }
}

export function consolidate() {
  console.log("[Consolidator] Starting memory consolidation...");
  
  // 1. Read all agent files
  const agents = readAllAgentFiles();
  console.log("[Consolidator] Read " + Object.keys(agents).length + " agent files");
  
  // 2. Extract and deduplicate learnings
  const allLearnings = [];
  for (const [name, data] of Object.entries(agents)) {
    const learnings = extractLearnings(data);
    allLearnings.push(...learnings);
  }
  
  const uniqueLearnings = deduplicate(allLearnings);
  console.log("[Consolidator] Deduplicated to " + uniqueLearnings.length + " unique learnings");
  
  // 3. Categorize by domain
  const domainKnowledge = categorizeByDomain(agents);
  
  // 4. Build unified brain
  const unifiedBrain = {
    version: "1.0",
    lastConsolidated: new Date().toISOString(),
    agents: Object.keys(agents),
    domains: domainKnowledge,
    stats: {
      totalAgents: Object.keys(agents).length,
      totalLearnings: uniqueLearnings.length
    }
  };
  
  // 5. Write unified-brain.json
  const outputPath = path.join(MEMORY_DIR, "unified-brain.json");
  fs.writeFileSync(outputPath, JSON.stringify(unifiedBrain, null, 2));
  console.log("[Consolidator] Written to " + outputPath);
  
  // 6. Generate bootstrap manifests
  generateBootstrapManifests(agents);
  
  return unifiedBrain;
}

function generateBootstrapManifests(agents) {
  const manifests = {};
  
  for (const [agentName, agentData] of Object.entries(agents)) {
    manifests[agentName] = {
      agent: agentName,
      description: agentData.description || "",
      inheritsFrom: getInheritanceChain(agentName),
      domains: getAgentDomains(agentName)
    };
  }
  
  manifests["shared"] = {
    agent: "shared",
    description: "Shared knowledge across all agents",
    inheritsFrom: [],
    domains: ["shared"]
  };
  
  const manifestPath = path.join(MEMORY_DIR, "bootstrap-manifests.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifests, null, 2));
  console.log("[Consolidator] Written bootstrap manifests to " + manifestPath);
}

function getInheritanceChain(agentName) {
  const base = ["shared"];
  if (["kilo", "claw"].includes(agentName)) {
    return base;
  }
  return ["shared", "kilo"];
}

// Enhanced Memory Integration Functions

/**
 * Auto-save episode when session ends
 * @param {Object} sessionData - Complete session data
 * @returns {string|null} Episode ID or null
 */
export async function autoSaveEpisode(sessionData) {
  try {
    const episode = {
      sessionId: sessionData.sessionId || `sess_${Date.now()}`,
      timestamp: new Date().toISOString(),
      events: sessionData.messages || [],
      context: {
        agent: sessionData.agent,
        topic: sessionData.topic || 'general',
        duration: sessionData.duration || 0
      },
      outcome: sessionData.outcome || 'completed',
      duration: sessionData.duration || 0,
      metadata: {
        type: sessionData.type || 'interactive_session',
        source: 'memory_consolidator',
        version: '1.0.0'
      }
    };

    const episodeId = episodicMemory.recordEpisode(episode);
    
    if (episodeId) {
      console.log(`[MemoryConsolidator] Auto-saved episode ${episodeId}`);
      
      // Also add key events to working memory
      const keyEvents = extractKeyEvents(sessionData.messages || []);
      keyEvents.forEach(event => {
        workingMemory.add({
          content: event.content,
          type: event.type,
          metadata: { sessionId: episodeId, importance: event.importance }
        });
      });
    }
    
    return episodeId;
  } catch (error) {
    console.error('[MemoryConsolidator] Failed to auto-save episode:', error.message);
    return null;
  }
}

// Exports

/**
 * Sync working memory with persistent storage
 * @returns {boolean} Success status
 */
export async function syncWorkingMemory() {
  try {
    const wmData = workingMemory.export();
    const wmPath = path.join(__dirname, "..", "memory", "working-memory.json");
    
    await fs.promises.writeFile(wmPath, JSON.stringify(wmData, null, 2));
    console.log('[MemoryConsolidator] Working memory synced to disk');
    return true;
  } catch (error) {
    console.error('[MemoryConsolidator] Failed to sync working memory:', error.message);
    return false;
  }
}

/**
 * Restore working memory from persistent storage
 * @returns {boolean} Success status
 */
export async function restoreWorkingMemory() {
  try {
    const wmPath = path.join(__dirname, "..", "memory", "working-memory.json");
    
    if (fs.existsSync(wmPath)) {
      const data = JSON.parse(await fs.promises.readFile(wmPath, 'utf8'));
      const success = workingMemory.import(data);
      
      if (success) {
        console.log('[MemoryConsolidator] Working memory restored from disk');
        return true;
      }
    }
    
    console.log('[MemoryConsolidator] No working memory backup found, starting fresh');
    return true;
  } catch (error) {
    console.error('[MemoryConsolidator] Failed to restore working memory:', error.message);
    return false;
  }
}

/**
 * Get comprehensive memory statistics
 * @returns {Object} Combined memory statistics
 */
export function getMemoryStatistics() {
  return {
    workingMemory: workingMemory.getStats(),
    episodicMemory: episodicMemory.getStats(),
    consolidated: {
      domains: Object.keys(DOMAIN_MAP).length,
      lastRun: new Date().toISOString()
    }
  };
}


// Helper Functions (must be defined before exports)

function extractKeyEvents(messages) {
  const keyEvents = [];
  
  messages.forEach((msg, index) => {
    if (msg.role === 'assistant' && msg.content) {
      // Extract key decisions and important responses
      const importance = calculateImportance(msg.content);
      if (importance > 0.7) { // Threshold for key events
        keyEvents.push({
          content: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
          type: 'key_response',
          importance,
          timestamp: msg.timestamp || new Date().toISOString()
        });
      }
    }
  });
  
  return keyEvents;
}

function calculateImportance(content) {
  const keywords = ['important', 'critical', 'essential', 'key', 'significant', 'decision', 'conclusion'];
  const wordCount = content.split(' ').length;
  let score = 0;
  
  keywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) {
      score += 0.2;
    }
  });
  
  // Longer content might be more important
  if (wordCount > 100) score += 0.1;
  if (wordCount > 300) score += 0.1;
  
  return Math.min(score, 1.0);
}

function analyzeEpisodeForLearning(episode) {
  try {
    const content = JSON.stringify(episode.events);
    const patterns = [
      { pattern: /error|bug|issue|problem/i, type: 'debugging_pattern' },
      { pattern: /solution|fix|resolved|worked/i, type: 'solution_pattern' },
      { pattern: /learned|discovered|found/i, type: 'learning_pattern' },
      { pattern: /best practice|recommend|should/i, type: 'recommendation_pattern' }
    ];
    
    for (const { pattern, type } of patterns) {
      if (pattern.test(content)) {
        return {
          type,
          content: `From session ${episode.sessionId}: ${content.substring(0, 200)}...`,
          timestamp: episode.timestamp,
          sessionId: episode.sessionId
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Exports

function getAgentDomains(agentName) {
  const domain = DOMAIN_MAP[agentName] || "shared";
  return ["shared", domain];
}

export async function runDailyMerge() {
  console.log("\n=== Memory Consolidation Run ===\n");
  
  // Extract episodic learnings
  const episodicLearnings = await extractEpisodicLearnings(7);
  
  // Run standard consolidation
  const result = consolidate();
  
  // Add episodic learnings to unified brain
  if (episodicLearnings.length > 0) {
    result.domains.episodic = episodicLearnings;
    console.log("[Consolidator] Added " + episodicLearnings.length + " episodic learnings to unified brain");
  }
  
  console.log("\n=== Consolidation Complete ===\n");
  return result;
}

// CLI execution
if (import.meta.url === "file://" + process.argv[1]) {
  runDailyMerge();
}

export default { consolidate, runDailyMerge, extractEpisodicLearnings, getWorkingMemoryStats, getEpisodicMemoryStats };

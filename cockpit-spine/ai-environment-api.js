/**
 * API Server for Enhanced Persistent AI Environment
 * Provides REST endpoints for the dashboard to interact with the persistent environment
 * Uses 48-layer memory synchronization engine for exponential AI evolution
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getEnhancedAIEnvironment } from './enhanced-persistent-ai-environment.js';

const execAsync = promisify(exec);

// Load persistent project context for cockpit system prompt
let cockpitContext = '';
try {
  cockpitContext = readFileSync(new URL('./COCKPIT_CONTEXT.md', import.meta.url), 'utf8');
} catch { /* context file optional */ }

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from project root
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

// Store the environment instance
let aiEnvironment = null;

// Initialize the environment
async function initializeEnvironment() {
  console.log('[AI Environment API] Initializing Enhanced AI Environment...');
  aiEnvironment = await getEnhancedAIEnvironment();
  console.log('[AI Environment API] Enhanced AI Environment instance acquired.');
  // Start the 48-layer memory synchronization
  console.log('[AI Environment API] Starting 48-layer memory synchronization...');
  await aiEnvironment.startSynchronization();
  console.log('[AI Environment API] Enhanced Persistent AI Environment with 48-layer memory initialized');
}

// API Routes
app.get('/api/environment/stats', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const stats = await aiEnvironment.getEnvironmentStats();
    res.json(stats);
  } catch (error) {
    console.error('[AI Environment API] Error getting environment stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    // Convert Map to array for JSON serialization
    const models = Array.from(aiEnvironment.modelRegistry.entries()).map(([id, metadata]) => ({
      id,
      ...metadata
    }));
    
    res.json(models);
  } catch (error) {
    console.error('[AI Environment API] Error getting models:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/models/register', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const { modelId, config } = req.body;
    
    if (!modelId || !config) {
      return res.status(400).json({ error: 'modelId and config are required' });
    }
    
    const result = await aiEnvironment.registerModel(modelId, config);
    res.json(result);
  } catch (error) {
    console.error('[AI Environment API] Error registering model:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/:modelId/learnings', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const { modelId } = req.params;
    const learnings = await aiEnvironment.getModelLearnings(modelId);
    res.json(learnings);
  } catch (error) {
    console.error('[AI Environment API] Error getting model learnings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const filter = req.query;
    const knowledge = await aiEnvironment.getSharedKnowledge(filter);
    res.json(knowledge);
  } catch (error) {
    console.error('[AI Environment API] Error getting shared knowledge:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/learnings', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const { modelId, learning } = req.body;
    
    if (!modelId || !learning) {
      return res.status(400).json({ error: 'modelId and learning are required' });
    }
    
    const result = await aiEnvironment.storeModelLearning(modelId, learning);
    res.json({ id: result });
  } catch (error) {
    console.error('[AI Environment API] Error storing learning:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/knowledge/share', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const { learningId, sourceModelId, targetModelIds } = req.body;
    
    if (!learningId || !sourceModelId || !targetModelIds || !Array.isArray(targetModelIds)) {
      return res.status(400).json({ error: 'learningId, sourceModelId, and targetModelIds (array) are required' });
    }
    
    const results = await aiEnvironment.shareLearningBetweenModels(learningId, sourceModelId, targetModelIds);
    res.json(results);
  } catch (error) {
    console.error('[AI Environment API] Error sharing learning:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/:modelId/export', async (req, res) => {
  try {
    if (!aiEnvironment) {
      return res.status(500).json({ error: 'Environment not initialized' });
    }
    
    const { modelId } = req.params;
    const exportPath = await aiEnvironment.exportModelMemory(modelId);
    res.json({ exportPath });
  } catch (error) {
    console.error('[AI Environment API] Error exporting model memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile('enhanced-ai-environment-dashboard.html', { root: process.cwd() });
});

// ===== WORKSPACE STATUS ENDPOINT =====
// Gives the cockpit real system visibility into C:\workspace
app.get('/api/workspace/status', async (req, res) => {
  const results = {};

  // 1. Check agent ports 3001/3002/3003
  try {
    const { stdout: netstat } = await execAsync('netstat -ano | findstr ":300[123]"');
    results.agentPorts = netstat.trim() || 'No agent ports listening';
  } catch {
    results.agentPorts = 'No agent ports listening';
  }

  // 2. Check node processes
  try {
    const { stdout: procs } = await execAsync('tasklist /fi "imagename eq node.exe" /fo csv /nh');
    results.nodeProcesses = procs.trim() || 'No node processes running';
  } catch {
    results.nodeProcesses = 'Could not query processes';
  }

  // 3. Latest trading bot logs
  try {
    const { stdout: logs } = await execAsync(
      'powershell -Command "Get-ChildItem C:\\workspace\\logs -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 FullName, LastWriteTime | Format-List"'
    );
    results.recentLogs = logs.trim() || 'No log files found in C:\\workspace\\logs';
  } catch {
    results.recentLogs = 'Could not read log files';
  }

  // 4. Latest production log content (last 30 lines)
  try {
    const { stdout: prodLog } = await execAsync(
      'powershell -Command "$f = Get-ChildItem C:\\workspace\\logs\\production -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if ($f) { Get-Content $f.FullName -Tail 30 } else { \'No production logs found\' }"'
    );
    results.latestProductionLog = prodLog.trim();
  } catch {
    results.latestProductionLog = 'No production logs accessible';
  }

  // 5. KuCoin / trading bot process check
  try {
    const { stdout: pyProcs } = await execAsync('tasklist /fi "imagename eq python.exe" /fo csv /nh');
    results.pythonProcesses = pyProcs.trim() || 'No python processes running';
  } catch {
    results.pythonProcesses = 'Could not query python processes';
  }

  res.json({ timestamp: new Date().toISOString(), ...results });
});
// ===== END WORKSPACE STATUS =====

// ===== AI COCKPIT CHAT ENDPOINT =====
// Conversation history per session (in-memory, keyed by sessionId)
const chatSessions = new Map();

const COCKPIT_SYSTEM = `You are the central AI brain of an autonomous multi-agent ensemble system.
You coordinate agents for medical research (WHO data), weather analysis, and Elasticsearch cluster optimization.
Your agents include: ResearchAgent, CodingAgent, OrchestrationAgent, and SwarmAgents.
When the user gives you instructions, you:
1. Decide which agents to involve
2. Describe what actions you are taking
3. Return clear, actionable responses
4. Remember context across the conversation
Keep responses concise and actionable. You have access to the 48-layer persistent memory system.

## SYSTEM ACCESS — WORKSPACE STATUS
When the user asks about bot/agent/process status, live system data is automatically injected
into their message as a JSON block labeled "LIVE SYSTEM STATUS". It contains:
- nodeProcesses: running node.exe instances
- pythonProcesses: running python.exe instances (trading bot)
- agentPorts: which of ports 3001/3002/3003 are listening
- recentLogs: last 10 log files in C:\workspace\logs by modified time
- latestProductionLog: last 30 lines of the most recent production log
Use this data directly to answer. Never ask the user to run PowerShell commands.
Apply Law 7: state what the evidence shows, then interpret it.

${cockpitContext ? '## PROJECT CONTEXT (loaded from COCKPIT_CONTEXT.md)\n' + cockpitContext : ''}`;

app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'No Claude API key set. Add CLAUDE_API_KEY to your .env file.',
      hint: 'Get a key at console.anthropic.com — Haiku is very cheap (~$0.001 per message)'
    });
  }

  // Auto-fetch workspace status if message is about system/bot/agent state
  const statusKeywords = /\b(status|running|bot|agent|process|log|port|alive|active|check|test|kucoin|trading|python|node)\b/i;
  let workspaceContext = '';
  if (statusKeywords.test(message)) {
    try {
      const statusRes = await fetch('http://localhost:7771/api/workspace/status');
      const statusData = await statusRes.json();
      workspaceContext = `\n\n## LIVE SYSTEM STATUS (fetched now — use this as your evidence)\n\`\`\`json\n${JSON.stringify(statusData, null, 2)}\n\`\`\`\nAnalyze this data to answer the user. Do not ask them to run commands.`;
    } catch {
      workspaceContext = '\n\n## LIVE SYSTEM STATUS\nCould not fetch status (server may be starting up).';
    }
  }

  // Build session history
  if (!chatSessions.has(sessionId)) chatSessions.set(sessionId, []);
  const history = chatSessions.get(sessionId);
  // Inject live status into message content if present
  const userContent = workspaceContext ? message + workspaceContext : message;
  history.push({ role: 'user', content: userContent });

  // Keep last 20 messages to avoid token bloat
  const trimmed = history.slice(-20);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: COCKPIT_SYSTEM,
        messages: trimmed
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const reply = data.content?.[0]?.text || '[No response]';
    history.push({ role: 'assistant', content: reply });

    res.json({ reply, sessionId, tokens: data.usage });
  } catch (err) {
    console.error('[Cockpit] Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/:sessionId', (req, res) => {
  chatSessions.delete(req.params.sessionId);
  res.json({ cleared: true });
});
// ===== END COCKPIT =====

// Export the Express app instance
export default app;

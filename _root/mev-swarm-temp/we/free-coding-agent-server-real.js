/**
 * FREE CODING AGENT - REAL ENSEMBLE SERVER
 * Replaces the simulated facade with real OpenRouter API calls.
 * Each agent has a distinct system prompt and streams real LLM responses.
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';

const PORT = process.env.PORT || 3000;
// Prefer environment variable; fallback to a per-user file at ~/.openrouter_key
const envKey = process.env.OPENROUTER_API_KEY || '';
let OPENROUTER_API_KEY = envKey;
if (!OPENROUTER_API_KEY) {
  try {
    const keyPath = path.join(os.homedir(), '.openrouter_key');
    if (existsSync(keyPath)) {
      OPENROUTER_API_KEY = readFileSync(keyPath, 'utf8').trim();
    }
  } catch (e) { /* ignore read errors */ }
}
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Free models — tried in order on rate limit
const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemma-7b-it:free',
];

// Real system prompts per agent role
const AGENT_PROMPTS = {
  'Code Generation': `You are an expert software engineer and coding assistant embedded in a multi-agent AI cockpit.
Your role: write clean, correct, production-ready code. Analyze the task, identify the approach, then provide working implementation.
Be direct and technical. Include code with explanations. Follow best practices.`,

  'Data Engineering': `You are a data engineering specialist in a multi-agent AI cockpit.
Your role: design schemas, build ETL pipelines, validate data, optimize queries.
Analyze the task from a data perspective. Identify data flows, transformations, and quality concerns.
Provide concrete data models, SQL, or pipeline code as appropriate.`,

  'Analysis': `You are a systems analyst in a multi-agent AI cockpit.
Your role: analyze requirements, decompose problems, identify edge cases, and provide architectural insights.
Break down the task systematically. Identify assumptions, risks, and dependencies. Recommend approaches.`,

  'Planning': `You are a strategic planner in a multi-agent AI cockpit.
Your role: create structured action plans, break work into phases, identify blockers, and track dependencies.
Produce clear step-by-step plans with priorities, estimates, and success criteria.`,

  'Review': `You are a senior code reviewer in a multi-agent AI cockpit.
Your role: review code and designs for correctness, security, performance, and maintainability.
Identify issues, suggest improvements, and verify requirements are met. Be thorough and constructive.`,

  'Security': `You are a security specialist in a multi-agent AI cockpit.
Your role: identify vulnerabilities, assess risks, and enforce security best practices.
Analyze the task for OWASP issues, authentication flaws, data exposure, injection risks. Provide mitigations.`,

  'Testing': `You are a QA engineer and test architect in a multi-agent AI cockpit.
Your role: design test strategies, write test cases, and ensure coverage.
Create unit tests, integration tests, and edge case scenarios. Identify what can fail and how to detect it.`,

  'DevOps': `You are a DevOps and infrastructure engineer in a multi-agent AI cockpit.
Your role: handle deployment, CI/CD, containerization, monitoring, and infrastructure.
Provide Docker configs, deployment scripts, health checks, and operational runbooks.`,
};

// Default for unknown agents
const DEFAULT_PROMPT = `You are a specialized AI agent in a multi-agent coding cockpit.
Analyze the task thoroughly and provide expert assistance. Be direct, technical, and actionable.`;

// --- OpenRouter streaming call ---
async function* callOpenRouter(agentName, task, sessionHistory = []) {
  const systemPrompt = AGENT_PROMPTS[agentName] || DEFAULT_PROMPT;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sessionHistory,
    { role: 'user', content: task },
  ];

  let lastError = null;

  for (const model of FREE_MODELS) {
    try {
      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'SNAC Free Coding Agent',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429) {
          console.warn(`⚠️  Rate limited on ${model}, trying next...`);
          lastError = new Error(`Rate limited: ${err}`);
          continue;
        }
        throw new Error(`OpenRouter ${response.status}: ${err}`);
      }

      // Stream SSE response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));

        for (const line of lines) {
          const data = line.replace(/^data:\s*/, '').trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch { /* skip malformed */ }
        }
      }

      return; // success

    } catch (err) {
      lastError = err;
      console.warn(`⚠️  Error with model ${model}: ${err.message}`);
    }
  }

  throw lastError || new Error('All OpenRouter models failed');
}

// --- HTTP server (health check) ---
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', mode: 'real', provider: 'openrouter' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// --- WebSocket server ---
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const sessionHistory = {};
  console.log(`🔗 Client connected: ${sessionId}`);

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    console.log(`📨 Message from ${sessionId}: ${msg.type}`);

    // --- init_ensemble ---
    if (msg.type === 'init_ensemble') {
      console.log(`🔧 Initializing REAL ensemble (OpenRouter)`);
      ws.send(JSON.stringify({
        type: 'ensemble_initialized',
        agents: Object.keys(AGENT_PROMPTS),
        mode: 'real',
        provider: 'openrouter',
      }));
      console.log(`✅ Real ensemble ready — ${Object.keys(AGENT_PROMPTS).length} agents via OpenRouter`);
      return;
    }

    // --- ensemble_chat ---
    if (msg.type === 'ensemble_chat') {
      const { task, agents = ['Code Generation', 'Data Engineering'], mode = 'parallel', sessionKey } = msg;

      if (!task) return;

      // Initialize history per session key
      const histKey = sessionKey || sessionId;
      if (!sessionHistory[histKey]) sessionHistory[histKey] = [];

      console.log(`📝 Real ensemble chat: ${JSON.stringify({ task: task.slice(0, 50), agents, mode })}`);

      // Run selected agents (parallel or sequential)
      const runAgent = async (agentName) => {
        try {
          // Signal agent start
          ws.send(JSON.stringify({
            type: 'agent_start',
            agent: agentName,
            timestamp: new Date().toISOString(),
          }));

          let fullResponse = '';

          // Stream real tokens
          for await (const token of callOpenRouter(agentName, task, sessionHistory[histKey])) {
            fullResponse += token;
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'agent_token',
                agent: agentName,
                token,
              }));
            }
          }

          // Signal agent done
          ws.send(JSON.stringify({
            type: 'agent_complete',
            agent: agentName,
            response: fullResponse,
            timestamp: new Date().toISOString(),
          }));

          return { agent: agentName, response: fullResponse };

        } catch (err) {
          console.error(`❌ Agent ${agentName} failed: ${err.message}`);
          ws.send(JSON.stringify({
            type: 'agent_error',
            agent: agentName,
            error: err.message,
          }));
          return { agent: agentName, error: err.message };
        }
      };

      let results;

      if (mode === 'parallel') {
        results = await Promise.all(agents.map(runAgent));
      } else {
        results = [];
        for (const agent of agents) {
          const result = await runAgent(agent);
          results.push(result);
        }
      }

      // Add to history
      const agentSummary = results
        .filter(r => r.response)
        .map(r => `[${r.agent}]: ${r.response}`)
        .join('\n\n');

      sessionHistory[histKey].push(
        { role: 'user', content: task },
        { role: 'assistant', content: agentSummary || 'Agents completed with errors.' },
      );

      // Keep history manageable
      if (sessionHistory[histKey].length > 20) {
        sessionHistory[histKey] = sessionHistory[histKey].slice(-20);
      }

      // All done
      ws.send(JSON.stringify({
        type: 'ensemble_complete',
        agents: results.map(r => r.agent),
        timestamp: new Date().toISOString(),
      }));

      return;
    }

    // --- reset_session ---
    if (msg.type === 'reset_session') {
      const histKey = msg.sessionKey || sessionId;
      sessionHistory[histKey] = [];
      ws.send(JSON.stringify({ type: 'session_reset', sessionKey: histKey }));
      return;
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Client disconnected: ${sessionId}`);
  });

  ws.on('error', (err) => {
    console.error(`❌ WebSocket error for ${sessionId}: ${err.message}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 REAL Free Coding Agent running on port ${PORT}`);
  console.log(`🤖 Provider: OpenRouter (${FREE_MODELS[0]} + ${FREE_MODELS.length - 1} fallbacks)`);
  console.log(`🔑 API key: ${OPENROUTER_API_KEY ? 'configured ✅' : 'MISSING ❌'}`);
});

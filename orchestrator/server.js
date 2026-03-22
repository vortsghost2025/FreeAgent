// Orchestrator Server for Oracle Cloud Shell
// This is the "brain" that coordinates agents

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { getOrchestrator, detectFileAccessRequirement, createDelegationResponse } = require('./orchestrator');

const app = express();
const PORT = process.env.PORT || 3847;

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get('/health', async (req, res) => {
  const orchestrator = getOrchestrator();
  const health = await orchestrator.healthCheck();
  res.json(health);
});

// =============================================================================
// CAPABILITY ROUTING: Test endpoints
// =============================================================================

// Check if a message would trigger file delegation
app.post('/capability/check', async (req, res) => {
  const { message, tools } = req.body;
  const orchestrator = getOrchestrator();
  const result = orchestrator.checkFileAccessRequirement(message, { tools });
  res.json(result);
});

// Get capability routing status
app.get('/capability/status', async (req, res) => {
  const orchestrator = getOrchestrator();
  const status = orchestrator.getCapabilityRoutingStatus();
  res.json(status);
});

// Enable/disable capability routing
app.post('/capability/toggle', async (req, res) => {
  const { enabled } = req.body;
  const orchestrator = getOrchestrator();
  orchestrator.setCapabilityRouting(enabled);
  res.json({ enabled: orchestrator.capabilityRouter?.enabled });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  const orchestrator = getOrchestrator();
  const result = await orchestrator.process({ message });
  res.json(result);
});

// Session endpoints
app.post('/session', async (req, res) => {
  const { name } = req.body;
  const orchestrator = getOrchestrator();
  const session = await orchestrator.createSession(name);
  res.json(session);
});

app.get('/sessions', async (req, res) => {
  const orchestrator = getOrchestrator();
  const sessions = await orchestrator.listSessions();
  res.json(sessions);
});

app.get('/session/:id', async (req, res) => {
  const { id } = req.params;
  const orchestrator = getOrchestrator();
  const session = await orchestrator.getSession(id);
  res.json(session);
});

// Memory endpoints
app.post('/memory', async (req, res) => {
  const { content, metadata } = req.body;
  const orchestrator = getOrchestrator();
  if (!orchestrator.memory) {
    return res.status(503).json({ error: 'Memory not initialized' });
  }
  await orchestrator.memory.add(content, metadata);
  res.json({ success: true });
});

app.get('/memory/search', async (req, res) => {
  const { query } = req.query;
  const orchestrator = getOrchestrator();
  const results = await orchestrator.memory.search(query);
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Orchestrator running on port ${PORT}`);
});

// Initialize orchestrator
getOrchestrator().then(() => {
  console.log('[Orchestrator] Ready');
});

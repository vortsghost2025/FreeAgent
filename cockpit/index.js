/**
 * FreeAgent Cockpit - Main JavaScript
 * Handles WebSocket communication, UI state, and user interactions
 */

// Configuration
const CONFIG = {
  WS_URL: `ws://${window.location.host}/ws`,
  API_URL: window.location.origin,
  RECONNECT_DELAY: 3000,
  HEALTH_CHECK_INTERVAL: 15000,
  MEMORY_REFRESH_INTERVAL: 10000,
  SESSION_REFRESH_INTERVAL: 15000,
  MAX_LOGS: 150,
  MAX_MEMORIES: 20
};

// State
const state = {
  ws: null,
  connected: false,
  reconnectAttempts: 0,
  startTime: Date.now(),
  selectedModel: 'auto',
  selectedAgent: 'orchestrator',
  currentSession: null,
  sessions: [],
  memories: [],
  chatHistory: [], // Track conversation history for context
  health: {
    local: false,
    claude: false,
    gemini: false,
    minimax: false,
    memory: false,
    sessions: false
  },
  agentStatus: {
    claw: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
    kilo: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
    coder: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
    researcher: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
    claude_code: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 }
  },
  preferKiloFallback: false,
  memoryStats: {
    total: 0,
    collections: []
  },
  pendingRequest: false
};

// DOM Elements
const elements = {
  // Header
  uptime: document.getElementById('uptime'),
  wsStatus: document.getElementById('ws-status'),
  
  // Agents
  agentCards: document.querySelectorAll('.agent-card'),
  
  // Toolbar
  modelSelect: document.getElementById('model-select'),
  agentSelect: document.getElementById('agent-select'),
  sessionBtn: document.getElementById('session-btn'),
  
  // Chat
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  
  // Status
  statusLocal: document.getElementById('status-local'),
  statusClaude: document.getElementById('status-claude'),
  statusGemini: document.getElementById('status-gemini'),
  statusMinimax: document.getElementById('status-minimax'),
  statusMemory: document.getElementById('status-memory'),
  statusSessions: document.getElementById('status-sessions'),
  
  // Memory
  memoryCount: document.getElementById('memory-count'),
  memoryList: document.getElementById('memory-list'),
  
  // Sessions
  sessionList: document.getElementById('session-list'),
  
  // Logs
  logContainer: document.getElementById('log-container'),
  
  // Fallback toggle
  fallbackToggle: document.getElementById('fallback-toggle')
};

// Logging
function log(message, type = 'info') {
  const time = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-message">${escapeHtml(message)}</span>
  `;
  
  elements.logContainer.appendChild(entry);
  
  // Trim logs
  while (elements.logContainer.children.length > CONFIG.MAX_LOGS) {
    elements.logContainer.removeChild(elements.logContainer.firstChild);
  }
  
  // Auto-scroll
  elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update uptime
function updateUptime() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  if (hours > 0) {
    elements.uptime.textContent = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    elements.uptime.textContent = `${minutes}m ${seconds}s`;
  } else {
    elements.uptime.textContent = `${seconds}s`;
  }
}

// WebSocket
function connectWebSocket() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    return;
  }
  
  log('Connecting to server...', 'info');
  
  state.ws = new WebSocket(CONFIG.WS_URL);
  
  state.ws.onopen = () => {
    state.connected = true;
    state.reconnectAttempts = 0;
    
    document.getElementById('connection-status').classList.remove('disconnected');
    document.getElementById('connection-dot').classList.add('connected');
    
    log('Connected to FreeAgent', 'success');
    
    // Initial data fetch
    requestHealthCheck();
    requestSessions();
    requestMemoryStats();
  };
  
  state.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (e) {
      log(`Failed to parse message: ${e.message}`, 'error');
    }
  };
  
  state.ws.onclose = () => {
    state.connected = false;
    
    document.getElementById('connection-status').classList.add('disconnected');
    document.getElementById('connection-dot').classList.remove('connected');
    
    log('Disconnected from server', 'warning');
    
    // Reconnect
    state.reconnectAttempts++;
    const delay = Math.min(CONFIG.RECONNECT_DELAY * Math.pow(1.5, state.reconnectAttempts), 30000);
    log(`Reconnecting in ${Math.ceil(delay/1000)}s...`, 'info');
    setTimeout(connectWebSocket, delay);
  };
  
  state.ws.onerror = (error) => {
    log('WebSocket error', 'error');
  };
}

function sendMessage(data) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(data));
  } else {
    log('Not connected - message not sent', 'error');
  }
}

function handleMessage(data) {
  switch (data.type) {
    case 'orchestrator_health':
      handleHealthResponse(data);
      break;
      
    case 'orchestrator_response':
      handleChatResponse(data);
      break;
      
    case 'memory_results':
      handleMemoryResults(data);
      break;
      
    case 'session_list':
      handleSessionList(data);
      break;
      
    case 'session_created':
      handleSessionCreated(data);
      break;
      
    case 'session_data':
      handleSessionData(data);
      break;
      
    case 'memory_stats':
      handleMemoryStats(data);
      break;
      
    case 'error':
      log(`Error: ${data.error}`, 'error');
      state.pendingRequest = false;
      hideTypingIndicator();
      break;
      
    default:
      // log(`Unknown message: ${data.type}`, 'info');
  }
}

// Health
function requestHealthCheck() {
  sendMessage({ type: 'orchestrator_health' });
}

function handleHealthResponse(data) {
  state.health = {
    local: data.local || false,
    claude: data.claude || false,
    gemini: data.gemini || false,
    minimax: data.minimax || false,
    memory: data.memory || false,
    sessions: data.sessions || false
  };
  
  updateHealthDisplay();
  updateAgentCards();
  
  log('Health check complete', 'success');
}

function updateHealthDisplay() {
  const { local, claude, gemini, minimax, memory, sessions } = state.health;
  
  updateStatusElement(elements.statusLocal, local);
  updateStatusElement(elements.statusClaude, claude);
  updateStatusElement(elements.statusGemini, gemini);
  updateStatusElement(elements.statusMinimax, minimax);
  updateStatusElement(elements.statusMemory, memory);
  updateStatusElement(elements.statusSessions, sessions);
}

function updateStatusElement(element, connected) {
  if (!element) return;
  element.textContent = connected ? '●' : '○';
  element.className = `status-item-value ${connected ? 'connected' : 'disconnected'}`;
}

function updateAgentCards() {
  const agentStatuses = {
    'claude': state.health.claude,
    'gemini': state.health.gemini,
    'local': state.health.local,
    'minimax': state.health.minimax,
    'memory': state.health.memory,
    'sessions': state.health.sessions
  };
  
  elements.agentCards.forEach(card => {
    const agent = card.dataset.agent;
    const statusEl = card.querySelector('.agent-status');
    const status = agentStatuses[agent];
    
    if (statusEl) {
      statusEl.className = `agent-status ${status ? 'connected' : 'disconnected'}`;
      statusEl.innerHTML = `<span class="agent-status-dot"></span> ${status ? 'Connected' : 'Disconnected'}`;
    }
  });
}

// Chat
let lastSentMessage = ''; // Track last message for history

function sendChatMessage() {
  const text = elements.chatInput.value.trim();
  if (!text || state.pendingRequest) return;
  
  // Track for history before clearing
  lastSentMessage = text;
  
  // Add user message
  addMessage('user', text);
  elements.chatInput.value = '';
  
  // Show typing
  showTypingIndicator();
  state.pendingRequest = true;
  
  const message = {
    type: 'orchestrator_chat',
    message: text,
    model: state.selectedModel,
    history: state.chatHistory // Send conversation history for context retention
  };
  
  if (state.currentSession) {
    message.sessionId = state.currentSession;
  }
  
  if (state.selectedAgent && state.selectedAgent !== 'orchestrator') {
    message.agent = state.selectedAgent;
  }
  
  log(`Sending: ${text.substring(0, 50)}...`, 'info');
  sendMessage(message);
}

function handleChatResponse(data) {
  state.pendingRequest = false;
  hideTypingIndicator();
  
  // Add to conversation history BEFORE adding to UI (since input gets cleared)
  if (lastSentMessage) {
    state.chatHistory.push({ role: 'user', content: lastSentMessage });
    lastSentMessage = '';
  }
  state.chatHistory.push({ role: 'assistant', content: data.text });
  
  // Limit history to last 20 messages to prevent bloat
  if (state.chatHistory.length > 20) {
    state.chatHistory = state.chatHistory.slice(-20);
  }
  
  addMessage('assistant', data.text, data.agent);
  log(`Response from ${data.agent || 'orchestrator'} (history: ${state.chatHistory.length} msgs)`, 'success');
}

function addMessage(role, text, agent = null) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  
  const time = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const label = role === 'user' ? 'You' : (agent ? capitalizeFirst(agent) : 'Assistant');
  
  // Format content
  const formattedContent = formatMessage(text);
  
  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-agent">${escapeHtml(label)}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${formattedContent}</div>
  `;
  
  elements.chatMessages.appendChild(messageEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function formatMessage(text) {
  // Escape HTML first
  let formatted = escapeHtml(text);
  
  // Code blocks
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showTypingIndicator() {
  const existing = document.querySelector('.typing-indicator');
  if (existing) return;
  
  const typingEl = document.createElement('div');
  typingEl.className = 'message assistant typing-indicator';
  typingEl.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  elements.chatMessages.appendChild(typingEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function hideTypingIndicator() {
  const typing = document.querySelector('.typing-indicator');
  if (typing) {
    typing.remove();
  }
}

// Memory
function requestMemoryStats() {
  sendMessage({ type: 'orchestrator_memory_search', query: '*', limit: CONFIG.MAX_MEMORIES });
}

function handleMemoryResults(data) {
  state.memories = data.results || [];
  updateMemoryDisplay();
}

function handleMemoryStats(data) {
  state.memoryStats = data;
  updateMemoryStatsDisplay();
}

function updateMemoryDisplay() {
  if (state.memories.length === 0) {
    elements.memoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🧠</div>
        <div class="empty-state-text">No memories yet</div>
      </div>
    `;
    return;
  }
  
  elements.memoryList.innerHTML = state.memories.slice(0, CONFIG.MAX_MEMORIES).map(memory => {
    const time = memory.createdAt ? new Date(memory.createdAt).toLocaleString() : 'Unknown';
    const content = memory.content || memory.text || '';
    
    return `
      <div class="memory-item">
        <div class="memory-item-time">${time}</div>
        <div class="memory-item-content">${escapeHtml(content.substring(0, 150))}</div>
      </div>
    `;
  }).join('');
}

function updateMemoryStatsDisplay() {
  if (elements.memoryCount) {
    elements.memoryCount.textContent = `${state.memoryStats.total || state.memories.length} memories`;
  }
}

// Sessions
function requestSessions() {
  sendMessage({ type: 'orchestrator_session_list' });
}

function handleSessionList(data) {
  state.sessions = data.sessions || [];
  updateSessionDisplay();
}

function handleSessionCreated(data) {
  log(`Created session: ${data.session?.name || 'unnamed'}`, 'success');
  requestSessions();
}

function handleSessionData(data) {
  log(`Switched to session: ${data.session?.name || 'unknown'}`, 'info');
}

function updateSessionDisplay() {
  if (state.sessions.length === 0) {
    elements.sessionList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No sessions</div>
      </div>
    `;
    return;
  }
  
  elements.sessionList.innerHTML = state.sessions.map(session => `
    <div class="session-item ${session.id === state.currentSession ? 'active' : ''}" data-id="${session.id}">
      <div class="session-info">
        <div class="session-name">${escapeHtml(session.name || 'Unnamed')}</div>
        <div class="session-meta">${session.messageCount || 0} messages</div>
      </div>
      <div class="session-actions">
        <button class="session-action-btn delete" data-id="${session.id}" title="Delete">✕</button>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  elements.sessionList.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete')) {
        e.stopPropagation();
        const id = e.target.dataset.id;
        if (confirm('Delete this session?')) {
          sendMessage({ type: 'orchestrator_session_delete', sessionId: id });
        }
        return;
      }
      
      const id = item.dataset.id;
      state.currentSession = id;
      sendMessage({ type: 'orchestrator_session_get', sessionId: id });
      updateSessionDisplay();
    });
  });
}

function createSession() {
  const name = prompt('Session name:');
  if (!name) return;
  
  sendMessage({
    type: 'orchestrator_session_create',
    name,
    description: ''
  });
}

// Agent Status (Claw, Kilo, Coder, Researcher)
async function fetchAgentStatus() {
  try {
    const response = await fetch(`${CONFIG.API_URL}/api/agents/status`);
    const data = await response.json();
    state.agentStatus = agents;
    updateAgentStatusCards();
  } catch (err) {
    console.error('Failed to fetch agent status:', err);
  }
}

function updateAgentStatusCards() {
  const agents = ['claw', 'kilo', 'coder', 'researcher', 'claude_code'];
  agents.forEach(agent => {
    const status = state.agentStatus[agent];
    if (!status) {
      // Set default offline status if agent not found
      const card = document.querySelector(`.agent-card[data-agent="${agent}"]`);
      if (card) {
        const statusEl = card.querySelector('.agent-status');
        const lastTaskEl = card.querySelector('.last-task');
        if (statusEl) {
          statusEl.className = 'agent-status disconnected';
          statusEl.innerHTML = '<span class="agent-status-dot"></span> Offline';
        }
        if (lastTaskEl) {
          lastTaskEl.textContent = 'No tasks';
        }
      }
      return;
    }

    const card = document.querySelector(`.agent-card[data-agent="${agent}"]`);
    if (!card) return;

    const statusEl = card.querySelector('.agent-status');
    const lastTaskEl = card.querySelector('.last-task');

    // Determine health from heartbeat (15s timeout for better reliability)
    const now = Date.now();
    const isHealthy = status.heartbeat && (now - status.heartbeat < 20000);

    if (statusEl) {
      let statusClass, statusText;

      if (status.status === 'running') {
        statusClass = 'running';
        statusText = 'Running';
      } else if (status.status === 'online' || isHealthy) {
        statusClass = 'connected';
        statusText = 'Online';
      } else if (status.status === 'offline') {
        statusClass = 'disconnected';
        statusText = 'Offline';
      } else {
        statusClass = isHealthy ? 'connected' : 'disconnected';
        statusText = isHealthy ? 'Active' : 'Idle';
      }

      statusEl.className = `agent-status ${statusClass}`;
      statusEl.innerHTML = `<span class="agent-status-dot"></span> ${statusText}`;
    }

    if (lastTaskEl) {
      lastTaskEl.textContent = status.lastTask ? status.lastTask.substring(0, 30) + '...' : 'No tasks';
    }
  });
}

// Fallback Toggle
async function fetchFallbackStatus() {
  try {
    const response = await fetch(`${CONFIG.API_URL}/api/fallback/toggle`);
    const data = await response.json();
    state.preferKiloFallback = data.preferKiloFallback;
    if (elements.fallbackToggle) {
      elements.fallbackToggle.checked = data.preferKiloFallback;
    }
  } catch (err) {
    console.error('Failed to fetch fallback status:', err);
  }
}

async function toggleFallback(enabled) {
  try {
    await fetch(`${CONFIG.API_URL}/api/fallback/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    state.preferKiloFallback = enabled;
    log(`Kilo fallback ${enabled ? 'enabled' : 'disabled'}`, 'info');
  } catch (err) {
    console.error('Failed to toggle fallback:', err);
  }
}

// Model/Agent Selection
function handleModelChange(e) {
  state.selectedModel = e.target.value;
  log(`Model: ${state.selectedModel}`, 'info');
}

function handleAgentChange(e) {
  state.selectedAgent = e.target.value;
  
  // Update active card
  elements.agentCards.forEach(card => {
    card.classList.toggle('active', card.dataset.agent === state.selectedAgent);
  });
  
  log(`Agent: ${state.selectedAgent}`, 'info');
}

// Event Listeners
function setupEventListeners() {
  // Send button
  elements.sendBtn.addEventListener('click', sendChatMessage);
  
  // Chat input
  elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Model/Agent selects
  elements.modelSelect.addEventListener('change', handleModelChange);
  elements.agentSelect.addEventListener('change', handleAgentChange);
  
  // Session button
  elements.sessionBtn.addEventListener('click', createSession);
  
  // Fallback toggle
  if (elements.fallbackToggle) {
    elements.fallbackToggle.addEventListener('change', (e) => {
      toggleFallback(e.target.checked);
    });
  }
  
  // Agent cards
  elements.agentCards.forEach(card => {
    card.addEventListener('click', () => {
      const agent = card.dataset.agent;
      elements.agentSelect.value = agent;
      handleAgentChange({ target: elements.agentSelect });
    });
  });
}

// Initialize
function init() {
  setupEventListeners();
  connectWebSocket();
  
  // Periodic updates
  setInterval(updateUptime, 1000);
  setInterval(requestHealthCheck, CONFIG.HEALTH_CHECK_INTERVAL);
  setInterval(requestMemoryStats, CONFIG.MEMORY_REFRESH_INTERVAL);
  setInterval(requestSessions, CONFIG.SESSION_REFRESH_INTERVAL);
  
  // Agent status polling (Claw, Kilo, Coder, Researcher)
  setInterval(fetchAgentStatus, 10000);
  fetchAgentStatus();
  
  // Fallback toggle status
  fetchFallbackStatus();
  
  log('FreeAgent Cockpit initialized', 'success');
}

// Start
document.addEventListener('DOMContentLoaded', init);

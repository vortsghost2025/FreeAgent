/**
 * Mega Cockpit - Main JavaScript
 * Initializes the cockpit UI and provides functionality
 */

// State management
let currentSystem = 'kilo';
let ws = null;
const selectedAgents = new Set();
const chatHistories = {};
const responseTimes = [];
let tasksCompleted = 0;

// System names mapping
const systemNames = {
  kilo: '👑 Kilo Master',
  claw: '🦞 Claw',
  simple_ensemble: '⚡ Simple Ensemble',
  federation: '🏛️ Federation',
  distributed: '🌐 Distributed'
};

/**
 * Initialize application when DOM is ready
 */
function init() {
  console.log('🚀 Mega Cockpit initializing...');
  
  // Initialize WebSocket connection
  initWebSocket();
  
  // Load initial system
  loadSystem(currentSystem);
  
  // Setup event listeners
  setupEventListeners();
  
  // Start status refresh interval
  setInterval(refreshStatus, 30000);
  
  console.log('✅ Mega Cockpit initialized');
}

/**
 * DOM ready handler
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Setup event listeners for UI interactions
 */
function setupEventListeners() {
  // Chat input form submission
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }
  
  // System tab clicks
  document.querySelectorAll('.system-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const system = tab.dataset.system;
      if (system) {
        switchSystem(system);
      }
    });
  });
  
  // Clear chat button
  const clearBtn = document.getElementById('clearChatBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearChat);
  }
  
  // Export chat button
  const exportBtn = document.getElementById('exportChatBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCombinedChat);
  }
}

/**
 * Handle chat form submission
 */
async function handleChatSubmit(event) {
  event.preventDefault();
  
  const input = document.getElementById('chatInput');
  const message = input?.value?.trim();
  
  if (!message) return;
  
  // Clear input
  if (input) input.value = '';
  
  // Add user message
  addUserMessage(message);
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    const startTime = Date.now();
    
    // Send to backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: message }],
        system: currentSystem
      })
    });
    
    const data = await response.json();
    const executionTime = Date.now() - startTime;
    
    // Remove typing indicator
    removeTypingIndicator();
    
    // Add AI response
    if (data.reply?.content) {
      addAIMessage(data.reply.content);
    } else if (data.error) {
      addAIMessage(`Error: ${data.error}`);
    }
    
    // Update metrics
    updateMetrics(executionTime);
    
  } catch (error) {
    console.error('Chat error:', error);
    removeTypingIndicator();
    addAIMessage('Failed to send message. Please try again.');
  }
}

// ==================== WebSocket Functions ====================

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
  const wsUrl = "ws://localhost:4002";
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      updateConnectionStatus('connected');
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateConnectionStatus('error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      updateConnectionStatus('disconnected');
      ws = null;
      // Attempt reconnection after 2 seconds
      setTimeout(initWebSocket, 2000);
    };
    
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    updateConnectionStatus('error');
    ws = null;
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(data) {
  console.log('WebSocket message:', data);
  
  // Handle different message types
  if (data.type === 'task_update') {
    // Update task status in UI
    const taskEl = document.getElementById(`task-${data.taskId}`);
    if (taskEl) {
      taskEl.textContent = data.status;
    }
  } else if (data.type === 'chat_message') {
    // Add incoming chat message
    addAIMessage(data.message, data.taskId, data.sender);
  }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(status) {
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    statusEl.className = `connection-status ${status}`;
    statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// ==================== System Functions ====================

/**
 * Switch between different AI systems
 */
function switchSystem(system) {
  console.log('🔄 switchSystem() - switching to:', system);
  
  // Save current chat to history
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    const messages = chatContainer.querySelectorAll('.message');
    chatHistories[currentSystem] = [];
    
    messages.forEach(msg => {
      const header = msg.querySelector('.message-header')?.textContent || '';
      const body = msg.querySelector('.message-body')?.innerHTML || '';
      if (body && !body.includes('Welcome to') && !body.includes('Chat cleared')) {
        const isUser = msg.classList.contains('user');
        chatHistories[currentSystem].push({
          role: isUser ? 'user' : 'ai',
          header,
          body,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  // Update system
  currentSystem = system;
  
  // Update tabs
  document.querySelectorAll('.system-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.system === system) {
      tab.classList.add('active');
    }
  });
  
  // Reset agents
  selectedAgents.clear();
  
  // Load system and history
  loadSystem(system);
  loadChatHistory(system);
}

/**
 * Load a specific system configuration
 */
function loadSystem(system) {
  console.log('Loading system:', system);
  // System-specific loading logic can be added here
  // For now, just show a welcome message if chat is empty
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer && chatContainer.children.length === 0) {
    addAIMessage(`Welcome to ${systemNames[system] || system}! How can I help you today?`);
  }
}

/**
 * Load chat history for a specific system
 */
function loadChatHistory(system) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  
  const history = chatHistories[system] || [];
  
  chatContainer.innerHTML = '';
  
  if (history.length === 0) {
    addAIMessage(`Welcome to ${systemNames[system] || system}! How can I help you today?`);
  } else {
    history.forEach(msg => {
      const messageEl = document.createElement('div');
      messageEl.className = `message ${msg.role}`;
      messageEl.innerHTML = `
        <div class="message-content">
          <div class="message-header">${msg.header}</div>
          <div class="message-body">${msg.body}</div>
        </div>
      `;
      chatContainer.appendChild(messageEl);
    });
    scrollToBottom();
  }
}

// ==================== Message Functions ====================

/**
 * Add a user message to the chat
 */
function addUserMessage(message) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = 'message user';
  messageEl.innerHTML = `
    <div class="message-content">
      <div class="message-header">You</div>
      <div class="message-body">${escapeHtml(message)}</div>
    </div>
  `;
  chatContainer.appendChild(messageEl);
  scrollToBottom();
}

/**
 * Add an AI message to the chat
 */
function addAIMessage(message, taskId = null, sender = '🤖 System') {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = 'message ai';
  messageEl.innerHTML = `
    <div class="message-content">
      <div class="message-header">${sender} ${taskId ? `(${taskId})` : ''}</div>
      <div class="message-body">${formatMessage(message)}</div>
    </div>
  `;
  chatContainer.appendChild(messageEl);
  scrollToBottom();
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  
  const typingEl = document.createElement('div');
  typingEl.id = 'typingIndicator';
  typingEl.className = 'message ai';
  typingEl.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatContainer.appendChild(typingEl);
  scrollToBottom();
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
  const typingEl = document.getElementById('typingIndicator');
  if (typingEl) typingEl.remove();
}

/**
 * Format message for display
 */
function formatMessage(message) {
  if (typeof message === 'object') {
    return `<pre>${escapeHtml(JSON.stringify(message, null, 2))}</pre>`;
  }
  return escapeHtml(message);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Scroll chat container to bottom
 */
function scrollToBottom() {
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// ==================== Metrics Functions ====================

/**
 * Update performance metrics
 */
function updateMetrics(executionTime) {
  tasksCompleted++;
  responseTimes.push(executionTime);
  
  const tasksEl = document.getElementById('tasksCompleted');
  if (tasksEl) {
    tasksEl.textContent = tasksCompleted;
  }
  
  const avgEl = document.getElementById('avgResponse');
  if (avgEl && responseTimes.length > 0) {
    const avgResponse = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
    avgEl.textContent = `${avgResponse} ms`;
  }
}

// ==================== Status Functions ====================

/**
 * Refresh status from backend
 */
async function refreshStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    updateStatus(data);
    await updateProviderStatus();
  } catch (error) {
    console.error('Refresh error:', error);
  }
}

/**
 * Update status display
 */
function updateStatus(data) {
  if (data) console.log('Status updated:', data);
}

/**
 * Update provider status indicators
 */
async function updateProviderStatus() {
  try {
    const response = await fetch('/api/providers/status');
    const data = await response.json();
    
    if (data.success && data.providers) {
      const ollama = data.providers.ollama || {};
      const groq = data.providers.groq || {};
      const openai = data.providers.openai || {};
      
      // Update Ollama status
      const ollamaEl = document.getElementById('ollamaStatus');
      if (ollamaEl) {
        if (ollama.healthy) {
          ollamaEl.textContent = '✅ Online';
          ollamaEl.className = 'metric-value success';
        } else if (ollama.enabled !== false) {
          ollamaEl.textContent = '⚠️ Offline';
          ollamaEl.className = 'metric-value warning';
        } else {
          ollamaEl.textContent = 'Disabled';
          ollamaEl.className = 'metric-value';
        }
      }
      
      // Update Groq status
      const groqEl = document.getElementById('groqStatus');
      if (groqEl) {
        if (groq.healthy) {
          groqEl.textContent = '✅ Online';
          groqEl.className = 'metric-value success';
        } else if (groq.enabled !== false) {
          groqEl.textContent = '⚠️ Offline';
          groqEl.className = 'metric-value warning';
        } else {
          groqEl.textContent = 'Disabled';
          groqEl.className = 'metric-value';
        }
      }
      
      // Update OpenAI status
      const openaiEl = document.getElementById('openaiStatus');
      if (openaiEl) {
        if (openai.healthy) {
          openaiEl.textContent = '✅ Online';
          openaiEl.className = 'metric-value success';
        } else if (openai.enabled !== false) {
          openaiEl.textContent = '⚠️ Offline';
          openaiEl.className = 'metric-value warning';
        } else {
          openaiEl.textContent = 'Disabled';
          openaiEl.className = 'metric-value';
        }
      }
      
      // Update routing mode
      const routingEl = document.getElementById('routingMode');
      if (routingEl) {
        const hasLocal = ollama?.healthy;
        const hasCloud = groq?.healthy || openai?.healthy;
        
        if (hasLocal && hasCloud) {
          routingEl.textContent = 'Hybrid';
          routingEl.className = 'metric-value success';
        } else if (hasLocal) {
          routingEl.textContent = 'Local-Only';
          routingEl.className = 'metric-value';
        } else if (hasCloud) {
          routingEl.textContent = 'Cloud-Only';
          routingEl.className = 'metric-value warning';
        } else {
          routingEl.textContent = 'No Provider';
          routingEl.className = 'metric-value error';
        }
      }
    }
  } catch (error) {
    console.error('Failed to update provider status:', error);
    const ollamaEl = document.getElementById('ollamaStatus');
    const groqEl = document.getElementById('groqStatus');
    if (ollamaEl) {
      ollamaEl.textContent = 'Error';
      ollamaEl.className = 'metric-value error';
    }
    if (groqEl) {
      groqEl.textContent = 'Error';
      groqEl.className = 'metric-value error';
    }
  }
}

// ==================== Utility Functions ====================

/**
 * Clear chat for current system
 */
function clearChat() {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  
  chatHistories[currentSystem] = [];
  
  chatContainer.innerHTML = `
    <div class="message ai">
      <div class="message-content">
        <div class="message-header">🤖 System</div>
        <div class="message-body">Chat cleared for ${currentSystem}. Ready for new tasks!</div>
      </div>
    </div>
  `;
}

/**
 * Export combined chat to clipboard
 */
function exportCombinedChat() {
  let combinedText = `# Mega Cockpit - Combined Conversation Export\n`;
  combinedText += `# Exported: ${new Date().toISOString()}\n\n`;
  
  for (const [system, history] of Object.entries(chatHistories)) {
    if (history && history.length > 0) {
      combinedText += `\n=== ${systemNames[system] || system} ===\n\n`;
      for (const msg of history) {
        const timestamp = msg.timestamp ? `[${msg.timestamp}] ` : '';
        const role = msg.role === 'user' ? 'User' : (msg.agent || 'AI');
        combinedText += `${timestamp}${role}: ${msg.body}\n\n`;
      }
    }
  }
  
  navigator.clipboard.writeText(combinedText).then(() => {
    alert('Combined chat copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback: open in new window
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre>${combinedText}</pre>`);
    }
  });
}

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addUserMessage,
    addAIMessage,
    switchSystem,
    clearChat,
    exportCombinedChat,
    refreshStatus
  };
}

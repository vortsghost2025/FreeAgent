/**
 * Mega Cockpit - UI Functions
 * DOM manipulation, event handlers, and UI updates
 */

// =====================
// WebSocket Connection
// =====================

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log('✓ Connected to cockpit');
    updateConnectionStatus('connected');
    
    // Request initial status
    ws.send(JSON.stringify({ type: 'status_request' }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };

  ws.onclose = () => {
    console.log('✗ Disconnected from cockpit');
    updateConnectionStatus('disconnected');
    // Attempt reconnection after 5 seconds
    setTimeout(initWebSocket, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus('error');
  };
}

/**
 * Handle incoming WebSocket messages
 * @param {Object} data - Parsed message data
 */
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'status':
      updateStatus(data.data);
      break;

    case 'systems':
      updateSystemsList(data.data);
      break;

    case 'task_started':
      addLogEntry('info', `Task started: ${data.task}`);
      break;

    case 'task_complete':
      addLogEntry('success', `Task completed in ${data.executionTime || data.result?.executionTime || 0}ms`);
      break;

    case 'task_failed':
      addLogEntry('error', `Task failed: ${data.error || 'unknown'}`);
      break;

    case 'health_check_result':
      updateSystemsList(data.data);
      break;

    case 'cost_report':
      updateCostMetrics(data.data);
      break;

    case 'route_recommendation':
      showRecommendations(data.data);
      break;

    case 'metrics':
      updateCostMetrics(data.data);
      break;

    case 'error':
      addLogEntry('error', `Error: ${data.error || 'unknown'}`);
      break;
      
    default:
      console.log('Unknown message type:', data.type);
  }
}

// =====================
// UI Updates
// =====================

/**
 * Update connection status indicator
 * @param {string} status - 'connected', 'disconnected', or 'error'
 */
function updateConnectionStatus(status) {
  const indicator = document.getElementById('connectionStatus');
  if (!indicator) return;
  
  indicator.classList.remove('connected', 'disconnected', 'error');
  indicator.classList.add(status);
}

/**
 * Update status display
 * @param {Object} status - Status data object
 */
function updateStatus(status) {
  if (status.coordinator) {
    const uptimeEl = document.getElementById('uptime');
    const requestsEl = document.getElementById('requests');
    const rpsEl = document.getElementById('rps');
    const latencyEl = document.getElementById('latency');
    
    if (uptimeEl) uptimeEl.textContent = formatTime(status.coordinator.uptime);
    if (requestsEl) requestsEl.textContent = status.coordinator.totalRequests.toLocaleString();
    if (rpsEl) rpsEl.textContent = status.coordinator.requestsPerSecond.toFixed(2);
    if (latencyEl) latencyEl.textContent = status.coordinator.avgLatency.toFixed(0) + 'ms';
  }
}

/**
 * Update systems list display
 * @param {Object} statusData - Systems status data
 */
function updateSystemsList(statusData) {
  const list = document.getElementById('systems-list');
  if (!list) return;
  
  list.innerHTML = '';

  if (!statusData.systems) return;

  statusData.systems.forEach(sys => {
    const healthClass = sys.status === 'healthy' ? 'healthy' :
                        sys.status === 'degraded' ? 'degraded' : 'unhealthy';

    const capabilities = Array.isArray(sys.capabilities) ? sys.capabilities.join(', ') : 'None';
    const throughput = sys.metrics?.throughput || sys.metrics?.requestsPerSecond || 0;

    list.innerHTML += `
      <div class="system-item" data-system="${sys.name}">
        <div class="info">
          <h4>${sys.name}</h4>
          <p>${sys.type}</p>
          <p><strong>Status:</strong> <span class="health-indicator ${healthClass}"></span> ${sys.status}</p>
          <p><strong>Capabilities:</strong> ${capabilities}</p>
          <p><strong>Throughput:</strong> ${throughput} req/s</p>
        </div>
        <div class="health-indicator ${healthClass}"></div>
      </div>
    `;
  });
}

/**
 * Add entry to activity log
 * @param {string} type - Entry type: 'info', 'success', 'error'
 * @param {string} message - Log message
 * @param {number|string} timestamp - Optional timestamp
 */
function addLogEntry(type, message, timestamp = null) {
  const panel = document.getElementById('logPanel');
  if (!panel) return;
  
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const timeStr = timestamp ? formatTime(timestamp) : formatTime(Date.now());

  entry.innerHTML = `
    <span class="timestamp">${timeStr}</span>
    <span class="system">[${type.toUpperCase()}]</span>
    <span class="message">${message}</span>
  `;

  panel.insertBefore(entry, panel.firstChild);

  // Keep only last 50 entries
  while (panel.children.length > 50) {
    panel.removeChild(panel.lastChild);
  }
}

/**
 * Update cost metrics display
 * @param {Object} data - Cost metrics data
 */
function updateCostMetrics(data) {
  const tokensEl = document.getElementById('tokensUsed');
  const costEl = document.getElementById('estimatedCost');
  const ratioEl = document.getElementById('costRatio');
  const progressEl = document.getElementById('costProgress');
  
  if (tokensEl) tokensEl.textContent = data.tokensUsed?.toLocaleString() || '0';
  if (costEl) costEl.textContent = '$' + (data.estimatedMonthlyCost || '0.00').toFixed(2);
  if (ratioEl) ratioEl.textContent = Math.min((data.costRatio || 0) * 100, 100).toFixed(0) + '%';
  if (progressEl) progressEl.style.width = (data.costRatio || 0) + '%';
}

/**
 * Show routing recommendations
 * @param {Array} data - Recommendation data
 */
function showRecommendations(data) {
  const panel = document.getElementById('logPanel');
  if (!panel) return;

  data.forEach(rec => {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const confidence = (rec.confidence || 0.9 * 100).toFixed(0);

    entry.innerHTML = `
      <span class="timestamp">${formatTime(Date.now())}</span>
      <span class="system">[RECOMMENDATION]</span>
      <span class="message">
        <strong>${rec.reason || 'Auto-routing recommended'}</strong>
        <p style="color: #888;">${rec.details || 'System will automatically select the best option based on task type and system health.'}</p>
        <p><strong>Confidence:</strong> ${confidence}%</p>
      </span>
    `;

    panel.insertBefore(entry, panel.firstChild);
  });
}

// =====================
// Message Functions
// =====================

/**
 * Add user message to chat
 * @param {string} message - User message
 */
function addUserMessage(message) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = 'message user';
  messageEl.innerHTML = `
    <div class="message-content">
      <div class="message-header">👤 User</div>
      <div class="message-body">${escapeHtml(message)}</div>
    </div>
  `;
  chatContainer.appendChild(messageEl);
  scrollToBottom();
}

/**
 * Add AI message to chat
 * @param {string} message - AI response message
 * @param {string} taskId - Optional task ID
 * @param {string} sender - Sender name
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

// =====================
// Utility Functions
// =====================

/**
 * Format message for display
 * @param {string|Object} message - Message to format
 * @returns {string} Formatted HTML
 */
function formatMessage(message) {
  if (typeof message === 'object') {
    return `<pre>${escapeHtml(JSON.stringify(message, null, 2))}</pre>`;
  }
  return escapeHtml(message);
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
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

/**
 * Format time duration
 * @param {number} msOrDate - Milliseconds or Date object
 * @returns {string} Formatted time string
 */
function formatTime(msOrDate) {
  // If it's a Date object, convert to milliseconds from now
  if (msOrDate instanceof Date) {
    const now = Date.now();
    const diff = now - msOrDate.getTime();
    if (diff < 1000) {
      return 'just now';
    }
    return formatTime(diff);
  }

  // It's a number in milliseconds
  const ms = msOrDate;
  if (ms < 1000) {
    return ms.toFixed(0) + 'ms';
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// =====================
// Event Handlers
// =====================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Send button
  const sendBtn = document.getElementById('sendButton');
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  // User input - Enter key
  const userInput = document.getElementById('userInput');
  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  // Clear button
  const clearBtn = document.getElementById('clearButton');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearChat);
  }

  // System tabs
  const systemTabs = document.querySelectorAll('.system-tab');
  systemTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const system = tab.dataset.system;
      switchSystem(system);
    });
  });
}

/**
 * Handle send message
 */
function handleSendMessage() {
  const userInput = document.getElementById('userInput');
  if (!userInput) return;
  
  const message = userInput.value.trim();
  if (!message) return;

  // Add user message to chat
  addUserMessage(message);
  
  // Clear input
  userInput.value = '';
  
  // Show typing indicator
  showTypingIndicator();
  
  // Send to server via WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'execute_task',
      task: {
        type: 'general',
        message: message,
        data: { message }
      }
    }));
  }
}

/**
 * Clear chat
 */
function clearChat() {
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    chatContainer.innerHTML = '';
  }
}

/**
 * Update metrics display
 * @param {number} executionTime - Task execution time in ms
 */
function updateMetrics(executionTime) {
  tasksCompleted++;
  responseTimes.push(executionTime);

  const tasksEl = document.getElementById('tasksCompleted');
  const avgEl = document.getElementById('avgResponse');
  
  if (tasksEl) tasksEl.textContent = tasksCompleted;
  
  if (avgEl && responseTimes.length > 0) {
    const avgResponse = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
    avgEl.textContent = `${avgResponse} ms`;
  }
}

/**
 * Refresh status from server
 */
async function refreshStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    updateStatus(data);
  } catch (error) {
    console.error('Refresh error:', error);
  }
}

// Export functions to global scope
if (typeof window !== 'undefined') {
  window.initWebSocket = initWebSocket;
  window.handleWebSocketMessage = handleWebSocketMessage;
  window.updateConnectionStatus = updateConnectionStatus;
  window.updateStatus = updateStatus;
  window.updateSystemsList = updateSystemsList;
  window.addLogEntry = addLogEntry;
  window.updateCostMetrics = updateCostMetrics;
  window.showRecommendations = showRecommendations;
  window.addUserMessage = addUserMessage;
  window.addAIMessage = addAIMessage;
  window.showTypingIndicator = showTypingIndicator;
  window.removeTypingIndicator = removeTypingIndicator;
  window.formatMessage = formatMessage;
  window.escapeHtml = escapeHtml;
  window.scrollToBottom = scrollToBottom;
  window.formatTime = formatTime;
  window.setupEventListeners = setupEventListeners;
  window.handleSendMessage = handleSendMessage;
  window.clearChat = clearChat;
  window.updateMetrics = updateMetrics;
  window.refreshStatus = refreshStatus;
}

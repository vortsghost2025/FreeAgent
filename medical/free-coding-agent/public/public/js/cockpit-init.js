/**
 * Mega Cockpit - Initialization
 * Validation, error handling, and main initialization
 */

// =====================
// Validation
// =====================

/**
 * Validate required DOM elements exist
 * @returns {Object} Validation result with missing elements
 */
function validateCockpit() {
  const required = [
    'connectionStatus',
    'systems-list',
    'logPanel',
    'taskType',
    'taskMessage'
  ];
  
  const missing = required.filter(id => !document.getElementById(id));
  
  if (missing.length > 0) {
    console.warn('COCKPIT: Missing DOM elements:', missing.join(', '));
    return { valid: false, missing };
  }
  
  return { valid: true, missing: [] };
}

// =====================
// Error Handling
// =====================

/**
 * Global error handler
 * @param {string} msg - Error message
 * @param {string} url - URL where error occurred
 * @param {number} line - Line number
 * @param {number} col - Column number
 * @param {Error} error - Error object
 * @returns {boolean} True to prevent default error handling
 */
window.onerror = function(msg, url, line, col, error) {
  console.error('COCKPIT ERROR:', msg, 'at line', line);
  
  // Log to panel if available
  const logPanel = document.getElementById('logPanel');
  if (logPanel) {
    const entry = document.createElement('div');
    entry.className = 'log-entry error';
    entry.innerHTML = `
      <span class="timestamp">${formatTime(Date.now())}</span>
      <span class="system">[ERROR]</span>
      <span class="message">${msg} (line ${line})</span>
    `;
    logPanel.insertBefore(entry, logPanel.firstChild);
  }
  
  return false;
};

/**
 * Handle unhandled promise rejections
 * @param {PromiseRejectionEvent} event - Rejection event
 */
window.onunhandledrejection = function(event) {
  console.error('COCKPIT: Unhandled promise rejection:', event.reason);
  
  const logPanel = document.getElementById('logPanel');
  if (logPanel) {
    const entry = document.createElement('div');
    entry.className = 'log-entry error';
    entry.innerHTML = `
      <span class="timestamp">${formatTime(Date.now())}</span>
      <span class="system">[UNHANDLED]</span>
      <span class="message">${event.reason}</span>
    `;
    logPanel.insertBefore(entry, logPanel.firstChild);
  }
};

// =====================
// Initialization
// =====================

/**
 * Main initialization function
 */
function initCockpit() {
  console.log('🚀 Initializing Mega Cockpit...');
  
  // Validate DOM
  const validation = validateCockpit();
  if (!validation.valid) {
    console.warn('COCKPIT: Some elements missing:', validation.missing);
    // Continue anyway - some elements may be optional
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize WebSocket connection
  initWebSocket();
  
  // Load default system
  loadSystem('simple_ensemble');
  
  // Add initial log entry
  addLogEntry('info', 'Cockpit initialized');
  
  console.log('✅ Initialization complete');
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('cockpitReady'));
}

// =====================
// Task Execution
// =====================

/**
 * Execute a task
 */
function executeTask() {
  const taskTypeEl = document.getElementById('taskType');
  const taskMessageEl = document.getElementById('taskMessage');
  const useAutoRoutingEl = document.getElementById('useAutoRouting');
  const preferredSystemEl = document.getElementById('preferredSystem');
  
  if (!taskTypeEl || !taskMessageEl) return;
  
  const type = taskTypeEl.value;
  const message = taskMessageEl.value;
  const autoRoute = useAutoRoutingEl ? useAutoRoutingEl.checked : true;
  const preferredSystem = preferredSystemEl ? preferredSystemEl.value : '';

  if (!message.trim()) {
    alert('Please enter a task message');
    return;
  }

  const task = {
    type: type,
    message: message,
    data: { message },
    autoRoute,
    preferredSystem
  };

  addLogEntry('info', `Executing task: ${type}`);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'execute_task',
      task: task
    }));
    
    // Clear the message input
    taskMessageEl.value = '';
  } else {
    addLogEntry('error', 'Not connected to server');
  }
}

/**
 * Get detailed cost report
 */
async function getDetailedCostReport() {
  addLogEntry('info', 'Fetching detailed cost report...');
  
  try {
    const response = await fetch('/api/cost-report');
    const data = await response.json();
    updateCostMetrics(data);
    addLogEntry('success', 'Cost report updated');
  } catch (error) {
    addLogEntry('error', `Failed to fetch cost report: ${error.message}`);
  }
}

// =====================
// Modal Functions
// =====================

/**
 * Open quick task modal
 */
function openQuickTaskModal() {
  const modal = document.getElementById('quickTaskModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Close quick task modal
 */
function closeQuickTaskModal() {
  const modal = document.getElementById('quickTaskModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Open test runner
 */
function openTestRunner() {
  addLogEntry('info', 'Opening test runner...');
  
  // Send test request to server
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'run_tests'
    }));
  }
}

// =====================
// Perception Functions
// =====================

/**
 * Handle image upload button
 */
function handleImageUpload() {
  const input = document.getElementById('imageFileInput');
  if (input) {
    input.click();
  }
}

/**
 * Handle image file selected
 */
function handleImageFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  addLogEntry('info', `Image selected: ${file.name}`);
  
  // Read file and send to server
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'perception_image',
        image: base64,
        filename: file.name
      }));
     info', 'Sending addLogEntry(' image for analysis...');
    }
  };
  reader.readAsDataURL(file);
}

/**
 * Handle voice recording
 */
function handleVoiceRecord() {
  addLogEntry('info', 'Voice recording not implemented');
  // TODO: Implement voice recording
}

/**
 * Handle perception status
 */
function handlePerceptionStatus() {
  addLogEntry('info', 'Fetching perception status...');
  
  fetch('/api/perception/status')
    .then(res => res.json())
    .then(data => {
      addLogEntry('success', `Perception: ${JSON.stringify(data)}`);
    })
    .catch(err => {
      addLogEntry('error', `Perception status error: ${err.message}`);
    });
}

// =====================
// Start Initialization
// =====================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCockpit);
} else {
  // DOM already loaded
  initCockpit();
}

// Export functions to global scope
if (typeof window !== 'undefined') {
  window.validateCockpit = validateCockpit;
  window.initCockpit = initCockpit;
  window.executeTask = executeTask;
  window.getDetailedCostReport = getDetailedCostReport;
  window.openQuickTaskModal = openQuickTaskModal;
  window.closeQuickTaskModal = closeQuickTaskModal;
  window.openTestRunner = openTestRunner;
  window.handleImageUpload = handleImageUpload;
  window.handleImageFileSelected = handleImageFileSelected;
  window.handleVoiceRecord = handleVoiceRecord;
  window.handlePerceptionStatus = handlePerceptionStatus;
}

/**
 * Mega Cockpit - Core Systems & State
 * Systems configuration, global state, and core functionality
 */

// =====================
// Systems Configuration
// =====================
const systems = {
  federation: {
    name: 'Medical Federation',
    type: 'multi-agent',
    capabilities: ['medical-analysis', 'diagnosis', 'treatment-planning'],
    status: 'healthy'
  },
  simple_ensemble: {
    name: 'Simple Ensemble',
    type: 'agent-ensemble',
    capabilities: ['code-generation', 'data-processing', 'general-purpose'],
    status: 'healthy'
  },
  distributed: {
    name: 'Distributed Network',
    type: 'distributed',
    capabilities: ['parallel-processing', 'scalability', 'fault-tolerance'],
    status: 'healthy'
  },
  medical_pipeline: {
    name: 'Medical Pipeline',
    type: 'pipeline',
    capabilities: ['medical-analysis', 'imaging', 'genomics'],
    status: 'healthy'
  },
  coding_ensemble: {
    name: 'Coding Ensemble',
    type: 'agent-ensemble',
    capabilities: ['code-generation', 'code-review', 'refactoring'],
    status: 'healthy'
  },
  plugins: {
    name: 'Plugins System',
    type: 'plugin',
    capabilities: ['extensibility', 'custom-agents', 'integrations'],
    status: 'healthy'
  }
};

// =====================
// Global State
// =====================
let ws = null;
let currentSystem = 'simple_ensemble';
let selectedAgents = new Set();
let tasksCompleted = 0;
let responseTimes = [];
let systemsList = [];
let activeTasks = [];

// =====================
// System Functions
// =====================

/**
 * Switch to a different system
 * @param {string} system - System key to switch to
 */
function switchSystem(system) {
  console.log('Switching to system:', system);
  currentSystem = system;
  
  // Update UI if needed
  const systemCards = document.querySelectorAll('.system-item');
  systemCards.forEach(card => {
    card.classList.remove('active');
    if (card.dataset.system === system) {
      card.classList.add('active');
    }
  });
  
  // Load system-specific data
  loadSystem(system);
}

/**
 * Load system configuration
 * @param {string} system - System key to load
 */
function loadSystem(system) {
  const sysConfig = systems[system];
  if (!sysConfig) {
    console.warn('System not found:', system);
    return;
  }
  
  console.log('Loading system:', sysConfig.name);
  
  // Emit event for UI to handle
  if (typeof onSystemLoad === 'function') {
    onSystemLoad(sysConfig);
  }
}

/**
 * Toggle agent selection
 * @param {string} agentId - Agent ID to toggle
 */
function toggleAgent(agentId) {
  if (selectedAgents.has(agentId)) {
    selectedAgents.delete(agentId);
  } else {
    selectedAgents.add(agentId);
  }
  updateAgentUI();
}

/**
 * Select all available agents
 */
function selectAllAgents() {
  const agentCheckboxes = document.querySelectorAll('.agent-checkbox');
  agentCheckboxes.forEach(checkbox => {
    selectedAgents.add(checkbox.value);
  });
  updateAgentUI();
}

/**
 * Deselect all agents
 */
function deselectAllAgents() {
  selectedAgents.clear();
  updateAgentUI();
}

/**
 * Update agent selection UI
 */
function updateAgentUI() {
  const agentCheckboxes = document.querySelectorAll('.agent-checkbox');
  agentCheckboxes.forEach(checkbox => {
    checkbox.checked = selectedAgents.has(checkbox.value);
  });
  
  // Update count display
  const countEl = document.getElementById('selectedAgentsCount');
  if (countEl) {
    countEl.textContent = selectedAgents.size;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.systems = systems;
  window.currentSystem = currentSystem;
  window.ws = ws;
  window.selectedAgents = selectedAgents;
  window.tasksCompleted = tasksCompleted;
  window.responseTimes = responseTimes;
  window.switchSystem = switchSystem;
  window.loadSystem = loadSystem;
  window.toggleAgent = toggleAgent;
  window.selectAllAgents = selectAllAgents;
  window.deselectAllAgents = deselectAllAgents;
  window.updateAgentUI = updateAgentUI;
}

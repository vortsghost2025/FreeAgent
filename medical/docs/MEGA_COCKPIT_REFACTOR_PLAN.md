# Mega Cockpit Refactor Plan

## Goal
Split the monolithic `mega-cockpit.html` (~1200 lines) into maintainable separate files to prevent future debugging nightmares.

---

## Current State
```
public/
└── mega-cockpit.html  (118 lines)
1    ├── CSS in <style> (lines 15-595)
    ├── HTML structure (lines 597-700)
    └── JavaScript (lines 700-1180)
```

---

## Target State
```
public/
├── mega-cockpit.html    (HTML only - ~150 lines)
├── css/
│   └── cockpit.css      (CSS - ~600 lines)
├── js/
│   ├── cockpit-core.js   (Data models, systems config)
│   ├── cockpit-ui.js     (DOM manipulation, event handlers)
│   └── cockpit-init.js   (Initialization, glue code)
└── test/
    └── cockpit.test.js   (Browser tests)
```

---

## Implementation Steps

### Step 1: Extract CSS
1. Create `public/css/cockpit.css`
2. Copy content from `<style>` tag (lines 15-595)
3. Replace `<style>` with:
```html
<link rel="stylesheet" href="/css/cockpit.css">
```

### Step 2: Extract JavaScript into Modules

#### cockpit-core.js - Systems & State
```javascript
// Systems configuration
const systems = {
  federation: { ... },
  simple_ensemble: { ... },
  distributed: { ... }
};

// Global state
let ws = null;
let currentSystem = 'simple_ensemble';
let selectedAgents = new Set();
let tasksCompleted = 0;
let responseTimes = [];

// System functions
function switchSystem(system) { ... }
function loadSystem(system) { ... }
function toggleAgent(agentId) { ... }
function selectAllAgents() { ... }
function deselectAllAgents() { ... }
```

#### cockpit-ui.js - DOM & Events
```javascript
// UI Functions
function setupEventListeners() { ... }
function initWebSocket() { ... }
function addUserMessage(message) { ... }
function addAIMessage(message, taskId, sender) { ... }
function showTypingIndicator() { ... }
function removeTypingIndicator() { ... }
function updateConnectionStatus(status) { ... }
function updateMetrics(executionTime) { ... }
function refreshStatus() { ... }
function updateStatus(data) { ... }
function clearChat() { ... }
function escapeHtml(text) { ... }
function formatMessage(message) { ... }
function scrollToBottom() { ... }
```

#### cockpit-init.js - Initialization
```javascript
// Validation
function validateCockpit() {
  const required = ['userInput', 'sendButton', 'chatContainer', 
                    'agentList', 'statusDot', 'statusText'];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    throw new Error(`COCKPIT: Missing DOM elements: ${missing.join(', ')}`);
  }
}

// Error boundary
window.onerror = function(msg, url, line) {
  console.error('COCKPIT ERROR:', msg, 'at line', line);
  return false;
};

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Mega Cockpit...');
  
  validateCockpit();
  setupEventListeners();
  initWebSocket();
  loadSystem('simple_ensemble');
  
  console.log('✅ Initialization complete');
});
```

### Step 3: Update HTML
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mega Unified Cockpit</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/dracula.min.css">
  <link rel="stylesheet" href="/css/cockpit.css">
</head>
<body>
  <!-- Header -->
  <div class="header">...</div>
  
  <!-- Main Content -->
  <div class="main-content">
    <div class="left-sidebar">...</div>
    <div class="center-panel">...</div>
    <div class="right-sidebar">...</div>
  </div>

  <!-- Scripts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/javascript/javascript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/python/python.min.js"></script>
  <script src="/js/cockpit-core.js"></script>
  <script src="/js/cockpit-ui.js"></script>
  <script src="/js/cockpit-init.js"></script>
</body>
</html>
```

### Step 4: Add Tests
```javascript
// test/cockpit-smoke.test.js
import { test, expect } from '@playwright/test';

test('cockpit loads without errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  await page.goto('/mega-cockpit.html');
  
  // Verify no JS errors
  expect(errors).toHaveLength(0);
  
  // Verify key elements exist
  await expect(page.locator('#userInput')).toBeVisible();
  await expect(page.locator('#sendButton')).toBeVisible();
  await expect(page.locator('#chatContainer')).toBeVisible();
});

test('send message works', async ({ page }) => {
  await page.goto('/mega-cockpit.html');
  
  await page.fill('#userInput', 'test message');
  await page.click('#sendButton');
  
  const message = await page.locator('.message.user .message-body').textContent();
  expect(message).toContain('test message');
});
```

---

## Validation Checklist

After refactoring, verify:

- [ ] Page loads in browser without console errors
- [ ] All three system tabs work (Simple, Federation, Distributed)
- [ ] Send button adds message to chat
- [ ] Enter key adds message to chat
- [ ] WebSocket connects (or shows appropriate status)
- [ ] Sidebar shows agents for each system
- [ ] Clear button works
- [ ] All Playwright tests pass

---

## Rollback Plan

Keep the original file as `mega-cockpit-legacy.html` until refactor is verified.

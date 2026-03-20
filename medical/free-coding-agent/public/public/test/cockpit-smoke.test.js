/**
 * Mega Cockpit - Smoke Tests
 * Basic browser tests to verify cockpit functionality
 */

// Test utilities
const test = {
  /**
   * Run a test and track results
   */
  run: function(name, fn) {
    console.log(`🧪 Running: ${name}`);
    try {
      const result = fn();
      if (result === false) {
        throw new Error('Test failed');
      }
      console.log(`  ✅ PASSED`);
      return { name, passed: true };
    } catch (error) {
      console.error(`  ❌ FAILED: ${error.message}`);
      return { name, passed: false, error: error.message };
    }
  },

  /**
   * Assert equals
   */
  equals: function(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected ${expected}, got ${actual}`);
    }
  },

  /**
   * Assert element exists
   */
  exists: function(selector) {
    const el = document.querySelector(selector);
    if (!el) {
      throw new Error(`Element not found: ${selector}`);
    }
    return el;
  },

  /**
   * Assert element is visible
   */
  visible: function(selector) {
    const el = document.querySelector(selector);
    if (!el) {
      throw new Error(`Element not found: ${selector}`);
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      throw new Error(`Element not visible: ${selector}`);
    }
    return el;
  }
};

// Run tests when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const results = [];

  // Test 1: Page loads
  results.push(test.run('Page loads without errors', function() {
    test.exists('body');
    return true;
  }));

  // Test 2: Header exists
  results.push(test.run('Header element exists', function() {
    test.exists('header');
    return true;
  }));

  // Test 3: Status bar exists
  results.push(test.run('Status bar exists', function() {
    test.exists('.status-bar');
    return true;
  }));

  // Test 4: Systems list exists
  results.push(test.run('Systems list container exists', function() {
    test.exists('#systems-list');
    return true;
  }));

  // Test 5: Log panel exists
  results.push(test.run('Log panel exists', function() {
    test.exists('#logPanel');
    return true;
  }));

  // Test 6: Task form exists
  results.push(test.run('Task form exists', function() {
    test.exists('.task-form');
    return true;
  }));

  // Test 7: Connection indicator exists
  results.push(test.run('Connection indicator exists', function() {
    test.exists('#connectionStatus');
    return true;
  }));

  // Test 8: CSS is loaded
  results.push(test.run('Styles are applied', function() {
    const body = document.querySelector('body');
    const bgColor = window.getComputedStyle(body).backgroundColor;
    // Should have a dark background
    test.equals(bgColor !== 'rgba(0, 0, 0, 0)', true, 'Background color should be set');
    return true;
  }));

  // Test 9: Global functions exist
  results.push(test.run('Global functions are defined', function() {
    test.equals(typeof window.initWebSocket, 'function', 'initWebSocket');
    test.equals(typeof window.setupEventListeners, 'function', 'setupEventListeners');
    test.equals(typeof window.addLogEntry, 'function', 'addLogEntry');
    return true;
  }));

  // Test 10: Systems config exists
  results.push(test.run('Systems configuration is loaded', function() {
    test.equals(typeof window.systems, 'object', 'systems object');
    test.equals(Object.keys(window.systems).length > 0, true, 'systems should have entries');
    return true;
  }));

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n📊 Test Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  } else {
    console.log('\n🎉 All tests passed!');
  }
  
  // Add results to page
  const resultsDiv = document.createElement('div');
  resultsDiv.id = 'test-results';
  resultsDiv.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#1a1a2e;padding:15px;border-radius:8px;color:#e0e0e0;font-family:monospace;font-size:12px;z-index:9999;';
  resultsDiv.innerHTML = `
    <div style="color:#00d9ff;margin-bottom:10px;">🧪 Test Results</div>
    <div>✅ Passed: ${passed}</div>
    <div>❌ Failed: ${failed}</div>
  `;
  document.body.appendChild(resultsDiv);
});

// Export test utilities
if (typeof window !== 'undefined') {
  window.cockpitTests = test;
}

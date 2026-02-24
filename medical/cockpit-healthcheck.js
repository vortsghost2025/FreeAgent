#!/usr/bin/env node
/**
 * COCKPIT HEALTHCHECK - Comprehensive System Diagnostics
 *
 * Runs a full health check on the cockpit system:
 * - Agent registry validation
 * - Ensemble initialization
 * - Ollama connectivity
 * - Per-agent inference latency
 * - Config validation
 *
 * Usage:
 *   node cockpit-healthcheck.js
 *   node cockpit-healthcheck.js --json  # Output as JSON
 *   node cockpit-healthcheck.js --quick # Skip inference tests
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const RESULTS = {
  passed: 0,
  failed: 0,
  tests: [],
  startTime: Date.now()
};

// ============================================================
// TEST RESULT HELPER
// ============================================================
function recordResult(name, ok, details = {}, latencyMs = 0) {
  const result = {
    name,
    ok,
    details,
    latencyMs,
    timestamp: new Date().toISOString()
  };
  
  RESULTS.tests.push(result);
  
  if (ok) {
    RESULTS.passed++;
    console.log(`✅ ${name} (${latencyMs}ms)`);
  } else {
    RESULTS.failed++;
    console.log(`❌ ${name} - ${details.error || 'Failed'}`);
  }
  
  return result;
}

// ============================================================
// TEST 1: AGENT REGISTRY
// ============================================================
async function testAgentRegistry() {
  console.log('\n📋 Testing Agent Registry...');
  const start = Date.now();
  
  try {
    const { loadAgents } = await import('./free-coding-agent/src/agent-registry.js');
    const agents = await loadAgents();
    
    // Check we have agents
    const agentCount = Object.keys(agents).length;
    if (agentCount === 0) {
      return recordResult('Agent Registry', false, { error: 'No agents loaded' }, Date.now() - start);
    }
    
    // Check each agent has required fields
    const missingFields = [];
    for (const [name, agent] of Object.entries(agents)) {
      if (!agent.name) missingFields.push(`${name}.name`);
      if (!agent.role) missingFields.push(`${name}.role`);
      if (!agent.model) missingFields.push(`${name}.model`);
    }
    
    if (missingFields.length > 0) {
      return recordResult('Agent Registry', false, { 
        error: `Missing fields: ${missingFields.join(', ')}`,
        agentCount 
      }, Date.now() - start);
    }
    
    return recordResult('Agent Registry', true, { 
      agentCount,
      agents: Object.keys(agents)
    }, Date.now() - start);
    
  } catch (error) {
    return recordResult('Agent Registry', false, { error: error.message }, Date.now() - start);
  }
}

// ============================================================
// TEST 2: ENSEMBLE INITIALIZATION
// ============================================================
async function testEnsemble() {
  console.log('\n🎭 Testing Ensemble Initialization...');
  const start = Date.now();
  
  try {
    const { initEnsemble, getEnsemble } = await import('./free-coding-agent/src/simple-ensemble.js');
    
    // Try to get existing ensemble or initialize
    let ensemble = getEnsemble();
    
    if (!ensemble) {
      await initEnsemble({ model: 'llama3.1:8b' });
      ensemble = getEnsemble();
    }
    
    if (!ensemble) {
      return recordResult('Ensemble Init', false, { error: 'Ensemble not initialized' }, Date.now() - start);
    }
    
    // Check agents
    const agents = ensemble.getAvailableAgents?.() || Object.keys(ensemble.agents || {});
    
    if (!agents || agents.length === 0) {
      return recordResult('Ensemble Init', false, { error: 'No agents in ensemble' }, Date.now() - start);
    }
    
    return recordResult('Ensemble Init', true, { 
      agentCount: agents.length,
      agents: agents
    }, Date.now() - start);
    
  } catch (error) {
    return recordResult('Ensemble Init', false, { error: error.message }, Date.now() - start);
  }
}

// ============================================================
// TEST 3: OLLAMA HEALTH
// ============================================================
async function testOllama() {
  console.log('\n🦙 Testing Ollama Health...');
  const start = Date.now();
  
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return recordResult('Ollama Health', false, { 
        error: `HTTP ${response.status}`,
        endpoint: 'http://localhost:11434/api/tags'
      }, Date.now() - start);
    }
    
    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];
    
    if (models.length === 0) {
      return recordResult('Ollama Health', false, { 
        error: 'No models available',
        hint: 'Run: ollama pull llama3.1:8b'
      }, Date.now() - start);
    }
    
    // Check for recommended model
    const hasLlama = models.some(m => m.includes('llama3'));
    
    return recordResult('Ollama Health', true, { 
      modelCount: models.length,
      models,
      hasRecommendedModel: hasLlama
    }, Date.now() - start);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return recordResult('Ollama Health', false, { 
        error: 'Connection timeout (5s)',
        hint: 'Is Ollama running? Run: ollama serve'
      }, Date.now() - start);
    }
    return recordResult('Ollama Health', false, { 
      error: error.message,
      hint: 'Is Ollama running? Run: ollama serve'
    }, Date.now() - start);
  }
}

// ============================================================
// TEST 4: PER-AGENT INFERENCE
// ============================================================
async function testAgentInference(quickMode = false) {
  if (quickMode) {
    console.log('\n⚡ Skipping inference tests (quick mode)');
    return;
  }
  
  console.log('\n🧠 Testing Agent Inference...');
  
  try {
    const { getEnsemble } = await import('./free-coding-agent/src/simple-ensemble.js');
    const ensemble = getEnsemble();
    
    if (!ensemble) {
      return recordResult('Agent Inference', false, { error: 'Ensemble not available' }, 0);
    }
    
    const testPrompt = 'Say "healthcheck ok" and nothing else.';
    const inferenceResults = [];
    
    // Test a subset of agents to save time
    const agentsToTest = ['code', 'data', 'clinical'];
    
    for (const agentName of agentsToTest) {
      const start = Date.now();
      try {
        const result = await ensemble.execute(testPrompt, [agentName]);
        const latency = Date.now() - start;
        
        const hasResponse = result.results?.some(r => r.response && r.response.length > 0);
        
        inferenceResults.push({
          agent: agentName,
          latencyMs: latency,
          ok: hasResponse
        });
        
        console.log(`   ${agentName}: ${latency}ms ${hasResponse ? '✓' : '✗'}`);
        
      } catch (error) {
        inferenceResults.push({
          agent: agentName,
          latencyMs: Date.now() - start,
          ok: false,
          error: error.message
        });
        console.log(`   ${agentName}: FAILED - ${error.message}`);
      }
    }
    
    const allPassed = inferenceResults.every(r => r.ok);
    const avgLatency = Math.round(inferenceResults.reduce((sum, r) => sum + r.latencyMs, 0) / inferenceResults.length);
    
    return recordResult('Agent Inference', allPassed, { 
      results: inferenceResults,
      avgLatencyMs: avgLatency
    }, avgLatency);
    
  } catch (error) {
    return recordResult('Agent Inference', false, { error: error.message }, 0);
  }
}

// ============================================================
// TEST 5: CONFIG VALIDATION
// ============================================================
async function testConfigValidation() {
  console.log('\n📝 Testing Config Validation...');
  const start = Date.now();
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const configPath = path.join(process.cwd(), 'free-coding-agent', 'ensemble.config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    const issues = [];
    
    // Check required fields
    if (!config.agents || config.agents.length === 0) {
      issues.push('No agents defined in config');
    }
    
    // Check each agent config
    if (config.agents) {
      for (const agent of config.agents) {
        if (!agent.name) issues.push(`Agent missing name`);
        if (!agent.provider) issues.push(`Agent ${agent.name} missing provider`);
      }
    }
    
    if (issues.length > 0) {
      return recordResult('Config Validation', false, { issues }, Date.now() - start);
    }
    
    return recordResult('Config Validation', true, { 
      agentCount: config.agents?.length || 0
    }, Date.now() - start);
    
  } catch (error) {
    return recordResult('Config Validation', false, { error: error.message }, Date.now() - start);
  }
}

// ============================================================
// TEST 6: PORT AVAILABILITY
// ============================================================
async function testPortAvailability() {
  console.log('\n🔌 Testing Port Availability...');
  const start = Date.now();
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const netstat = spawn('netstat', ['-ano']);
    const findstr = spawn('findstr', [':8889']);
    
    let output = '';
    
    netstat.stdout.pipe(findstr.stdin);
    findstr.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    findstr.on('close', (code) => {
      const inUse = output.includes('LISTENING');
      
      if (inUse) {
        // Extract PID
        const lines = output.trim().split('\n');
        const parts = lines[0]?.trim().split(/\s+/);
        const pid = parts?.[parts.length - 1];
        
        recordResult('Port 8889', true, { 
          status: 'in_use',
          pid: pid || 'unknown',
          hint: 'Cockpit server is running'
        }, Date.now() - start);
      } else {
        recordResult('Port 8889', true, { 
          status: 'available',
          hint: 'Run: npm start'
        }, Date.now() - start);
      }
      
      resolve();
    });
    
    findstr.on('error', () => {
      recordResult('Port 8889', true, { status: 'unknown' }, Date.now() - start);
      resolve();
    });
  });
}

// ============================================================
// PRINT SUMMARY
// ============================================================
function printSummary(jsonMode = false) {
  const duration = Date.now() - RESULTS.startTime;
  RESULTS.durationMs = duration;
  RESULTS.totalTests = RESULTS.passed + RESULTS.failed;
  RESULTS.success = RESULTS.failed === 0;
  
  if (jsonMode) {
    console.log('\n' + JSON.stringify(RESULTS, null, 2));
    return;
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 HEALTHCHECK SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Total tests: ${RESULTS.totalTests}`);
  console.log(`   ✅ Passed:   ${RESULTS.passed}`);
  console.log(`   ❌ Failed:   ${RESULTS.failed}`);
  console.log(`   ⏱️  Duration: ${duration}ms`);
  console.log('═'.repeat(60));
  
  if (RESULTS.failed === 0) {
    console.log('✅ All checks passed!');
  } else {
    console.log('⚠️  Some checks failed. Review the details above.');
  }
  
  console.log('');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const quickMode = args.includes('--quick');
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🏥 COCKPIT HEALTHCHECK - System Diagnostics         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Mode: ${quickMode ? 'Quick (no inference)' : 'Full'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Run all tests
  await testAgentRegistry();
  await testEnsemble();
  await testOllama();
  await testAgentInference(quickMode);
  await testConfigValidation();
  await testPortAvailability();
  
  // Print summary
  printSummary(jsonMode);
  
  // Exit with appropriate code
  process.exit(RESULTS.failed > 0 ? 1 : 0);
}

// Run
main().catch(err => {
  console.error('❌ Healthcheck crashed:', err);
  process.exit(1);
});

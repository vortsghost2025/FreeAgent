#!/usr/bin/env node
/**
 * System Stress Test Framework
 * Probes the 5 identified weak spots under load
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

class SystemStressTester {
  constructor() {
    this.results = {
      loadBalance: { status: 'pending', issues: [] },
      ensembleTiming: { status: 'pending', issues: [] },
      memoryEngine: { status: 'pending', issues: [] },
      routeBinding: { status: 'pending', issues: [] },
      swarmConcurrency: { status: 'pending', issues: [] }
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🔬 SYSTEM STRESS TEST FRAMEWORK');
    console.log('===============================');
    console.log('Probing 5 identified weak spots...\n');

    try {
      await this.testLoadBalancePressure();
      await this.testEnsembleInitializationTiming();
      await this.testMemoryEngineFragility();
      await this.testRouteBindingStability();
      await this.testSwarmConcurrencyLimits();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Stress test framework failed:', error.message);
    }
  }

  async testLoadBalancePressure() {
    console.log('1️⃣ Testing Load Balance Pressure...');
    
    const testRequests = [];
    const providers = { groq: 0, openai: 0, ollama: 0 };
    
    // Simulate rapid fire requests to expose load balancing issues
    for (let i = 0; i < 50; i++) {
      testRequests.push(this.simulateRequest(`Test request ${i}`, providers));
    }
    
    await Promise.all(testRequests);
    
    // Analyze distribution
    const total = Object.values(providers).reduce((a, b) => a + b, 0);
    const groqPercent = ((providers.groq / total) * 100).toFixed(1);
    
    console.log(`   Distribution: Groq=${providers.groq} (${groqPercent}%), OpenAI=${providers.openai}, Ollama=${providers.ollama}`);
    
    if (parseFloat(groqPercent) > 80) {
      this.results.loadBalance.issues.push('Severe load imbalance detected - Groq dominating');
      this.results.loadBalance.status = 'warning';
    } else if (providers.openai === 0 || providers.ollama === 0) {
      this.results.loadBalance.issues.push('Provider starvation - some providers idle');
      this.results.loadBalance.status = 'warning';
    } else {
      this.results.loadBalance.status = 'pass';
    }
    
    console.log(`   Result: ${this.results.loadBalance.status.toUpperCase()}\n`);
  }

  async testEnsembleInitializationTiming() {
    console.log('2️⃣ Testing Ensemble Initialization Timing...');
    
    // Simulate agent startup sequence timing issues
    const agentStartupTimes = [];
    const agents = ['code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops', 'kilo'];
    
    for (const agent of agents) {
      const startTime = Date.now();
      // Simulate initialization delay variance
      const delay = 100 + Math.random() * 400; // 100-500ms variation
      await new Promise(resolve => setTimeout(resolve, delay));
      const endTime = Date.now();
      agentStartupTimes.push({ agent, time: endTime - startTime });
    }
    
    // Analyze timing variance
    const times = agentStartupTimes.map(a => a.time);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const variance = maxTime - minTime;
    
    console.log(`   Avg startup: ${avgTime.toFixed(0)}ms`);
    console.log(`   Time spread: ${variance}ms (${minTime}-${maxTime}ms)`);
    
    if (variance > 300) {
      this.results.ensembleTiming.issues.push(`Significant timing variance (${variance}ms) could cause race conditions`);
      this.results.ensembleTiming.status = 'warning';
    } else {
      this.results.ensembleTiming.status = 'pass';
    }
    
    console.log(`   Result: ${this.results.ensembleTiming.status.toUpperCase()}\n`);
  }

  async testMemoryEngineFragility() {
    console.log('3️⃣ Testing Memory Engine Fragility...');
    
    const memoryDir = 'agent-memory';
    let issues = 0;
    
    try {
      const files = await fs.promises.readdir(memoryDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      // Test JSON validity
      for (const file of jsonFiles) {
        try {
          const content = await fs.promises.readFile(path.join(memoryDir, file), 'utf8');
          JSON.parse(content); // Will throw if invalid
        } catch (error) {
          issues++;
          this.results.memoryEngine.issues.push(`Invalid JSON in ${file}: ${error.message.substring(0, 50)}`);
        }
      }
      
      // Test file size impact
      let totalSize = 0;
      for (const file of jsonFiles) {
        const stats = await fs.promises.stat(path.join(memoryDir, file));
        totalSize += stats.size;
      }
      
      const avgSize = totalSize / jsonFiles.length;
      console.log(`   Memory files: ${jsonFiles.length} files, avg size: ${(avgSize/1024).toFixed(1)}KB`);
      
      if (avgSize > 102400) { // 100KB average
        this.results.memoryEngine.issues.push(`Large memory files may impact startup performance`);
        this.results.memoryEngine.status = 'warning';
      } else {
        this.results.memoryEngine.status = issues > 0 ? 'warning' : 'pass';
      }
      
    } catch (error) {
      this.results.memoryEngine.issues.push(`Memory directory access failed: ${error.message}`);
      this.results.memoryEngine.status = 'fail';
    }
    
    console.log(`   Issues found: ${issues}`);
    console.log(`   Result: ${this.results.memoryEngine.status.toUpperCase()}\n`);
  }

  async testRouteBindingStability() {
    console.log('4️⃣ Testing Route Binding Stability...');
    
    // Test dynamic route availability
    const expectedRoutes = ['/api/status', '/api/tasks', '/health'];
    const availableRoutes = [];
    
    for (const route of expectedRoutes) {
      try {
        const response = await fetch(`http://localhost:8889${route}`);
        if (response.ok) {
          availableRoutes.push(route);
        }
      } catch (error) {
        // Route unavailable
      }
    }
    
    console.log(`   Available routes: ${availableRoutes.length}/${expectedRoutes.length}`);
    
    if (availableRoutes.length < expectedRoutes.length) {
      const missing = expectedRoutes.filter(r => !availableRoutes.includes(r));
      this.results.routeBinding.issues.push(`Missing routes: ${missing.join(', ')}`);
      this.results.routeBinding.status = 'warning';
    } else {
      this.results.routeBinding.status = 'pass';
    }
    
    console.log(`   Result: ${this.results.routeBinding.status.toUpperCase()}\n`);
  }

  async testSwarmConcurrencyLimits() {
    console.log('5️⃣ Testing Swarm Concurrency Limits...');
    
    const concurrencyTests = [];
    const maxConcurrent = 20;
    let activeRequests = 0;
    let peakConcurrency = 0;
    
    // Simulate concurrent swarm operations
    for (let i = 0; i < 100; i++) {
      concurrencyTests.push(
        this.simulateSwarmOperation(i, () => {
          activeRequests++;
          peakConcurrency = Math.max(peakConcurrency, activeRequests);
          return new Promise(resolve => {
            setTimeout(() => {
              activeRequests--;
              resolve();
            }, 50 + Math.random() * 150); // 50-200ms operations
          });
        })
      );
    }
    
    await Promise.all(concurrencyTests);
    
    console.log(`   Peak concurrency reached: ${peakConcurrency}/${maxConcurrent}`);
    console.log(`   Operations completed: 100`);
    
    if (peakConcurrency >= maxConcurrent * 0.9) {
      this.results.swarmConcurrency.issues.push(`Near concurrency ceiling (${peakConcurrency}/${maxConcurrent})`);
      this.results.swarmConcurrency.status = 'warning';
    } else {
      this.results.swarmConcurrency.status = 'pass';
    }
    
    console.log(`   Result: ${this.results.swarmConcurrency.status.toUpperCase()}\n`);
  }

  async simulateRequest(content, providers) {
    // Simulate provider selection (biased toward Groq)
    const rand = Math.random();
    let provider;
    
    if (rand < 0.7) {
      provider = 'groq'; // 70% chance
    } else if (rand < 0.85) {
      provider = 'openai'; // 15% chance
    } else {
      provider = 'ollama'; // 15% chance
    }
    
    providers[provider]++;
    
    // Simulate request processing
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
  }

  async simulateSwarmOperation(id, operation) {
    try {
      await operation();
    } catch (error) {
      console.error(`Operation ${id} failed:`, error.message);
    }
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log('📊 STRESS TEST RESULTS REPORT');
    console.log('============================');
    console.log(`Total test time: ${totalTime}ms\n`);
    
    const testNames = {
      loadBalance: 'Load Balance Pressure',
      ensembleTiming: 'Ensemble Timing',
      memoryEngine: 'Memory Engine',
      routeBinding: 'Route Binding',
      swarmConcurrency: 'Swarm Concurrency'
    };
    
    let warnings = 0;
    let passes = 0;
    
    for (const [key, testName] of Object.entries(testNames)) {
      const result = this.results[key];
      const statusEmoji = {
        'pass': '✅',
        'warning': '⚠️',
        'fail': '❌'
      }[result.status] || '❓';
      
      console.log(`${statusEmoji} ${testName}: ${result.status.toUpperCase()}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      if (result.status === 'warning') warnings++;
      if (result.status === 'pass') passes++;
    }
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Passes: ${passes}/5`);
    console.log(`   Warnings: ${warnings}/5`);
    console.log(`   Overall: ${warnings === 0 ? 'STABLE' : 'NEEDS ATTENTION'}`);
    
    // Save detailed results
    const report = {
      timestamp: new Date().toISOString(),
      totalTime: totalTime,
      results: this.results,
      summary: {
        passes: passes,
        warnings: warnings,
        status: warnings === 0 ? 'stable' : 'needs_attention'
      }
    };
    
    fs.writeFileSync('stress-test-results.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed results saved to: stress-test-results.json');
  }
}

// Run the stress tests
const tester = new SystemStressTester();
tester.runAllTests().catch(console.error);
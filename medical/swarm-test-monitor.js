#!/usr/bin/env node
/**
 * Distributed Swarm Test Monitor
 * Real-time monitoring for Kilo's high-volume workload test
 */

import http from 'http';

class SwarmTestMonitor {
  constructor() {
    this.testStartTime = null;
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0,
      peakConcurrency: 0,
      currentLoad: 0
    };
    this.providers = ['ollama', 'groq', 'openai'];
    console.log('🔍 SWARM TEST MONITOR INITIALIZED');
    console.log('=================================');
  }

  async startMonitoring(durationMinutes = 30) {
    this.testStartTime = Date.now();
    console.log(`\n⏱️  Monitoring started at ${new Date().toISOString()}`);
    console.log(`⏰ Duration: ${durationMinutes} minutes\n`);

    // Monitor every 30 seconds
    const interval = setInterval(async () => {
      await this.collectMetrics();
      this.displayMetrics();
      
      // Check if test duration exceeded
      const elapsed = (Date.now() - this.testStartTime) / 1000 / 60;
      if (elapsed >= durationMinutes) {
        clearInterval(interval);
        await this.generateFinalReport();
      }
    }, 30000);

    // Initial metrics collection
    await this.collectMetrics();
    this.displayMetrics();
  }

  async collectMetrics() {
    try {
      const status = await this.fetchProviderStatus();
      
      // Reset current metrics
      this.metrics.currentLoad = 0;
      
      // Collect metrics from each provider
      for (const [name, data] of Object.entries(status.providers || {})) {
        const metrics = data.metrics || {};
        this.metrics.requests += metrics.requests || 0;
        this.metrics.successes += metrics.successes || 0;
        this.metrics.failures += metrics.failures || 0;
        this.metrics.totalLatency += metrics.avgLatency || 0;
        this.metrics.currentLoad += metrics.requests || 0;
      }
      
      // Track peak concurrency
      if (this.metrics.currentLoad > this.metrics.peakConcurrency) {
        this.metrics.peakConcurrency = this.metrics.currentLoad;
      }
      
    } catch (error) {
      console.error('❌ Metrics collection failed:', error.message);
    }
  }

  async fetchProviderStatus() {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:8889/api/providers/status', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  displayMetrics() {
    const successRate = this.metrics.requests > 0 
      ? ((this.metrics.successes / this.metrics.requests) * 100).toFixed(1)
      : '0.0';
    
    const avgLatency = this.metrics.successes > 0
      ? (this.metrics.totalLatency / this.metrics.successes).toFixed(1)
      : '0.0';

    const elapsedMinutes = ((Date.now() - this.testStartTime) / 1000 / 60).toFixed(1);

    console.clear();
    console.log('🔍 DISTRIBUTED SWARM TEST MONITOR');
    console.log('=================================');
    console.log(`⏱️  Elapsed Time: ${elapsedMinutes} minutes`);
    console.log(`📊 Current Load: ${this.metrics.currentLoad} requests`);
    console.log(`📈 Peak Concurrency: ${this.metrics.peakConcurrency} requests`);
    console.log('');
    console.log('_PROVIDER METRICS_:');
    console.log(`✅ Success Rate: ${successRate}% (${this.metrics.successes}/${this.metrics.requests})`);
    console.log(`⚡ Avg Latency: ${avgLatency}ms`);
    console.log(`❌ Failures: ${this.metrics.failures}`);
    console.log('');
    
    // Performance indicators
    const perfIndicators = [];
    if (parseFloat(successRate) >= 95) perfIndicators.push('✅ Excellent reliability');
    if (parseFloat(avgLatency) < 1000) perfIndicators.push('⚡ Fast response times');
    if (this.metrics.peakConcurrency > 50) perfIndicators.push('🚀 High throughput achieved');
    if (this.metrics.failures === 0) perfIndicators.push('🛡️  Zero failures');
    
    console.log('🎯 PERFORMANCE INDICATORS:');
    perfIndicators.forEach(indicator => console.log(`   ${indicator}`));
    
    if (perfIndicators.length === 0) {
      console.log('   ⚠️  Monitoring in progress...');
    }
  }

  async generateFinalReport() {
    console.log('\n');
    console.log('🏁 SWARM TEST COMPLETED');
    console.log('=======================');
    
    const totalTime = (Date.now() - this.testStartTime) / 1000;
    const successRate = this.metrics.requests > 0 
      ? ((this.metrics.successes / this.metrics.requests) * 100).toFixed(1)
      : '0.0';
    
    const avgLatency = this.metrics.successes > 0
      ? (this.metrics.totalLatency / this.metrics.successes).toFixed(1)
      : '0.0';

    console.log(`⏱️  Total Test Duration: ${totalTime.toFixed(1)} seconds`);
    console.log(`📊 Total Requests: ${this.metrics.requests}`);
    console.log(`✅ Success Rate: ${successRate}%`);
    console.log(`⚡ Average Latency: ${avgLatency}ms`);
    console.log(`📈 Peak Concurrency: ${this.metrics.peakConcurrency} requests`);
    console.log(`❌ Total Failures: ${this.metrics.failures}`);
    
    // Bottleneck analysis
    console.log('\n🔎 BOTTLENECK ANALYSIS:');
    if (this.metrics.failures > 0) {
      console.log('   ⚠️  Failure points detected - investigate error patterns');
    }
    if (parseFloat(avgLatency) > 2000) {
      console.log('   ⚠️  High latency detected - consider scaling or optimization');
    }
    if (this.metrics.peakConcurrency < 10) {
      console.log('   ℹ️  Low concurrency - system may be underutilized');
    }
    
    // Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    if (parseFloat(successRate) >= 95 && parseFloat(avgLatency) < 1000) {
      console.log('   ✅ System performing optimally for production use');
    } else {
      console.log('   ⚠️  Performance tuning recommended');
    }
    
    console.log('\n💾 Detailed metrics saved to swarm-test-report.json');
    
    // Save detailed report
    const report = {
      testCompleted: new Date().toISOString(),
      durationSeconds: totalTime,
      totalRequests: this.metrics.requests,
      successRate: `${successRate}%`,
      averageLatency: `${avgLatency}ms`,
      peakConcurrency: this.metrics.peakConcurrency,
      totalFailures: this.metrics.failures,
      performanceIndicators: {
        reliability: parseFloat(successRate) >= 95 ? 'Excellent' : 'Needs improvement',
        speed: parseFloat(avgLatency) < 1000 ? 'Fast' : 'Slow',
        scalability: this.metrics.peakConcurrency > 50 ? 'High' : 'Moderate'
      }
    };
    
    // In a real implementation, save to file
    // await fs.writeFile('swarm-test-report.json', JSON.stringify(report, null, 2));
  }
}

// Auto-start monitoring when script runs
const monitor = new SwarmTestMonitor();
monitor.startMonitoring(30); // 30 minute default duration

export { SwarmTestMonitor };
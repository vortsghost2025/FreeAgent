#!/usr/bin/env node
/**
 * Real-time System Monitor
 * Watches weak spots during active usage
 */

import fs from 'fs';
import os from 'os';

class RealTimeMonitor {
  constructor() {
    this.monitoring = false;
    this.data = {
      timestamps: [],
      cpu: [],
      memory: [],
      providerUsage: { groq: 0, openai: 0, ollama: 0 },
      agentLatencies: {},
      errors: []
    };
  }

  startMonitoring(durationMinutes = 5) {
    console.log('🔍 REAL-TIME SYSTEM MONITOR STARTED');
    console.log('====================================');
    console.log(`Monitoring for ${durationMinutes} minutes...\n`);
    
    this.monitoring = true;
    const interval = setInterval(() => this.collectMetrics(), 2000); // Every 2 seconds
    
    setTimeout(() => {
      this.monitoring = false;
      clearInterval(interval);
      this.generateAnalysis();
    }, durationMinutes * 60 * 1000);
  }

  collectMetrics() {
    if (!this.monitoring) return;
    
    const timestamp = new Date().toISOString();
    this.data.timestamps.push(timestamp);
    
    // Collect system metrics
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    
    this.data.cpu.push(cpuUsage);
    this.data.memory.push(memoryUsage);
    
    // Log current state
    const timeStr = new Date().toLocaleTimeString();
    console.log(`[${timeStr}] CPU: ${cpuUsage.toFixed(1)}%, Memory: ${memoryUsage.toFixed(1)}%, Active Processes: ${this.getActiveProcesses()}`);
  }

  getCpuUsage() {
    // Simplified CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    return 100 - (totalIdle / totalTick) * 100;
  }

  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return ((totalMem - freeMem) / totalMem) * 100;
  }

  getActiveProcesses() {
    // Count Node.js processes
    try {
      const processes = fs.readFileSync('/proc/stat', 'utf8');
      return (processes.match(/processes/g) || []).length;
    } catch (error) {
      // Fallback for Windows
      return 0;
    }
  }

  async generateAnalysis() {
    console.log('\n📊 REAL-TIME MONITORING ANALYSIS');
    console.log('================================');
    
    // Analyze collected data
    const analysis = {
      systemStability: this.analyzeSystemStability(),
      resourcePressure: this.analyzeResourcePressure(),
      providerDistribution: this.analyzeProviderDistribution(),
      performanceTrends: this.analyzePerformanceTrends()
    };
    
    console.log('\n📋 ANALYSIS RESULTS:');
    
    // System Stability
    console.log(`\n🔧 System Stability: ${analysis.systemStability.rating}`);
    analysis.systemStability.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    
    // Resource Pressure
    console.log(`\n⚡ Resource Pressure: ${analysis.resourcePressure.rating}`);
    console.log(`   Average CPU: ${analysis.resourcePressure.avgCpu.toFixed(1)}%`);
    console.log(`   Average Memory: ${analysis.resourcePressure.avgMemory.toFixed(1)}%`);
    analysis.resourcePressure.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
    
    // Provider Distribution
    console.log(`\n🌐 Provider Distribution: ${analysis.providerDistribution.rating}`);
    console.log(`   Groq: ${analysis.providerDistribution.groq}%`);
    console.log(`   OpenAI: ${analysis.providerDistribution.openai}%`);
    console.log(`   Ollama: ${analysis.providerDistribution.ollama}%`);
    
    // Performance Trends
    console.log(`\n📈 Performance Trends: ${analysis.performanceTrends.rating}`);
    analysis.performanceTrends.findings.forEach(finding => console.log(`   🔍 ${finding}`));
    
    // Overall assessment
    const ratings = [
      analysis.systemStability.rating,
      analysis.resourcePressure.rating,
      analysis.providerDistribution.rating,
      analysis.performanceTrends.rating
    ];
    
    const weakSpotCount = ratings.filter(r => r === 'WARNING' || r === 'CRITICAL').length;
    
    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (weakSpotCount === 0) {
      console.log('   ✅ System is STABLE under current load');
    } else if (weakSpotCount <= 2) {
      console.log('   ⚠️  System has MODERATE pressure points');
    } else {
      console.log('   ❌ System shows SIGNIFICANT weak spots');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (analysis.providerDistribution.groq > 80) {
      console.log('   - Implement aggressive load balancing for providers');
    }
    if (analysis.resourcePressure.avgCpu > 70) {
      console.log('   - Consider CPU optimization or scaling');
    }
    if (analysis.systemStability.hasErrors) {
      console.log('   - Address error handling and recovery mechanisms');
    }
    
    // Save monitoring data
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.data.timestamps.length * 2, // seconds
      analysis: analysis,
      raw_data: this.data
    };
    
    fs.writeFileSync('realtime-monitoring-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Monitoring data saved to: realtime-monitoring-report.json');
  }

  analyzeSystemStability() {
    const hasErrors = this.data.errors.length > 0;
    const errorRate = this.data.errors.length / this.data.timestamps.length;
    
    return {
      rating: hasErrors ? 'WARNING' : 'STABLE',
      hasErrors: hasErrors,
      errorRate: errorRate,
      issues: hasErrors ? [`Detected ${this.data.errors.length} errors during monitoring`] : []
    };
  }

  analyzeResourcePressure() {
    const avgCpu = this.data.cpu.reduce((a, b) => a + b, 0) / this.data.cpu.length;
    const avgMemory = this.data.memory.reduce((a, b) => a + b, 0) / this.data.memory.length;
    
    const warnings = [];
    if (avgCpu > 80) warnings.push('High CPU utilization detected');
    if (avgMemory > 85) warnings.push('High memory utilization detected');
    
    return {
      rating: warnings.length > 0 ? 'WARNING' : 'NORMAL',
      avgCpu: avgCpu,
      avgMemory: avgMemory,
      warnings: warnings
    };
  }

  analyzeProviderDistribution() {
    const total = Object.values(this.data.providerUsage).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return {
        rating: 'INSUFFICIENT_DATA',
        groq: 0,
        openai: 0,
        ollama: 0
      };
    }
    
    const groqPercent = (this.data.providerUsage.groq / total) * 100;
    const openaiPercent = (this.data.providerUsage.openai / total) * 100;
    const ollamaPercent = (this.data.providerUsage.ollama / total) * 100;
    
    const rating = groqPercent > 80 ? 'IMBALANCED' : 'BALANCED';
    
    return {
      rating: rating,
      groq: groqPercent,
      openai: openaiPercent,
      ollama: ollamaPercent
    };
  }

  analyzePerformanceTrends() {
    if (this.data.timestamps.length < 3) {
      return {
        rating: 'INSUFFICIENT_DATA',
        findings: ['Need more data points for trend analysis']
      };
    }
    
    const findings = [];
    
    // Check for increasing trends
    const cpuTrend = this.calculateTrend(this.data.cpu);
    const memoryTrend = this.calculateTrend(this.data.memory);
    
    if (cpuTrend > 0.1) findings.push('CPU usage showing upward trend');
    if (memoryTrend > 0.1) findings.push('Memory usage showing upward trend');
    if (cpuTrend < -0.1) findings.push('CPU usage stabilizing or decreasing');
    
    const rating = findings.some(f => f.includes('upward')) ? 'WARNING' : 'STABLE';
    
    return {
      rating: rating,
      findings: findings
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sum_x = (n * (n - 1)) / 2;
    const sum_y = values.reduce((a, b) => a + b, 0);
    const sum_xy = values.reduce((sum, y, i) => sum + (i * y), 0);
    const sum_xx = values.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    return slope;
  }
}

// Start monitoring
const monitor = new RealTimeMonitor();
monitor.startMonitoring(2); // 2 minute monitoring session
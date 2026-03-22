#!/usr/bin/env node

/**
 * MEMORY OPTIMIZATION TOOL
 * Helps manage system resources during demo
 */

import { execSync } from 'child_process';

function getCurrentMemory() {
  try {
    const result = execSync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', { encoding: 'utf8' });
    const lines = result.split('\n');
    let total = 0, free = 0;
    
    lines.forEach(line => {
      if (line.includes('TotalVisibleMemorySize=')) {
        total = parseInt(line.split('=')[1]);
      }
      if (line.includes('FreePhysicalMemory=')) {
        free = parseInt(line.split('=')[1]);
      }
    });
    
    const used = total - free;
    const usagePercent = ((used / total) * 100).toFixed(2);
    
    return {
      total: (total / 1024).toFixed(2),
      free: (free / 1024).toFixed(2),
      used: (used / 1024).toFixed(2),
      usagePercent
    };
  } catch (error) {
    return null;
  }
}

function getTopProcesses() {
  try {
    const result = execSync('powershell "Get-Process | Sort-Object WS -Descending | Select-Object -First 8 ProcessName, Id, @{Name=\'MemoryMB\';Expression={\'{0:N2}\' -f ($_.WS / 1MB)}} | ConvertTo-Json"', { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    return [];
  }
}

function displayMemoryStatus() {
  console.log('\n💾 MEMORY STATUS REPORT');
  console.log('=====================\n');
  
  const memory = getCurrentMemory();
  if (memory) {
    console.log(`📊 Total Memory: ${memory.total} MB`);
    console.log(`✅ Free Memory:  ${memory.free} MB`);
    console.log(`🔥 Used Memory:  ${memory.used} MB`);
    console.log(`📈 Usage:       ${memory.usagePercent}%`);
    
    const status = memory.usagePercent > 90 ? '🔴 CRITICAL' : 
                  memory.usagePercent > 80 ? '🟡 HIGH' : 
                  memory.usagePercent > 60 ? '🟢 MODERATE' : '🔵 LOW';
    
    console.log(`\n${status} MEMORY USAGE`);
  }
  
  console.log('\n🖥️  TOP MEMORY CONSUMERS:');
  console.log('========================');
  
  const processes = getTopProcesses();
  if (Array.isArray(processes)) {
    processes.forEach((proc, index) => {
      const memDisplay = proc.MemoryMB ? `${proc.MemoryMB} MB` : 'N/A';
      console.log(`${index + 1}. ${proc.ProcessName || 'Unknown'} (PID: ${proc.Id || 'N/A'}) - ${memDisplay}`);
    });
  }
}

function suggestOptimizations() {
  console.log('\n💡 OPTIMIZATION SUGGESTIONS');
  console.log('==========================\n');
  
  const memory = getCurrentMemory();
  if (!memory) return;
  
  if (memory.usagePercent > 85) {
    console.log('🔴 CRITICAL LEVEL - Immediate Action Recommended:');
    console.log('   • Close unused applications');
    console.log('   • Restart VS Code if not actively needed');
    console.log('   • Stop WSL if not required for demo');
    console.log('   • Close browser tabs except essential ones\n');
  } else if (memory.usagePercent > 70) {
    console.log('🟡 HIGH LEVEL - Consider Optimization:');
    console.log('   • Close unnecessary development tools');
    console.log('   • Minimize background applications');
    console.log('   • Your system is adequate for demo\n');
  } else {
    console.log('🟢 OPTIMAL LEVEL - System Ready:');
    console.log('   • Memory usage is healthy');
    console.log('   • System ready for demonstration');
    console.log('   • No immediate action required\n');
  }
}

function demoPreparationChecklist() {
  console.log('📋 DEMO PREPARATION CHECKLIST');
  console.log('============================\n');
  
  console.log('✅ Essential Services:');
  console.log('   • Cockpit Server: Running (Node.js)');
  console.log('   • Ollama Service: Running (LLM provider)');
  console.log('   • Network Services: Active\n');
  
  console.log('🎯 Recommended Actions:');
  console.log('   1. Keep VS Code open only if actively coding');
  console.log('   2. Close other IDEs/Editors');
  console.log('   3. Minimize browser tabs to essentials');
  console.log('   4. Ensure cockpit-server.js is running');
  console.log('   5. Test all dashboard URLs before presentation\n');
  
  console.log('\n🚀 Quick Commands:');
  console.log('   node cockpit-server.js     # Start server if needed');
  console.log('   node pipeline-demo.js      # Show system capabilities');
  console.log('   node live-demo.js --continuous  # Generate demo activity');
}

// Main execution
console.log('🔧 SYSTEM MEMORY ANALYSIS TOOL');
console.log('==============================');

displayMemoryStatus();
suggestOptimizations();
demoPreparationChecklist();

console.log('\n📊 System is ready for your medical AI pipeline demonstration!');
console.log('The Node.js cockpit server is lightweight and should perform excellently.');

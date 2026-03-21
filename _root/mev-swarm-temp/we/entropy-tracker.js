/**
 * ENTROPY TRACKER - Chaos Monitor for SNAC Orchestrator
 * 
 * Calculates code complexity/entropy scores for files agents modify.
 * Flags files with entropy > 0.5 as "Technical Debt".
 * Auto-injects refactor tasks into the queue when spaghetti code detected.
 * 
 * Usage:
 *   import { EntropyTracker } from './entropy-tracker.js';
 *   const tracker = new EntropyTracker(orchestrator);
 *   await tracker.analyzeFile('/path/to/file.js');
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  entropyThreshold: 0.5,        // Files above this are "Technical Debt"
  complexityWeight: {
    functions: 1.0,              // Weight per function
    conditionals: 1.5,           // Weight per if/else/switch
    loops: 2.0,                  // Weight per for/while/do
    nestedDepth: 3.0,            // Weight per nesting level
    linesOfCode: 0.01,           // Weight per line
  },
  fileExtensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.rs'],
  excludePatterns: ['node_modules/', '.git/', 'dist/', 'build/', 'coverage/'],
  scanDepth: 3,                  // Max directory depth for auto-scan
  debounceMs: 5000,             // Debounce refactor queueing
};

// ============================================================================
// ENTROPY ANALYZER
// ============================================================================

export class EntropyAnalyzer {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a single file for complexity/entropy
   */
  analyzeFile(filePath) {
    if (!existsSync(filePath)) {
      return { error: 'File not found', path: filePath };
    }

    const content = readFileSync(filePath, 'utf8');
    return this.calculateEntropy(content, filePath);
  }

  /**
   * Calculate entropy score from code content
   */
  calculateEntropy(content, filePath = 'unknown') {
    const lines = content.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('/*');
    });

    // Count complexity indicators
    const metrics = {
      linesOfCode: codeLines.length,
      functions: this.countMatches(content, /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|=>\s*{|\w+\s*\([^)]*\)\s*{)/g),
      conditionals: this.countMatches(content, /\b(?:if|else|switch|case|ternary|\?\s*:)\b/g),
      loops: this.countMatches(content, /\b(?:for|while|do|forEach|map|filter|reduce)\s*\(/g),
      nestedDepth: this.calculateMaxNesting(content),
      cyclomaticBase: 1,
    };

    // Calculate cyclomatic complexity
    metrics.cyclomatic = metrics.cyclomaticBase + 
      metrics.conditionals + 
      metrics.loops + 
      (metrics.functions * 0.5);

    // Calculate entropy score (0-1 scale)
    const entropy = this.calculateEntropyScore(metrics);
    
    // Determine status
    let status = 'healthy';
    if (entropy > 0.7) {
      status = 'critical';
    } else if (entropy > this.config.entropyThreshold) {
      status = 'technical_debt';
    }

    return {
      path: filePath,
      fileName: path.basename(filePath),
      entropy: Math.round(entropy * 1000) / 1000,
      status,
      metrics,
      recommendations: this.getRecommendations(entropy, metrics),
    };
  }

  /**
   * Count regex matches in content
   */
  countMatches(content, regex) {
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Calculate maximum nesting depth
   */
  calculateMaxNesting(content) {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of content) {
      if (char === '{' || char === '(' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ')' || char === ']') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    return maxDepth;
  }

  /**
   * Calculate entropy score from metrics (0-1 scale)
   */
  calculateEntropyScore(metrics) {
    const w = this.config.complexityWeight;
    
    // Normalize each metric to 0-1 scale
    const functionScore = Math.min(metrics.functions / 20, 1);
    const conditionalScore = Math.min(metrics.conditionals / 15, 1);
    const loopScore = Math.min(metrics.loops / 10, 1);
    const nestingScore = Math.min(metrics.nestedDepth / 8, 1);
    const locScore = Math.min(metrics.linesOfCode / 500, 1);
    
    // Weighted average
    const rawScore = 
      (functionScore * w.functions * 0.25) +
      (conditionalScore * w.conditionals * 0.25) +
      (loopScore * w.loops * 0.20) +
      (nestingScore * w.nestedDepth * 0.20) +
      (locScore * w.linesOfCode * 10 * 0.10);
    
    return Math.min(rawScore, 1);
  }

  /**
   * Get recommendations based on entropy level
   */
  getRecommendations(entropy, metrics) {
    const recommendations = [];
    
    if (entropy > 0.7) {
      recommendations.push('🔴 CRITICAL: Consider immediate refactoring');
    } else if (entropy > 0.5) {
      recommendations.push('🟡 WARNING: Technical debt detected');
    }
    
    if (metrics.nestedDepth > 6) {
      recommendations.push('📉 Reduce nesting depth (extract functions)');
    }
    
    if (metrics.functions > 15) {
      recommendations.push('📦 Consider splitting into multiple modules');
    }
    
    if (metrics.loops > 8) {
      recommendations.push('🔄 Consider using map/filter/reduce instead of loops');
    }
    
    if (metrics.conditionals > 10) {
      recommendations.push('🔀 Consider using strategy pattern or lookup tables');
    }
    
    return recommendations;
  }

  /**
   * Scan a directory for high-entropy files
   */
  scanDirectory(dirPath, maxDepth = 3) {
    const results = [];
    this.scanRecursive(dirPath, results, 0, maxDepth);
    return results.sort((a, b) => b.entropy - a.entropy);
  }

  /**
   * Recursive directory scanning
   */
  scanRecursive(dirPath, results, currentDepth, maxDepth) {
    if (currentDepth > maxDepth) return;
    
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        
        // Skip excluded patterns
        if (this.config.excludePatterns.some(pattern => fullPath.includes(pattern))) {
          continue;
        }
        
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanRecursive(fullPath, results, currentDepth + 1, maxDepth);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (this.config.fileExtensions.includes(ext)) {
            const analysis = this.analyzeFile(fullPath);
            if (analysis.error) {
              results.push({ path: fullPath, error: analysis.error });
            } else {
              results.push(analysis);
            }
          }
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
  }
}

// ============================================================================
// ENTROPY TRACKER - Main class with queue integration
// ============================================================================

export class EntropyTracker {
  constructor(orchestrator = null, config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.analyzer = new EntropyAnalyzer(this.config);
    this.orchestrator = orchestrator;
    
    // Track analyzed files
    this.fileHistory = new Map();
    this.refactorQueue = [];
    this.debounceTimers = new Map();
    
    // Dashboard logging
    this.dashboardLogs = [];
    this.maxLogs = 100;
  }

  /**
   * Analyze a file and optionally queue refactor task
   */
  async trackFile(filePath) {
    console.log(`🔍 Analyzing entropy for: ${filePath}`);
    
    const analysis = this.analyzer.analyzeFile(filePath);
    
    if (analysis.error) {
      console.error(`❌ Entropy analysis failed: ${analysis.error}`);
      return analysis;
    }
    
    // Store in history
    const previous = this.fileHistory.get(filePath);
    this.fileHistory.set(filePath, {
      ...analysis,
      analyzedAt: Date.now(),
      previousEntropy: previous?.entropy || 0,
    });
    
    // Log to dashboard
    this.logToDashboard(analysis);
    
    // Check if we should queue a refactor task
    if (analysis.status === 'critical' || analysis.status === 'technical_debt') {
      this.scheduleRefactorTask(filePath, analysis);
    }
    
    return analysis;
  }

  /**
   * Schedule a refactor task with debouncing
   */
  scheduleRefactorTask(filePath, analysis) {
    // Clear existing timer for this file
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }
    
    // Set new debounce timer
    const timer = setTimeout(async () => {
      await this.queueRefactorTask(filePath, analysis);
      this.debounceTimers.delete(filePath);
    }, this.config.debounceMs);
    
    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Queue refactor task in orchestrator
   */
  async queueRefactorTask(filePath, analysis) {
    if (!this.orchestrator) {
      console.log(`📝 Refactor suggestion: ${filePath} (entropy: ${analysis.entropy})`);
      return;
    }
    
    const refactorTask = {
      type: 'refactor',
      targetFile: filePath,
      reason: `High entropy detected: ${analysis.status}`,
      entropy: analysis.entropy,
      recommendations: analysis.recommendations,
      priority: analysis.status === 'critical' ? 'high' : 'medium',
      createdAt: Date.now(),
    };
    
    this.refactorQueue.push(refactorTask);
    
    // Try to inject into orchestrator queue
    if (this.orchestrator.rateLimiter) {
      console.log(`📋 Queued refactor task for: ${filePath}`);
      // The actual injection would depend on orchestrator's queue structure
    }
    
    this.logToDashboard({
      type: 'refactor_queued',
      ...refactorTask,
    });
  }

  /**
   * Log analysis to dashboard
   */
  logToDashboard(entry) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    
    this.dashboardLogs.push(logEntry);
    
    // Keep only last N logs
    if (this.dashboardLogs.length > this.maxLogs) {
      this.dashboardLogs = this.dashboardLogs.slice(-this.maxLogs);
    }
    
    // Console output with emoji indicators
    if (entry.status === 'critical') {
      console.log(`🔴 CRITICAL ENTROPY: ${entry.fileName} = ${entry.entropy}`);
    } else if (entry.status === 'technical_debt') {
      console.log(`🟡 TECHNICAL DEBT: ${entry.fileName} = ${entry.entropy}`);
    } else if (entry.type === 'refactor_queued') {
      console.log(`📋 REFACTOR QUEUED: ${entry.targetFile}`);
    }
  }

  /**
   * Get dashboard data
   */
  getDashboardData() {
    const files = Array.from(this.fileHistory.values());
    
    return {
      totalFilesAnalyzed: files.length,
      criticalFiles: files.filter(f => f.status === 'critical').length,
      technicalDebtFiles: files.filter(f => f.status === 'technical_debt').length,
      healthyFiles: files.filter(f => f.status === 'healthy').length,
      averageEntropy: files.length > 0 
        ? files.reduce((sum, f) => sum + (f.entropy || 0), 0) / files.length 
        : 0,
      recentAnalyses: this.dashboardLogs.slice(-20),
      pendingRefactors: this.refactorQueue.length,
      refactorQueue: this.refactorQueue.slice(-10),
    };
  }

  /**
   * Scan a project directory
   */
  async scanProject(projectPath) {
    console.log(`📊 Scanning project for entropy: ${projectPath}`);
    
    const results = this.analyzer.scanDirectory(projectPath, this.config.scanDepth);
    
    // Track all files
    for (const analysis of results) {
      if (!analysis.error) {
        await this.trackFile(analysis.path);
      }
    }
    
    return this.getDashboardData();
  }

  /**
   * Get entropy statistics
   */
  getStats() {
    const files = Array.from(this.fileHistory.values());
    
    return {
      filesAnalyzed: files.length,
      entropyDistribution: {
        critical: files.filter(f => f.status === 'critical').length,
        technicalDebt: files.filter(f => f.status === 'technical_debt').length,
        healthy: files.filter(f => f.status === 'healthy').length,
      },
      topTechnicalDebt: files
        .filter(f => f.entropy)
        .sort((a, b) => b.entropy - a.entropy)
        .slice(0, 5)
        .map(f => ({ path: f.path, entropy: f.entropy })),
    };
  }
}

// ============================================================================
// STANDALONE STARTUP (for testing)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new EntropyTracker();
  
  // Test with a sample file
  const testPath = process.argv[2] || './orchestrator.js';
  
  if (existsSync(testPath)) {
    console.log(`\n🔬 ENTROPY ANALYSIS: ${testPath}\n`);
    const result = tracker.trackFile(testPath);
    
    console.log('\n📊 Results:');
    console.log(`   Entropy Score: ${result.entropy}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Metrics:`, result.metrics);
    console.log(`\n💡 Recommendations:`);
    result.recommendations.forEach(r => console.log(`   ${r}`));
  } else {
    console.log(`File not found: ${testPath}`);
  }
}

// Memory-Driven Evolution System
// Self-improvement loop: Perception -> Memory -> Autonomy

import { EventEmitter } from 'events';
import { workingMemory } from '../memory/working-memory.js';
import { episodicMemory } from '../memory/episodic-memory.js';

/**
 * Memory-Driven Evolution Engine
 * Implements closed-loop self-improvement cycle
 */
class MemoryDrivenEvolution extends EventEmitter {
  constructor(options = {}) {
    super();
    this.enabled = options.enabled !== false;
    this.cycleInterval = options.cycleInterval || 30000; // 30 seconds
    this.evolutionCycle = null;
    this.workingMemory = workingMemory;
    this.episodicMemory = episodicMemory;
    this.improvementHistory = [];
    
    if (this.enabled) {
      this.startEvolutionCycle();
    }
  }

  /**
   * Start the continuous evolution cycle
   */
  startEvolutionCycle() {
    if (this.evolutionCycle) return;
    
    this.evolutionCycle = setInterval(async () => {
      await this.runEvolutionCycle();
    }, this.cycleInterval);
    
    console.log('[MemoryDrivenEvolution] Started evolution cycle');
  }

  /**
   * Stop the evolution cycle
   */
  stopEvolutionCycle() {
    if (this.evolutionCycle) {
      clearInterval(this.evolutionCycle);
      this.evolutionCycle = null;
      console.log('[MemoryDrivenEvolution] Stopped evolution cycle');
    }
  }

  /**
   * Run one complete evolution cycle
   */
  async runEvolutionCycle() {
    try {
      console.log('[MemoryDrivenEvolution] Running evolution cycle...');
      
      // 1. Analyze recent memory patterns
      const memoryAnalysis = await this.analyzeMemoryPatterns();
      
      // 2. Extract learning opportunities
      const learnings = await this.extractLearnings(memoryAnalysis);
      
      // 3. Generate improvement suggestions
      const improvements = await this.generateImprovements(learnings);
      
      // 4. Apply beneficial changes
      const appliedChanges = await this.applyImprovements(improvements);
      
      // 5. Record evolution event
      this.recordEvolutionEvent({
        timestamp: new Date().toISOString(),
        analysis: memoryAnalysis,
        learnings,
        improvements,
        appliedChanges,
        memoryStats: this.getCurrentMemoryStats()
      });
      
      this.emit('evolutionComplete', {
        timestamp: new Date().toISOString(),
        changesApplied: appliedChanges.length
      });
      
    } catch (error) {
      console.error('[MemoryDrivenEvolution] Cycle failed:', error.message);
      this.emit('evolutionError', error);
    }
  }

  /**
   * Analyze patterns in working and episodic memory
   */
  async analyzeMemoryPatterns() {
    const workingStats = this.workingMemory.getStats();
    const recentEpisodes = this.episodicMemory.listEpisodes().slice(0, 5);
    
    return {
      workingMemoryUtilization: workingStats.utilization,
      memoryTypesDistribution: workingStats.types,
      recentEpisodeCount: recentEpisodes.length,
      commonInteractionPatterns: this.identifyPatterns(recentEpisodes)
    };
  }

  /**
   * Extract learnings from memory analysis
   */
  async extractLearnings(analysis) {
    const learnings = [];
    
    // Identify memory pressure points
    if (analysis.workingMemoryUtilization > 80) {
      learnings.push({
        type: 'memory_pressure',
        severity: 'high',
        suggestion: 'Increase working memory capacity or optimize eviction strategy'
      });
    }
    
    // Identify frequently accessed patterns
    const frequentTypes = Object.entries(analysis.memoryTypesDistribution)
      .filter(([type, count]) => count > 10)
      .map(([type]) => type);
    
    if (frequentTypes.length > 0) {
      learnings.push({
        type: 'usage_pattern',
        patterns: frequentTypes,
        suggestion: 'Optimize handling for frequently accessed memory types'
      });
    }
    
    return learnings;
  }

  /**
   * Generate actionable improvements
   */
  async generateImprovements(learnings) {
    return learnings.map(learning => ({
      id: `improvement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      learningId: learning.type,
      description: learning.suggestion,
      priority: learning.severity === 'high' ? 'urgent' : 'normal',
      implementation: this.createImplementationPlan(learning)
    }));
  }

  /**
   * Apply improvements to system configuration
   */
  async applyImprovements(improvements) {
    const applied = [];
    
    for (const improvement of improvements) {
      try {
        // Apply memory-related improvements
        if (improvement.learningId === 'memory_pressure') {
          // Example: Adjust working memory parameters
          console.log(`[MemoryDrivenEvolution] Applying: ${improvement.description}`);
          applied.push(improvement);
        }
        
      } catch (error) {
        console.error(`[MemoryDrivenEvolution] Failed to apply ${improvement.id}:`, error.message);
      }
    }
    
    return applied;
  }

  /**
   * Helper methods
   */
  identifyPatterns(episodes) {
    // Simplified pattern identification
    return episodes.map(ep => ({
      sessionId: ep.sessionId,
      eventCount: ep.events?.length || 0,
      duration: ep.duration || 0
    }));
  }

  createImplementationPlan(learning) {
    return {
      steps: [
        `Analyze ${learning.type} pattern`,
        `Generate optimization strategy`,
        `Apply configuration changes`,
        `Monitor effectiveness`
      ],
      estimatedTime: '5 minutes',
      rollbackPlan: 'Restore previous memory configuration'
    };
  }

  getCurrentMemoryStats() {
    return {
      workingMemory: this.workingMemory.getStats(),
      episodicMemory: this.episodicMemory.getStats()
    };
  }

  recordEvolutionEvent(event) {
    this.improvementHistory.push(event);
    // Keep only last 100 events
    if (this.improvementHistory.length > 100) {
      this.improvementHistory.shift();
    }
  }

  /**
   * Get evolution statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      cycleInterval: this.cycleInterval,
      totalCycles: this.improvementHistory.length,
      lastEvolution: this.improvementHistory[this.improvementHistory.length - 1]?.timestamp || null,
      currentMemoryStats: this.getCurrentMemoryStats()
    };
  }
}

// Singleton instance
let evolutionEngine = null;

export function getEvolutionEngine() {
  if (!evolutionEngine) {
    evolutionEngine = new MemoryDrivenEvolution();
  }
  return evolutionEngine;
}

export { MemoryDrivenEvolution };

/**
 * Fusion Engine - The "Prefrontal Cortex" of the System
 * 
 * This is where:
 * - Kilo + Lingma parallel outputs merge
 * - Shared memory integrates
 * - Orchestrated execution converges
 * - Conflicts resolve
 * - Final results synthesize
 * 
 * Usage:
 *   import { FusionEngine } from './utils/fusion-engine.js';
 *   
 *   const result = await FusionEngine.fuse({
 *     inputs: [kiloOutput, lingmaOutput],
 *     context: unifiedBrain,
 *     domain: 'medical'
 *   });
 */

import { getUnifiedBrain } from '../agent-memory.js';

/**
 * Merge Strategies - Different ways to combine agent outputs
 */
const MergeStrategies = {
  /**
   * Concatenate outputs with clear separation
   */
  concatenate: (outputs) => {
    return outputs.map(o => o.content).join('\n\n---\n\n');
  },

  /**
   * Consensus - Find agreement between outputs
   */
  consensus: (outputs) => {
    // Find common elements
    const contents = outputs.map(o => o.content.toLowerCase());
    const common = contents[0].split(' ').filter(word => 
      contents.every(c => c.includes(word))
    );
    return common.slice(0, 20).join(' ');
  },

  /**
   * Priority-based - Weight by agent expertise
   */
  priority: (outputs, priorities = {}) => {
    // Sort by priority
    const sorted = outputs.sort((a, b) => {
      const priA = priorities[a.agent] || 0;
      const priB = priorities[b.agent] || 0;
      return priB - priA;
    });
    return sorted[0].content;
  },

  /**
   * Synthesis - Create new unified answer
   */
  synthesis: (outputs) => {
    // Extract key points from each output
    const keyPoints = outputs.flatMap(o => o.keyPoints || [o.content]);
    
    // Create synthesis (in production, use LLM for true synthesis)
    return {
      synthesized: true,
      keyPoints: keyPoints.slice(0, 5),
      agentCount: outputs.length,
      sources: outputs.map(o => o.agent)
    };
  }
};

/**
 * Conflict Resolution Rules
 */
const ConflictResolvers = {
  /**
   * Medical conflicts - defer to clinical authority
   */
  medical: (conflicts) => {
    const clinical = conflicts.find(c => c.agent === 'clinical');
    if (clinical) return clinical;
    
    // Fallback: longest answer wins for medical
    return conflicts.sort((a, b) => b.content.length - a.content.length)[0];
  },

  /**
   * Security conflicts - defer to security authority
   */
  security: (conflicts) => {
    const security = conflicts.find(c => c.agent === 'security');
    if (security) return security;
    return conflicts.sort((a, b) => b.confidence - a.confidence)[0];
  },

  /**
   * Code conflicts - prefer working code
   */
  code: (conflicts) => {
    // Prefer outputs that compile/are valid
    const valid = conflicts.filter(c => c.valid === true);
    if (valid.length > 0) {
      return valid.sort((a, b) => b.confidence - a.confidence)[0];
    }
    return conflicts[0];
  },

  /**
   * Default - highest confidence wins
   */
  default: (conflicts) => {
    return conflicts.sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5))[0];
  }
};

/**
 * Domain Rules - Apply domain-specific processing
 */
const DomainRules = {
  medical: {
    minConfidence: 0.7,
    requireSources: true,
    maxLength: 5000,
    validate: (output) => {
      return output.confidence >= 0.7 && output.sources?.length > 0;
    }
  },
  coding: {
    requireTests: true,
    maxLength: 10000,
    validate: (output) => {
      return output.valid !== false;
    }
  },
  security: {
    requireReview: true,
    minConfidence: 0.9,
    validate: (output) => {
      return output.confidence >= 0.9;
    }
  },
  default: {
    maxLength: 8000,
    validate: () => true
  }
};

/**
 * Fusion Engine Main Class
 */
export class FusionEngine {
  constructor() {
    this.mergeStrategy = 'synthesis';
    this.conflictResolver = 'default';
  }

  /**
   * Fuse multiple agent outputs into single result
   */
  async fuse({ inputs, context, domain = 'default', strategy = 'synthesis' }) {
    console.log(`[Fusion] Fusing ${inputs.length} inputs for domain: ${domain}`);
    
    // 1. Load unified context
    const unifiedBrain = context || await getUnifiedBrain();
    
    // 2. Apply domain rules
    const domainRules = DomainRules[domain] || DomainRules.default;
    const validated = inputs.filter(input => domainRules.validate(input));
    
    if (validated.length === 0) {
      console.log('[Fusion] No valid outputs, using defaults');
      return this.fuse({ inputs, context, domain: 'default' });
    }
    
    // 3. Detect conflicts
    const conflicts = this.detectConflicts(validated);
    let resolved = validated;
    
    if (conflicts.length > 1) {
      console.log(`[Fusion] Resolving ${conflicts.length} conflicts using ${domain} resolver`);
      resolved = this.resolveConflicts(conflicts, domain);
    }
    
    // 4. Apply merge strategy
    const merged = this.applyMergeStrategy(resolved, strategy, unifiedBrain);
    
    // 5. Apply domain-specific post-processing
    const final = this.applyDomainRules(merged, domain, unifiedBrain);
    
    console.log(`[Fusion] Fusion complete: ${final.sources?.length || 1} sources`);
    return final;
  }

  /**
   * Detect conflicting outputs
   */
  detectConflicts(outputs) {
    // Simple conflict detection - in production use semantic similarity
    const conflicts = [];
    
    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        const similarity = this.calculateSimilarity(
          outputs[i].content || outputs[i].answer,
          outputs[j].content || outputs[j].answer
        );
        
        // If very different (>30% difference), mark as potential conflict
        if (similarity < 0.7) {
          conflicts.push(outputs[i], outputs[j]);
        }
      }
    }
    
    return [...new Set(conflicts)];
  }

  /**
   * Calculate similarity between two texts
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set((text1 || '').toLowerCase().split(' '));
    const words2 = new Set((text2 || '').toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Resolve conflicts using domain-specific rules
   */
  resolveConflicts(conflicts, domain) {
    const resolver = ConflictResolvers[domain] || ConflictResolvers.default;
    return resolver(conflicts);
  }

  /**
   * Apply merge strategy
   */
  applyMergeStrategy(outputs, strategy, context) {
    const merger = MergeStrategies[strategy] || MergeStrategies.synthesis;
    
    const merged = merger(outputs);
    
    // Return structured result
    if (typeof merged === 'object' && merged.synthesized) {
      return {
        ...merged,
        context: context.domains?.[Object.keys(context.domains)[0]]?.entries?.[0]?.content,
        strategy
      };
    }
    
    return {
      content: merged,
      sources: outputs.map(o => o.agent),
      strategy,
      synthesized: true
    };
  }

  /**
   * Apply domain-specific post-processing
   */
  applyDomainRules(output, domain, context) {
    const rules = DomainRules[domain] || DomainRules.default;
    
    return {
      ...output,
      domain,
      confidence: output.confidence || 0.8,
      processed: true,
      timestamp: Date.now(),
      contextUsed: Object.keys(context.domains || {}).length
    };
  }

  /**
   * Fuse with role-based weighting
   */
  async fuseWithRoles({ inputs, roles, domain = 'default' }) {
    // Assign weights based on roles
    const priorities = {};
    roles.forEach((role, idx) => {
      priorities[role.agent] = 10 - idx; // Higher index = lower priority
    });
    
    return this.fuse({ 
      inputs, 
      domain, 
      strategy: 'priority',
      context: await getUnifiedBrain()
    });
  }

  /**
   * Fuse parallel outputs from Kilo + Lingma
   */
  async fuseParallel(kiloOutput, lingmaOutput, domain = 'default') {
    return this.fuse({
      inputs: [
        { ...kiloOutput, agent: 'kilo' },
        { ...lingmaOutput, agent: 'lingma' }
      ],
      domain,
      strategy: 'synthesis'
    });
  }
}

// Export singleton
export const fusionEngine = new FusionEngine();
export default FusionEngine;
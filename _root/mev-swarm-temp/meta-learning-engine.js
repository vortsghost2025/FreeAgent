/**
 * 🧠 Meta-Learning Engine - Self-Designing Adaptation System
 * Enables the organism to evolve its own behavioral rules based on experience
 */

class MetaLearningEngine {
  constructor(config = {}) {
    this.learningRate = config.learningRate || 0.1;
    this.memoryWindow = config.memoryWindow || 1000;
    this.minExperience = config.minExperience || 50;
    
    // Rule performance tracking
    this.rulePerformance = new Map();
    this.modeTransitionOutcomes = new Map();
    this.thresholdHistory = new Map();
    
    // Adaptive parameters
    this.adaptiveThresholds = {
      performanceDegradation: 0.6,    // successRate < threshold
      volatilityTrigger: 3.0,         // volatility > threshold  
      stressActivation: 0.7,          // stressLevel > threshold
      healthRecovery: 0.8,            // health > threshold
      opportunityWindow: 0.6          // optimizationOpportunity > threshold
    };
    
    // Learning statistics
    this.learningStats = {
      totalAdaptations: 0,
      successfulAdaptations: 0,
      ruleUpdates: 0,
      thresholdAdjustments: 0
    };
    
    this.isLearning = false;
  }

  async initialize() {
    this.isLearning = true;
    console.log('🧠 Meta-Learning Engine initialized - self-design capability active');
  }

  // Record adaptation outcomes for learning
  recordAdaptation(adaptationEvent) {
    const { ruleName, outcome, metricsBefore, metricsAfter, timestamp } = adaptationEvent;
    
    // Store adaptation event
    if (!this.rulePerformance.has(ruleName)) {
      this.rulePerformance.set(ruleName, []);
    }
    
    const ruleHistory = this.rulePerformance.get(ruleName);
    ruleHistory.push({
      outcome,
      improvement: this.calculateImprovement(metricsBefore, metricsAfter),
      timestamp: timestamp || Date.now()
    });
    
    // Maintain memory window
    if (ruleHistory.length > this.memoryWindow) {
      ruleHistory.shift();
    }
    
    this.learningStats.totalAdaptations++;
    if (outcome === 'success') {
      this.learningStats.successfulAdaptations++;
    }
    
    console.log(`📊 Meta-learning recorded: ${ruleName} - ${outcome}`);
  }

  // Calculate improvement from adaptation
  calculateImprovement(before, after) {
    if (!before || !after) return 0;
    
    // Weighted improvement calculation
    const healthImprovement = (after.systemHealth || 0) - (before.systemHealth || 0);
    const profitImprovement = (after.totalProfit || 0) - (before.totalProfit || 0);
    const stressReduction = (before.derived?.stressLevel || 0) - (after.derived?.stressLevel || 0);
    
    // Composite improvement score (-1 to +1)
    return (healthImprovement * 0.4 + 
            (profitImprovement > 0 ? 0.3 : -0.3) + 
            stressReduction * 0.3);
  }

  // Learn from mode transitions
  recordModeTransition(transition) {
    const { fromMode, toMode, reason, outcome, duration, timestamp } = transition;
    const transitionKey = `${fromMode}->${toMode}`;
    
    if (!this.modeTransitionOutcomes.has(transitionKey)) {
      this.modeTransitionOutcomes.set(transitionKey, []);
    }
    
    const transitionHistory = this.modeTransitionOutcomes.get(transitionKey);
    transitionHistory.push({
      reason,
      outcome,
      duration,
      success: outcome === 'success' || outcome === 'recovery',
      timestamp: timestamp || Date.now()
    });
    
    if (transitionHistory.length > this.memoryWindow) {
      transitionHistory.shift();
    }
  }

  // Reinforcement learning for adaptation rules
  evaluateRuleEffectiveness(ruleName) {
    const history = this.rulePerformance.get(ruleName);
    if (!history || history.length < this.minExperience) {
      return { score: 0.5, confidence: 0 }; // Neutral score for insufficient data
    }
    
    const recentHistory = history.slice(-50); // Last 50 adaptations
    const successes = recentHistory.filter(h => h.outcome === 'success').length;
    const avgImprovement = recentHistory.reduce((sum, h) => sum + h.improvement, 0) / recentHistory.length;
    
    const successRate = successes / recentHistory.length;
    const confidence = Math.min(1, recentHistory.length / this.minExperience);
    
    // Combined effectiveness score (-1 to +1)
    const effectiveness = (successRate * 2 - 1) * 0.7 + avgImprovement * 0.3;
    
    return {
      score: Math.max(-1, Math.min(1, effectiveness)),
      confidence,
      successRate,
      avgImprovement,
      sampleSize: recentHistory.length
    };
  }

  // Adaptive threshold drift based on outcomes
  updateAdaptiveThresholds(organismState, adaptationOutcome) {
    const improvement = this.calculateImprovement(
      adaptationOutcome.before, 
      adaptationOutcome.after
    );
    
    // Adjust thresholds based on whether adaptation helped or hurt
    Object.keys(this.adaptiveThresholds).forEach(thresholdKey => {
      const currentValue = this.adaptiveThresholds[thresholdKey];
      const learningImpact = improvement * this.learningRate;
      
      // Store threshold history
      if (!this.thresholdHistory.has(thresholdKey)) {
        this.thresholdHistory.set(thresholdKey, []);
      }
      
      this.thresholdHistory.get(thresholdKey).push({
        value: currentValue,
        improvement,
        timestamp: Date.now()
      });
      
      // Adjust threshold (with bounds)
      let newValue = currentValue;
      if (improvement > 0.1) {
        // Adaptation helped - make threshold slightly easier to trigger
        newValue = this.relaxThreshold(thresholdKey, currentValue);
      } else if (improvement < -0.1) {
        // Adaptation hurt - make threshold slightly harder to trigger
        newValue = this.tightenThreshold(thresholdKey, currentValue);
      }
      
      this.adaptiveThresholds[thresholdKey] = newValue;
      this.learningStats.thresholdAdjustments++;
    });
    
    console.log(`🔧 Thresholds adjusted based on outcome: ${improvement > 0 ? 'relaxed' : 'tightened'}`);
  }

  // Threshold relaxation functions
  relaxThreshold(thresholdKey, currentValue) {
    switch (thresholdKey) {
      case 'performanceDegradation':
        return Math.max(0.3, currentValue - 0.05); // Lower success rate threshold
      case 'volatilityTrigger':
        return Math.max(1.0, currentValue + 0.2); // Higher volatility tolerance
      case 'stressActivation':
        return Math.min(0.9, currentValue + 0.05); // Higher stress tolerance
      case 'healthRecovery':
        return Math.min(0.95, currentValue - 0.05); // Lower recovery threshold
      case 'opportunityWindow':
        return Math.max(0.3, currentValue - 0.1); // Lower opportunity threshold
      default:
        return currentValue;
    }
  }

  // Threshold tightening functions
  tightenThreshold(thresholdKey, currentValue) {
    switch (thresholdKey) {
      case 'performanceDegradation':
        return Math.min(0.8, currentValue + 0.05); // Higher success rate requirement
      case 'volatilityTrigger':
        return Math.max(1.5, currentValue - 0.2); // Lower volatility tolerance
      case 'stressActivation':
        return Math.max(0.5, currentValue - 0.05); // Lower stress tolerance
      case 'healthRecovery':
        return Math.max(0.6, currentValue + 0.05); // Higher recovery requirement
      case 'opportunityWindow':
        return Math.min(0.9, currentValue + 0.1); // Higher opportunity requirement
      default:
        return currentValue;
    }
  }

  // Generate adaptive adaptation rules
  getAdaptiveRules() {
    const rules = [];
    
    // Performance degradation rule
    const perfRuleScore = this.evaluateRuleEffectiveness('performance_degradation');
    if (perfRuleScore.confidence > 0.7) {
      rules.push({
        name: 'adaptive_performance_degradation',
        condition: (state) => state.performance.analytics?.recentSuccessRate < this.adaptiveThresholds.performanceDegradation,
        action: async (state) => {
          console.log('🔧 Adaptive performance degradation response');
          // Implementation would call mode manager
        },
        weight: Math.max(0.1, perfRuleScore.score),
        confidence: perfRuleScore.confidence
      });
    }
    
    // Volatility response rule
    const volRuleScore = this.evaluateRuleEffectiveness('high_volatility');
    if (volRuleScore.confidence > 0.7) {
      rules.push({
        name: 'adaptive_volatility_response',
        condition: (state) => state.derived.stressLevel > this.adaptiveThresholds.volatilityTrigger,
        action: async (state) => {
          console.log('🌪️ Adaptive volatility response');
          // Implementation would call mode manager
        },
        weight: Math.max(0.1, volRuleScore.score),
        confidence: volRuleScore.confidence
      });
    }
    
    return rules;
  }

  // Learn optimal mode transitions
  getModeTransitionPreferences() {
    const preferences = new Map();
    
    for (const [transitionKey, history] of this.modeTransitionOutcomes.entries()) {
      if (history.length < 10) continue; // Need minimum experience
      
      const successRate = history.filter(h => h.success).length / history.length;
      const avgDuration = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
      
      preferences.set(transitionKey, {
        successRate,
        avgDuration,
        preferenceScore: successRate * (1 - avgDuration / 3600000), // Normalize duration to hours
        experience: history.length
      });
    }
    
    return preferences;
  }

  // Get current learning status
  getLearningStatus() {
    const ruleEffectiveness = {};
    for (const ruleName of this.rulePerformance.keys()) {
      ruleEffectiveness[ruleName] = this.evaluateRuleEffectiveness(ruleName);
    }
    
    const successRate = this.learningStats.totalAdaptations > 0 
      ? this.learningStats.successfulAdaptations / this.learningStats.totalAdaptations 
      : 0;
    
    return {
      isActive: this.isLearning,
      totalAdaptations: this.learningStats.totalAdaptations,
      successRate,
      ruleUpdates: this.learningStats.ruleUpdates,
      thresholdAdjustments: this.learningStats.thresholdAdjustments,
      ruleEffectiveness,
      currentThresholds: { ...this.adaptiveThresholds },
      modePreferences: this.getModeTransitionPreferences()
    };
  }

  // Export learning for persistence
  exportLearning() {
    return {
      rulePerformance: Object.fromEntries(this.rulePerformance),
      modeTransitions: Object.fromEntries(this.modeTransitionOutcomes),
      thresholds: this.adaptiveThresholds,
      stats: this.learningStats,
      timestamp: Date.now()
    };
  }

  // Import previous learning (for persistence across restarts)
  importLearning(learningData) {
    if (learningData.rulePerformance) {
      this.rulePerformance = new Map(Object.entries(learningData.rulePerformance));
    }
    
    if (learningData.modeTransitions) {
      this.modeTransitionOutcomes = new Map(Object.entries(learningData.modeTransitions));
    }
    
    if (learningData.thresholds) {
      this.adaptiveThresholds = learningData.thresholds;
    }
    
    if (learningData.stats) {
      this.learningStats = learningData.stats;
    }
    
    console.log('🧠 Meta-learning imported from previous sessions');
  }

  pauseLearning() {
    this.isLearning = false;
    console.log('⏸️ Meta-Learning Engine paused');
  }

  resumeLearning() {
    this.isLearning = true;
    console.log('▶️ Meta-Learning Engine resumed');
  }
}

export default MetaLearningEngine;
// 🧠 Per-Agent Interest Profiles for Role Learning
// Each agent maintains adaptive policies for message response

import MessageMetadataSchema from './message-metadata-schema.js';

class AgentInterestProfile {
  constructor(agentId, role) {
    this.agentId = agentId;
    this.role = role;
    this.metadataSchema = new MessageMetadataSchema();
    
    // Interest scores by message type and topic (0-1 scale)
    this.interestScores = new Map();
    
    // Initialize with neutral interest
    this.initializeInterestScores();
    
    // Learning statistics
    this.experience = {
      totalInteractions: 0,
      successfulActions: 0,
      failedActions: 0,
      conflicts: 0,
      observationPeriods: 0
    };
    
    // Performance history for learning
    this.performanceHistory = [];
    this.maxHistoryLength = 1000; // Keep last 1000 interactions
    
    // Confidence thresholds for action
    this.actionThresholds = {
      HIGH_CONFIDENCE: 0.8,
      MEDIUM_CONFIDENCE: 0.6,
      LOW_CONFIDENCE: 0.3
    };
  }
  
  // Initialize interest scores for all message types and topics
  initializeInterestScores() {
    // Create combinations of types and topics
    this.metadataSchema.MESSAGE_TYPES.forEach(type => {
      this.metadataSchema.TOPICS.forEach(topic => {
        const key = `${type}:${topic}`;
        this.interestScores.set(key, 0.5); // Start with neutral interest
      });
    });
  }
  
  // Calculate interest score for a specific message
  calculateInterest(messageMetadata) {
    const key = `${messageMetadata.type}:${messageMetadata.topic}`;
    const baseInterest = this.interestScores.get(key) || 0.5;
    
    // Adjust based on system context
    let adjustedInterest = baseInterest;
    
    // Increase interest if system is stressed and this is a health-related message
    if (messageMetadata.type === 'health_alert' && messageMetadata.stressLevel > 50) {
      adjustedInterest = Math.min(1.0, adjustedInterest + 0.2);
    }
    
    // Decrease interest if we're already overloaded
    if (this.experience.totalInteractions > 100 && 
        this.getSuccessRate() < 0.3) {
      adjustedInterest *= 0.7; // Reduce activity when performing poorly
    }
    
    // Role-based adjustments
    adjustedInterest = this.applyRoleAdjustments(adjustedInterest, messageMetadata);
    
    return Math.max(0, Math.min(1, adjustedInterest));
  }
  
  // Role-specific interest adjustments
  applyRoleAdjustments(interest, metadata) {
    switch (this.role) {
      case 'meta_controller':
        if (metadata.type === 'mode_change' || metadata.type === 'health_alert') {
          return Math.min(1.0, interest + 0.3);
        }
        break;
        
      case 'economic_engine':
        if (metadata.type === 'arbitrage_opportunity' || metadata.type === 'strategy_evaluation') {
          return Math.min(1.0, interest + 0.4);
        }
        break;
        
      case 'strategy_worker':
        if (metadata.type === 'execution_result' || metadata.type === 'strategy_evaluation') {
          return Math.min(1.0, interest + 0.3);
        }
        break;
        
      case 'health_monitor':
        if (metadata.type === 'health_alert' || metadata.type === 'performance_metric') {
          return Math.min(1.0, interest + 0.5);
        }
        break;
        
      case 'vscode_agent':
        if (metadata.type === 'code_change' || metadata.type === 'analysis_request') {
          return Math.min(1.0, interest + 0.4);
        }
        break;
        
      case 'lmstudio_agent':
        if (metadata.type === 'analysis_request' || metadata.type === 'learning_update') {
          return Math.min(1.0, interest + 0.3);
        }
        break;
    }
    
    return interest;
  }
  
  // Decide whether to act on a message
  shouldAct(messageMetadata) {
    const interest = this.calculateInterest(messageMetadata);
    const confidence = messageMetadata.confidence || 0.5;
    
    // Higher interest + higher confidence = more likely to act
    const actionProbability = interest * confidence;
    
    // Compare against thresholds
    if (actionProbability >= this.actionThresholds.HIGH_CONFIDENCE) {
      return { shouldAct: true, confidence: 'high', probability: actionProbability };
    } else if (actionProbability >= this.actionThresholds.MEDIUM_CONFIDENCE) {
      return { shouldAct: true, confidence: 'medium', probability: actionProbability };
    } else if (actionProbability >= this.actionThresholds.LOW_CONFIDENCE) {
      return { shouldAct: Math.random() < 0.3, confidence: 'low', probability: actionProbability };
    } else {
      return { shouldAct: false, confidence: 'observe', probability: actionProbability };
    }
  }
  
  // Learn from interaction outcomes
  learnFromInteraction(messageMetadata, outcome, reward) {
    const key = `${messageMetadata.type}:${messageMetadata.topic}`;
    
    // Update experience counters
    this.experience.totalInteractions++;
    
    if (outcome === this.metadataSchema.OUTCOMES.SUCCESS) {
      this.experience.successfulActions++;
    } else if (outcome === this.metadataSchema.OUTCOMES.FAILURE || 
               outcome === this.metadataSchema.OUTCOMES.CONFLICT) {
      this.experience.failedActions++;
    }
    
    if (outcome === this.metadataSchema.OUTCOMES.CONFLICT) {
      this.experience.conflicts++;
    }
    
    // Update interest score using reinforcement learning
    const currentScore = this.interestScores.get(key) || 0.5;
    const normalizedReward = reward / 100; // Normalize to -1 to 1 range
    
    // Simple Q-learning update
    const learningRate = 0.1;
    const newScore = currentScore + learningRate * normalizedReward;
    
    // Clamp and store
    this.interestScores.set(key, Math.max(0, Math.min(1, newScore)));
    
    // Store in performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      messageKey: key,
      outcome: outcome,
      reward: reward,
      interestScore: newScore
    });
    
    // Trim history if too long
    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift();
    }
    
    // Periodic adjustment of thresholds based on performance
    this.adjustThresholds();
  }
  
  // Adjust action thresholds based on performance
  adjustThresholds() {
    const successRate = this.getSuccessRate();
    
    if (successRate > 0.8 && this.experience.totalInteractions > 50) {
      // Performing well - become more selective
      this.actionThresholds.HIGH_CONFIDENCE = 0.7;
      this.actionThresholds.MEDIUM_CONFIDENCE = 0.5;
    } else if (successRate < 0.3 && this.experience.totalInteractions > 30) {
      // Performing poorly - become more conservative
      this.actionThresholds.HIGH_CONFIDENCE = 0.9;
      this.actionThresholds.MEDIUM_CONFIDENCE = 0.7;
    }
  }
  
  // Get current success rate
  getSuccessRate() {
    if (this.experience.totalInteractions === 0) return 0;
    return this.experience.successfulActions / this.experience.totalInteractions;
  }
  
  // Get specialization report
  getSpecializationReport() {
    const topInterests = [...this.interestScores.entries()]
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    return {
      agentId: this.agentId,
      role: this.role,
      successRate: this.getSuccessRate(),
      totalInteractions: this.experience.totalInteractions,
      specializationAreas: topInterests.map(([key, score]) => ({
        area: key,
        interest: score
      })),
      thresholds: { ...this.actionThresholds }
    };
  }
  
  // Reset learning (for testing)
  reset() {
    this.initializeInterestScores();
    this.experience = {
      totalInteractions: 0,
      successfulActions: 0,
      failedActions: 0,
      conflicts: 0,
      observationPeriods: 0
    };
    this.performanceHistory = [];
  }
}

export default AgentInterestProfile;
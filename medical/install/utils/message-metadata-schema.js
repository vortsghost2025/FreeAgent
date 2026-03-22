// 🧬 Message Metadata Schema for Adaptive Role Learning
// Extended metadata structure for machine-learned role boundaries

class MessageMetadataSchema {
  constructor() {
    // Core message types that drive learning
    this.MESSAGE_TYPES = [
      'mode_change',        // System mode transitions
      'health_alert',       // System health/stress signals
      'arbitrage_opportunity', // Trading opportunities
      'strategy_evaluation',   // Strategy performance assessment
      'execution_result',   // Task execution outcomes
      'code_change',        // Development/patching activities
      'analysis_request',   // LLM reasoning requests
      'performance_metric', // System performance data
      'conflict_resolution', // Coordination conflicts
      'learning_update'     // Agent policy adjustments
    ];
    
    // Topics for contextual routing
    this.TOPICS = [
      'economic',           // Financial/trading related
      'technical',          // Code/infrastructure related
      'operational',        // System operations
      'strategic',          // High-level planning
      'tactical',           // Immediate execution
      'monitoring',         // Health/performance watching
      'coordination'        // Inter-agent synchronization
    ];
    
    // Outcome tracking for reinforcement learning
    this.OUTCOMES = {
      SUCCESS: 'success',
      FAILURE: 'failure',
      PARTIAL: 'partial',
      CONFLICT: 'conflict',
      OBSERVATION: 'observation'
    };
    
    // Confidence levels for decision making
    this.CONFIDENCE_LEVELS = {
      LOW: 0.3,
      MEDIUM: 0.6,
      HIGH: 0.8,
      CERTAIN: 0.95
    };
  }
  
  // Generate enriched metadata for learning
  createEnrichedMetadata(baseMetadata, context = {}) {
    return {
      // Core identifiers
      messageId: this.generateMessageId(),
      timestamp: Date.now(),
      sourceAgent: baseMetadata.sourceAgent || 'unknown',
      sourceRole: baseMetadata.sourceRole || 'unknown',
      
      // Message classification
      type: baseMetadata.type || 'unknown',
      topic: baseMetadata.topic || 'general',
      priority: baseMetadata.priority || 'normal',
      
      // Learning context
      confidence: baseMetadata.confidence || this.CONFIDENCE_LEVELS.MEDIUM,
      expectedOutcome: baseMetadata.expectedOutcome || this.OUTCOMES.OBSERVATION,
      actualOutcome: null, // Will be filled after processing
      
      // System state context
      systemMode: context.systemMode || 'unknown',
      stressLevel: context.stressLevel || 0,
      healthScore: context.healthScore || 1.0,
      
      // Performance tracking
      processingTime: null, // ms to process
      conflictDetected: false,
      collaborationScore: 0, // How well agents coordinated
      
      // Reward signals
      profitImpact: 0,      // Financial impact
      stabilityImpact: 0,   // System stability change
      efficiencyGain: 0,    // Resource efficiency improvement
      
      // Learning metadata
      agentResponses: [],   // Which agents responded
      responseQuality: [],  // Quality scores for responses
      learningTags: []      // Tags for ML training
    };
  }
  
  // Generate unique message identifier
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Validate metadata structure
  validateMetadata(metadata) {
    const requiredFields = ['messageId', 'timestamp', 'type', 'topic'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required metadata fields: ${missingFields.join(', ')}`);
    }
    
    if (!this.MESSAGE_TYPES.includes(metadata.type)) {
      console.warn(`Unknown message type: ${metadata.type}`);
    }
    
    if (!this.TOPICS.includes(metadata.topic)) {
      console.warn(`Unknown topic: ${metadata.topic}`);
    }
    
    return true;
  }
  
  // Calculate reward signal from outcome
  calculateReward(metadata) {
    let reward = 0;
    
    // Base rewards/penalties
    switch (metadata.actualOutcome) {
      case this.OUTCOMES.SUCCESS:
        reward += 10;
        break;
      case this.OUTCOMES.FAILURE:
        reward -= 5;
        break;
      case this.OUTCOMES.CONFLICT:
        reward -= 3;
        break;
      case this.OUTCOMES.PARTIAL:
        reward += 2;
        break;
    }
    
    // System impact bonuses
    reward += metadata.profitImpact * 1000;  // Scale profit to meaningful rewards
    reward += metadata.stabilityImpact * 50; // Stability improvements
    reward += metadata.efficiencyGain * 25;  // Efficiency gains
    
    // Penalty for conflicts and poor coordination
    if (metadata.conflictDetected) reward -= 10;
    if (metadata.processingTime > 5000) reward -= 5; // Too slow
    
    return Math.max(-100, Math.min(100, reward)); // Clamp rewards
  }
}

export default MessageMetadataSchema;
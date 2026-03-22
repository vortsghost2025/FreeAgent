// 🤝 Collaborative Swarm Intelligence
// Enables multi-agent cooperation with responsibility signaling

import MessageMetadataSchema from './message-metadata-schema.js';
import AgentInterestProfile from './agent-interest-profile.js';

class CollaborativeSwarm {
  constructor() {
    this.schema = new MessageMetadataSchema();
    this.agentProfiles = new Map();
    this.activeCollaborations = new Map(); // Track ongoing collaborations
    this.responsibilitySignals = new Map(); // Track who's handling what
  }
  
  // Initialize collaborative profiles for existing agents
  initializeCollaborativeProfiles(swarm) {
    console.log('🤝 Initializing collaborative swarm intelligence...');
    
    for (const [agentId, agentInfo] of swarm.activeAgents) {
      const profile = new AgentInterestProfile(agentId, agentInfo.role);
      this.agentProfiles.set(agentId, profile);
      
      // Add collaboration-specific capabilities
      profile.collaborationPreferences = {
        preferredRoles: this.getPreferredCollaborationRoles(agentInfo.role),
        maxConcurrentTasks: this.getMaxConcurrentTasks(agentInfo.role),
        collaborationThreshold: 0.6 // Minimum interest to collaborate
      };
    }
    
    console.log(`✅ Initialized ${this.agentProfiles.size} collaborative agents`);
  }
  
  // Define role-specific collaboration preferences
  getPreferredCollaborationRoles(role) {
    const collaborationMap = {
      'meta_controller': ['risk_assessment', 'threshold_adjustment', 'mode_coordination'],
      'economic_engine': ['opportunity_evaluation', 'profit_calculation', 'risk_analysis'],
      'strategy_worker': ['feasibility_check', 'execution_planning', 'implementation'],
      'health_monitor': ['stability_check', 'performance_monitoring', 'conflict_detection'],
      'vscode_agent': ['code_review', 'bug_fixing', 'optimization'],
      'lmstudio_agent': ['analysis_refinement', 'interpretation', 'recommendation'],
      'cockpit_dashboard': ['visualization', 'user_notification', 'status_reporting']
    };
    
    return collaborationMap[role] || ['observation'];
  }
  
  // Define maximum concurrent tasks by role
  getMaxConcurrentTasks(role) {
    const concurrencyMap = {
      'meta_controller': 3,
      'economic_engine': 5,
      'strategy_worker': 8,
      'health_monitor': 4,
      'vscode_agent': 2,
      'lmstudio_agent': 3,
      'cockpit_dashboard': 6
    };
    
    return concurrencyMap[role] || 2;
  }
  
  // Signal responsibility for a message component
  signalResponsibility(agentId, messageId, component, estimatedTime) {
    const signalKey = `${messageId}:${component}`;
    
    const responsibilitySignal = {
      agentId: agentId,
      component: component,
      timestamp: Date.now(),
      estimatedCompletion: Date.now() + estimatedTime,
      status: 'claimed'
    };
    
    this.responsibilitySignals.set(signalKey, responsibilitySignal);
    
    // Broadcast responsibility claim to swarm
    this.broadcastSignal('responsibility_claimed', {
      agentId: agentId,
      messageId: messageId,
      component: component,
      estimatedTime: estimatedTime
    });
    
    console.log(`[${agentId}] claimed responsibility for ${component} on message ${messageId}`);
    return signalKey;
  }
  
  // Check if component is already claimed
  isComponentClaimed(messageId, component) {
    const signalKey = `${messageId}:${component}`;
    const signal = this.responsibilitySignals.get(signalKey);
    
    if (!signal) return false;
    
    // Check if claim is still valid
    if (signal.status === 'completed' || signal.estimatedCompletion < Date.now()) {
      this.responsibilitySignals.delete(signalKey);
      return false;
    }
    
    return true;
  }
  
  // Coordinate collaborative response to message
  async coordinateCollaborativeResponse(message, context = {}) {
    console.log(`\n🤝 Coordinating collaborative response to: ${message.type}`);
    
    // Create enriched metadata
    const enrichedMetadata = this.schema.createEnrichedMetadata({
      type: message.type,
      topic: message.topic || 'general',
      sourceAgent: message.sender || 'unknown',
      sourceRole: message.source_role || 'unknown',
      confidence: message.confidence || 0.5
    }, context);
    
    // Track this collaboration
    const collaborationId = `collab_${Date.now()}`;
    const collaboration = {
      id: collaborationId,
      messageId: enrichedMetadata.messageId,
      startTime: Date.now(),
      participants: [],
      components: new Set(),
      status: 'active'
    };
    
    this.activeCollaborations.set(collaborationId, collaboration);
    
    // Get agent decisions sorted by interest score
    const agentDecisions = [];
    
    for (const [agentId, profile] of this.agentProfiles) {
      const decision = profile.shouldAct(enrichedMetadata);
      
      if (decision.shouldAct) {
        agentDecisions.push({
          agentId,
          profile,
          decision,
          interestScore: profile.calculateInterest(enrichedMetadata)
        });
      }
    }
    
    // Sort by interest score (highest first)
    agentDecisions.sort((a, b) => b.interestScore - a.interestScore);
    
    console.log(`   Potential collaborators: ${agentDecisions.length}`);
    
    // Coordinate sequential processing
    const processingSequence = [];
    
    for (const { agentId, profile, decision } of agentDecisions) {
      // Get agent's preferred collaboration roles
      const preferredRoles = profile.collaborationPreferences.preferredRoles;
      
      // Find available components that match agent's expertise
      const availableComponents = preferredRoles.filter(component => 
        !this.isComponentClaimed(enrichedMetadata.messageId, component)
      );
      
      if (availableComponents.length > 0) {
        // Claim the highest priority component
        const component = availableComponents[0];
        const estimatedTime = this.estimateProcessingTime(agentId, component);
        
        const signalKey = this.signalResponsibility(agentId, enrichedMetadata.messageId, component, estimatedTime);
        
        processingSequence.push({
          agentId,
          component,
          signalKey,
          estimatedTime,
          startTime: Date.now()
        });
        
        collaboration.participants.push(agentId);
        collaboration.components.add(component);
        
        console.log(`   🤖 ${agentId} will handle ${component} (${(decision.probability * 100).toFixed(1)}% confidence)`);
      }
    }
    
    // Execute collaborative processing
    const results = await this.executeCollaborativeProcessing(processingSequence, enrichedMetadata);
    
    // Complete collaboration
    collaboration.status = 'completed';
    collaboration.endTime = Date.now();
    collaboration.results = results;
    
    console.log(`\n✅ Collaboration ${collaborationId} completed`);
    console.log(`   Participants: ${collaboration.participants.join(', ')}`);
    console.log(`   Components: ${Array.from(collaboration.components).join(', ')}`);
    console.log(`   Duration: ${(collaboration.endTime - collaboration.startTime)}ms`);
    
    return {
      collaborationId,
      results,
      participants: collaboration.participants,
      metrics: this.calculateCollaborationMetrics(collaboration)
    };
  }
  
  // Estimate processing time based on agent and component
  estimateProcessingTime(agentId, component) {
    const baseTimes = {
      'risk_assessment': 300,
      'opportunity_evaluation': 250,
      'feasibility_check': 200,
      'profit_calculation': 150,
      'code_review': 400,
      'analysis_refinement': 350,
      'visualization': 100
    };
    
    const agentMultiplier = agentId === 'sean' ? 0.8 : 1.0; // Meta-controller is faster
    return (baseTimes[component] || 200) * agentMultiplier;
  }
  
  // Execute collaborative processing sequence
  async executeCollaborativeProcessing(sequence, metadata) {
    const results = {};
    
    // Process sequentially (can be made parallel with dependencies)
    for (const step of sequence) {
      try {
        console.log(`   ⚙️ ${step.agentId} processing ${step.component}...`);
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, step.estimatedTime));
        
        // Generate result based on component type
        const result = this.generateComponentResult(step.component, metadata);
        results[step.component] = {
          agentId: step.agentId,
          result: result,
          processingTime: step.estimatedTime,
          timestamp: Date.now()
        };
        
        // Mark component as completed
        const signal = this.responsibilitySignals.get(step.signalKey);
        if (signal) {
          signal.status = 'completed';
          signal.actualCompletion = Date.now();
        }
        
        console.log(`   ✅ ${step.component} completed by ${step.agentId}`);
        
      } catch (error) {
        console.error(`   ❌ ${step.agentId} failed on ${step.component}:`, error.message);
        results[step.component] = {
          agentId: step.agentId,
          error: error.message,
          timestamp: Date.now()
        };
      }
    }
    
    return results;
  }
  
  // Generate component-specific results
  generateComponentResult(component, metadata) {
    switch (component) {
      case 'risk_assessment':
        return {
          riskLevel: Math.random() > 0.7 ? 'high' : 'moderate',
          confidence: 0.85,
          recommendations: ['adjust_thresholds', 'increase_monitoring']
        };
        
      case 'opportunity_evaluation':
        return {
          feasibility: Math.random() > 0.2 ? 'high' : 'low',
          expectedROI: metadata.profitImpact * (0.8 + Math.random() * 0.4),
          confidence: 0.92
        };
        
      case 'feasibility_check':
        return {
          technicalFeasible: true,
          resourceRequirements: { cpu: 'moderate', memory: 'low' },
          timeline: 'immediate'
        };
        
      case 'profit_calculation':
        return {
          netProfit: metadata.profitImpact * 0.95,
          gasCost: metadata.profitImpact * 0.05,
          slippage: 0.001
        };
        
      default:
        return {
          status: 'processed',
          confidence: 0.75,
          notes: `Handled ${component} component`
        };
    }
  }
  
  // Calculate collaboration metrics
  calculateCollaborationMetrics(collaboration) {
    const duration = collaboration.endTime - collaboration.startTime;
    const participantCount = collaboration.participants.length;
    const componentCount = collaboration.components.size;
    
    return {
      efficiency: componentCount / participantCount, // Components per participant
      speed: duration,
      participationBalance: this.calculateParticipationBalance(collaboration.participants),
      successRate: this.calculateSuccessRate(collaboration.results)
    };
  }
  
  // Calculate how balanced the participation was
  calculateParticipationBalance(participants) {
    const roleCounts = {};
    for (const agentId of participants) {
      const profile = this.agentProfiles.get(agentId);
      const role = profile?.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    
    const counts = Object.values(roleCounts);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    return min / Math.max(1, max); // 1 = perfectly balanced, 0 = completely skewed
  }
  
  // Calculate success rate of collaboration
  calculateSuccessRate(results) {
    if (!results) return 0;
    
    const total = Object.keys(results).length;
    const successful = Object.values(results).filter(r => !r.error).length;
    return successful / Math.max(1, total);
  }
  
  // Get collaboration statistics
  getCollaborationStats() {
    const completed = [...this.activeCollaborations.values()].filter(c => c.status === 'completed');
    
    return {
      totalCollaborations: this.activeCollaborations.size,
      completedCollaborations: completed.length,
      averageParticipants: completed.length > 0 ? 
        completed.reduce((sum, c) => sum + c.participants.length, 0) / completed.length : 0,
      averageDuration: completed.length > 0 ?
        completed.reduce((sum, c) => sum + (c.endTime - c.startTime), 0) / completed.length : 0
    };
  }
  
  // Broadcast signals through SwarmBus
  broadcastSignal(type, payload) {
    // This would integrate with your existing SwarmBus
    console.log(`[COLLABORATION] Broadcasting ${type}:`, payload);
  }
}

export default CollaborativeSwarm;
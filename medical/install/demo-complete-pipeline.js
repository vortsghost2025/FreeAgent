// 🔄 Complete Learning Pipeline Demo
// Shows how enriched metadata flows through the entire adaptive system

import SwarmBus from './utils/swarm-bus.js';
import MessageMetadataSchema from './utils/message-metadata-schema.js';
import AgentInterestProfile from './utils/agent-interest-profile.js';
import swarm from './COLLAB_HUB.js';

console.log('🔄 COMPLETE LEARNING PIPELINE DEMO');
console.log('====================================');

async function runCompletePipeline() {
  try {
    // Initialize components
    console.log('\n1️⃣ Initializing pipeline components...');
    
    const schema = new MessageMetadataSchema();
    const bus = new SwarmBus('pipeline_demo', { debug: true });
    
    // Create agent profiles
    const profiles = new Map();
    for (const [agentId, agentInfo] of swarm.activeAgents) {
      profiles.set(agentId, new AgentInterestProfile(agentId, agentInfo.role));
    }
    
    await bus.connect();
    console.log('✅ Pipeline components ready');
    
    // Set up learning handlers
    console.log('\n2️⃣ Setting up learning pipeline...');
    
    bus.onAny(async (rawMessage) => {
      console.log(`\n📥 Received message: ${rawMessage.type}`);
      
      // Parse and enrich metadata
      const enrichedMetadata = schema.createEnrichedMetadata({
        type: rawMessage.type,
        topic: rawMessage.topic || 'general',
        sourceAgent: rawMessage.sender,
        sourceRole: rawMessage.source_role || 'unknown',
        confidence: rawMessage.confidence || 0.5
      }, {
        systemMode: 'aggressive',
        stressLevel: 30,
        healthScore: 0.85
      });
      
      // Add message-specific data
      enrichedMetadata.expectedOutcome = rawMessage.expected_value ? 
        schema.OUTCOMES.SUCCESS : schema.OUTCOMES.OBSERVATION;
      enrichedMetadata.learningTags = rawMessage.tags || [];
      
      console.log(`   📊 Enriched metadata created`);
      console.log(`   Type: ${enrichedMetadata.type}`);
      console.log(`   Topic: ${enrichedMetadata.topic}`);
      console.log(`   Confidence: ${(enrichedMetadata.confidence * 100).toFixed(1)}%`);
      console.log(`   Expected Value: ${rawMessage.expected_value || 0} ETH`);
      
      // Process through agent profiles
      console.log('\n   🤖 Agent decision process:');
      
      let responses = 0;
      let totalReward = 0;
      
      for (const [agentId, profile] of profiles) {
        const startTime = Date.now();
        const decision = profile.shouldAct(enrichedMetadata);
        
        if (decision.shouldAct) {
          responses++;
          
          // Simulate processing time
          const processingTime = 100 + Math.random() * 400;
          enrichedMetadata.processingTime = processingTime;
          
          // Simulate outcome and reward
          const success = Math.random() > 0.3; // 70% success rate
          const outcome = success ? schema.OUTCOMES.SUCCESS : schema.OUTCOMES.FAILURE;
          const baseReward = rawMessage.expected_value ? 
            parseFloat(rawMessage.expected_value) * 1000 : 
            (success ? 5 : -3);
          
          const reward = schema.calculateReward({
            ...enrichedMetadata,
            actualOutcome: outcome,
            profitImpact: rawMessage.expected_value || 0,
            stabilityImpact: success ? 0.1 : -0.05
          });
          
          totalReward += reward;
          
          // Learn from interaction
          profile.learnFromInteraction(enrichedMetadata, outcome, reward);
          
          console.log(`     ${agentId}: ACTED (${decision.confidence}) - `
            + `${outcome} (${reward.toFixed(1)} pts) - `
            + `${processingTime.toFixed(0)}ms`);
        } else {
          console.log(`     ${agentId}: OBSERVED (${decision.confidence})`);
        }
      }
      
      // Log system-level metrics
      console.log(`\n   📈 System Metrics:`);
      console.log(`     Responses: ${responses}/${profiles.size}`);
      console.log(`     Total Reward: ${totalReward.toFixed(1)} points`);
      console.log(`     Average Reward: ${(totalReward / Math.max(1, responses)).toFixed(1)} per responder`);
      
      // Broadcast learning update
      bus.broadcast('learning_update', {
        messageId: enrichedMetadata.messageId,
        responses: responses,
        totalReward: totalReward,
        averageReward: totalReward / Math.max(1, responses),
        participatingAgents: [...profiles.keys()].filter((_, i) => 
          [...profiles.values()][i].shouldAct(enrichedMetadata).shouldAct
        )
      });
    });
    
    console.log('✅ Learning pipeline active');
    
    // Send the example message you provided
    console.log('\n3️⃣ Processing your example message...');
    
    bus.send('all', '', {
      type: 'opportunity',
      topic: 'arbitrage',
      source_role: 'worker',
      confidence: 0.72,
      expected_value: 0.00013,
      tags: ['eth', 'uniswap', 'flash']
    });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show final learning state
    console.log('\n4️⃣ Final Learning State:');
    
    for (const [agentId, profile] of profiles) {
      const report = profile.getSpecializationReport();
      console.log(`\n   🤖 ${agentId} (${report.role}):`);
      console.log(`      Success Rate: ${(report.successRate * 100).toFixed(1)}%`);
      console.log(`      Total Interactions: ${report.totalInteractions}`);
      console.log(`      Top Specializations:`);
      report.specializationAreas.slice(0, 2).forEach(area => {
        console.log(`        • ${area.area.split(':')[0]}: ${(area.interest * 100).toFixed(1)}%`);
      });
    }
    
    // Clean up
    await bus.close();
    console.log('\n🧹 Pipeline demo completed!');
    
  } catch (error) {
    console.error('💥 Pipeline demo failed:', error);
  }
}

// Run the complete pipeline demo
runCompletePipeline();
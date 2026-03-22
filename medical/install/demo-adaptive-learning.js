// 🧪 Adaptive Role Learning Demo
// Demonstrates machine-learned role boundaries in action

import MessageMetadataSchema from './utils/message-metadata-schema.js';
import AgentInterestProfile from './utils/agent-interest-profile.js';
import swarm from './COLLAB_HUB.js';

console.log('🧪 ADAPTIVE ROLE LEARNING DEMO');
console.log('==============================');

async function runLearningDemo() {
  try {
    // Initialize message schema
    const schema = new MessageMetadataSchema();
    
    // Create interest profiles for existing agents
    console.log('\n1️⃣ Creating agent interest profiles...');
    
    const agentProfiles = new Map();
    
    // Get registered agents from swarm
    for (const [agentId, agentInfo] of swarm.activeAgents) {
      const profile = new AgentInterestProfile(agentId, agentInfo.role);
      agentProfiles.set(agentId, profile);
      console.log(`   🤖 Created profile for ${agentId} (${agentInfo.role})`);
    }
    
    console.log(`✅ Created ${agentProfiles.size} agent profiles`);
    
    // Simulate learning scenarios
    console.log('\n2️⃣ Running learning scenarios...');
    
    // Scenario 1: Economic opportunities
    console.log('\n   📊 Scenario 1: Arbitrage Opportunities');
    const oppMetadata = schema.createEnrichedMetadata({
      type: 'arbitrage_opportunity',
      topic: 'economic',
      sourceAgent: 'arb_scanner_1',
      sourceRole: 'economic_engine',
      confidence: schema.CONFIDENCE_LEVELS.HIGH
    }, {
      systemMode: 'aggressive',
      stressLevel: 25,
      healthScore: 0.95
    });
    
    simulateAgentResponses(agentProfiles, oppMetadata, 'SUCCESS', 15);
    
    // Scenario 2: Health alerts during high stress
    console.log('\n   ❤️ Scenario 2: Health Alerts (High Stress)');
    const healthMetadata = schema.createEnrichedMetadata({
      type: 'health_alert',
      topic: 'monitoring',
      sourceAgent: 'health_monitor',
      sourceRole: 'health_monitor',
      confidence: schema.CONFIDENCE_LEVELS.MEDIUM
    }, {
      systemMode: 'economic',
      stressLevel: 85,
      healthScore: 0.4
    });
    
    simulateAgentResponses(agentProfiles, healthMetadata, 'SUCCESS', -5);
    
    // Scenario 3: Code change requests
    console.log('\n   💻 Scenario 3: Code Change Requests');
    const codeMetadata = schema.createEnrichedMetadata({
      type: 'code_change',
      topic: 'technical',
      sourceAgent: 'sean',
      sourceRole: 'meta_controller',
      confidence: schema.CONFIDENCE_LEVELS.CERTAIN
    }, {
      systemMode: 'economic',
      stressLevel: 15,
      healthScore: 0.98
    });
    
    simulateAgentResponses(agentProfiles, codeMetadata, 'PARTIAL', 8);
    
    // Show learning results
    console.log('\n3️⃣ Learning Results After Simulations:');
    
    for (const [agentId, profile] of agentProfiles) {
      const report = profile.getSpecializationReport();
      console.log(`\n   🤖 ${agentId} (${report.role}):`);
      console.log(`      Success Rate: ${(report.successRate * 100).toFixed(1)}%`);
      console.log(`      Interactions: ${report.totalInteractions}`);
      console.log(`      Top Specializations:`);
      report.specializationAreas.slice(0, 3).forEach(area => {
        console.log(`        • ${area.area}: ${(area.interest * 100).toFixed(1)}%`);
      });
    }
    
    // Demonstrate adaptive decision making
    console.log('\n4️⃣ Adaptive Decision Making Test:');
    
    const testMessage = schema.createEnrichedMetadata({
      type: 'arbitrage_opportunity',
      topic: 'economic',
      confidence: schema.CONFIDENCE_LEVELS.HIGH
    });
    
    console.log(`\n   Testing message: ${testMessage.type} in ${testMessage.topic}`);
    
    for (const [agentId, profile] of agentProfiles) {
      const decision = profile.shouldAct(testMessage);
      const actionText = decision.shouldAct ? '✅ WILL ACT' : '❌ WILL OBSERVE';
      console.log(`   ${agentId}: ${actionText} (confidence: ${decision.confidence}, prob: ${(decision.probability * 100).toFixed(1)}%)`);
    }
    
    console.log('\n🎉 ADAPTIVE LEARNING DEMO COMPLETED!');
    console.log('🚀 Agents are now learning their optimal roles dynamically!');
    
  } catch (error) {
    console.error('💥 Learning demo failed:', error);
  }
}

function simulateAgentResponses(profiles, metadata, outcome, baseReward) {
  console.log(`\n   Message: ${metadata.type} (${metadata.topic})`);
  console.log(`   Outcome: ${outcome}, Base Reward: ${baseReward}`);
  
  for (const [agentId, profile] of profiles) {
    const decision = profile.shouldAct(metadata);
    const willAct = decision.shouldAct;
    
    if (willAct) {
      // Simulate some variance in rewards
      const rewardVariance = (Math.random() - 0.5) * 10;
      const actualReward = baseReward + rewardVariance;
      
      profile.learnFromInteraction(metadata, outcome, actualReward);
      
      console.log(`     ${agentId}: ACTED (reward: ${actualReward.toFixed(1)})`);
    } else {
      console.log(`     ${agentId}: OBSERVED`);
    }
  }
}

// Run the learning demo
runLearningDemo();
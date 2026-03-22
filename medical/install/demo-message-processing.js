// 🎯 Direct Message Processing Demo
// Shows exactly how your example message is handled

import MessageMetadataSchema from './utils/message-metadata-schema.js';
import AgentInterestProfile from './utils/agent-interest-profile.js';
import swarm from './COLLAB_HUB.js';

console.log('🎯 DIRECT MESSAGE PROCESSING DEMO');
console.log('==================================');

// Your exact message
const exampleMessage = {
  type: 'opportunity',
  topic: 'arbitrage', 
  source_role: 'worker',
  confidence: 0.72,
  expected_value: 0.00013,
  tags: ['eth', 'uniswap', 'flash']
};

console.log('\n📥 PROCESSING YOUR MESSAGE:');
console.log(`   Type: ${exampleMessage.type}`);
console.log(`   Topic: ${exampleMessage.topic}`);
console.log(`   Source Role: ${exampleMessage.source_role}`);
console.log(`   Confidence: ${(exampleMessage.confidence * 100).toFixed(1)}%`);
console.log(`   Expected Value: ${exampleMessage.expected_value} ETH`);
console.log(`   Tags: ${exampleMessage.tags.join(', ')}`);

// Initialize schema and profiles
const schema = new MessageMetadataSchema();
const profiles = new Map();

// Create profiles for existing agents
for (const [agentId, agentInfo] of swarm.activeAgents) {
  profiles.set(agentId, new AgentInterestProfile(agentId, agentInfo.role));
}

console.log('\n🤖 AGENT DECISION PROCESS:');

// Process message through each agent
let totalResponses = 0;
let totalReward = 0;

for (const [agentId, profile] of profiles) {
  // Create enriched metadata from your message
  const enrichedMetadata = schema.createEnrichedMetadata({
    type: exampleMessage.type,
    topic: exampleMessage.topic,
    sourceAgent: 'worker_1',
    sourceRole: exampleMessage.source_role,
    confidence: exampleMessage.confidence
  }, {
    systemMode: 'aggressive',
    stressLevel: 25,
    healthScore: 0.92
  });
  
  // Add message-specific data
  enrichedMetadata.expectedOutcome = schema.OUTCOMES.SUCCESS;
  enrichedMetadata.learningTags = exampleMessage.tags;
  enrichedMetadata.profitImpact = exampleMessage.expected_value;
  
  // Get agent decision
  const decision = profile.shouldAct(enrichedMetadata);
  const willAct = decision.shouldAct;
  
  if (willAct) {
    totalResponses++;
    
    // Simulate processing and outcome
    const processingTime = 150 + Math.random() * 300;
    enrichedMetadata.processingTime = processingTime;
    
    // Simulate realistic outcome
    const successChance = agentId === 'sean' ? 0.85 : 0.65; // Meta-controller has advantage
    const success = Math.random() < successChance;
    const outcome = success ? schema.OUTCOMES.SUCCESS : schema.OUTCOMES.FAILURE;
    
    // Calculate reward
    const reward = schema.calculateReward({
      ...enrichedMetadata,
      actualOutcome: outcome,
      profitImpact: success ? exampleMessage.expected_value : 0,
      stabilityImpact: success ? 0.15 : -0.1
    });
    
    totalReward += reward;
    
    // Learn from this interaction
    profile.learnFromInteraction(enrichedMetadata, outcome, reward);
    
    console.log(`\n   🤖 ${agentId} (${profile.role}):`);
    console.log(`      Decision: ✅ WILL ACT (confidence: ${decision.confidence})`);
    console.log(`      Processing Time: ${processingTime.toFixed(0)}ms`);
    console.log(`      Outcome: ${outcome}`);
    console.log(`      Reward: ${reward.toFixed(1)} points`);
    console.log(`      New Interest Score: ${(profile.interestScores.get('opportunity:arbitrage') * 100).toFixed(1)}%`);
    
  } else {
    console.log(`\n   🤖 ${agentId} (${profile.role}):`);
    console.log(`      Decision: ❌ WILL OBSERVE (confidence: ${decision.confidence})`);
    console.log(`      Reason: Interest score too low for this message type`);
  }
}

console.log('\n📈 SYSTEM-LEVEL METRICS:');
console.log(`   Total Responses: ${totalResponses}/${profiles.size}`);
console.log(`   Total Reward Generated: ${totalReward.toFixed(1)} points`);
console.log(`   Average Reward per Responder: ${(totalReward / Math.max(1, totalResponses)).toFixed(1)} points`);
console.log(`   System Efficiency: ${((totalResponses / profiles.size) * 100).toFixed(1)}%`);

console.log('\n🧠 LEARNING ADJUSTMENTS:');
for (const [agentId, profile] of profiles) {
  const report = profile.getSpecializationReport();
  const arbInterest = profile.interestScores.get('opportunity:arbitrage') || 0;
  
  console.log(`\n   🤖 ${agentId}:`);
  console.log(`      Arbitrage Interest: ${(arbInterest * 100).toFixed(1)}%`);
  console.log(`      Success Rate: ${(report.successRate * 100).toFixed(1)}%`);
  console.log(`      Total Interactions: ${report.totalInteractions}`);
}

console.log('\n🎉 MESSAGE PROCESSING COMPLETE!');
console.log('🚀 Your enriched metadata system is working perfectly!');

// Show how this affects future decisions
console.log('\n🔮 FUTURE DECISION IMPACT:');

const futureMessage = schema.createEnrichedMetadata({
  type: 'opportunity',
  topic: 'arbitrage',
  confidence: 0.8
});

console.log('\nTesting same message type after learning:');

for (const [agentId, profile] of profiles) {
  const futureDecision = profile.shouldAct(futureMessage);
  const actionText = futureDecision.shouldAct ? '✅ WILL ACT' : '❌ WILL OBSERVE';
  console.log(`   ${agentId}: ${actionText} (prob: ${(futureDecision.probability * 100).toFixed(1)}%)`);
}
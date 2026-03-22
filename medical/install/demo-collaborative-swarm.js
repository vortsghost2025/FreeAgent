// 🤝 Collaborative Swarm Demo
// Shows multi-agent cooperation with responsibility signaling

import CollaborativeSwarm from './utils/collaborative-swarm.js';
import swarm from './COLLAB_HUB.js';

console.log('🤝 COLLABORATIVE SWARM INTELLIGENCE DEMO');
console.log('=========================================');

async function runCollaborativeDemo() {
  try {
    // Initialize collaborative swarm
    console.log('\n1️⃣ Initializing collaborative swarm...');
    
    const collabSwarm = new CollaborativeSwarm();
    collabSwarm.initializeCollaborativeProfiles(swarm);
    
    console.log('✅ Collaborative swarm ready');
    
    // Example 1: Arbitrage opportunity collaboration
    console.log('\n2️⃣ Example 1: Arbitrage Opportunity Processing');
    
    const arbitrageMessage = {
      type: 'opportunity',
      topic: 'arbitrage',
      sender: 'arb_scanner_1',
      source_role: 'economic_engine',
      confidence: 0.85,
      expected_value: 0.00015
    };
    
    const arbitrageContext = {
      systemMode: 'aggressive',
      stressLevel: 20,
      healthScore: 0.95
    };
    
    const arbCollaboration = await collabSwarm.coordinateCollaborativeResponse(
      arbitrageMessage, 
      arbitrageContext
    );
    
    console.log(`\n   📊 Arbitrage Collaboration Results:`);
    console.log(`   Participants: ${arbCollaboration.participants.join(', ')}`);
    console.log(`   Components Processed: ${Object.keys(arbCollaboration.results).join(', ')}`);
    console.log(`   Efficiency Score: ${(arbCollaboration.metrics.efficiency * 100).toFixed(1)}%`);
    console.log(`   Success Rate: ${(arbCollaboration.metrics.successRate * 100).toFixed(1)}%`);
    
    // Show individual contributions
    Object.entries(arbCollaboration.results).forEach(([component, result]) => {
      if (!result.error) {
        console.log(`   • ${component}: Processed by ${result.agentId} in ${result.processingTime}ms`);
      }
    });
    
    // Example 2: Health alert collaboration
    console.log('\n3️⃣ Example 2: Health Alert Response');
    
    const healthMessage = {
      type: 'health_alert',
      topic: 'monitoring',
      sender: 'health_monitor',
      source_role: 'health_monitor',
      confidence: 0.90,
      severity: 'warning'
    };
    
    const healthContext = {
      systemMode: 'economic',
      stressLevel: 75,
      healthScore: 0.45
    };
    
    const healthCollaboration = await collabSwarm.coordinateCollaborativeResponse(
      healthMessage,
      healthContext
    );
    
    console.log(`\n   ❤️ Health Alert Collaboration:`);
    console.log(`   Participants: ${healthCollaboration.participants.join(', ')}`);
    console.log(`   Balance Score: ${(healthCollaboration.metrics.participationBalance * 100).toFixed(1)}%`);
    
    // Example 3: Code change collaboration
    console.log('\n4️⃣ Example 3: Code Change Review');
    
    const codeMessage = {
      type: 'code_change',
      topic: 'technical',
      sender: 'sean',
      source_role: 'meta_controller',
      confidence: 0.95,
      change_description: 'Performance optimization for arbitrage scanner'
    };
    
    const codeContext = {
      systemMode: 'economic',
      stressLevel: 15,
      healthScore: 0.98
    };
    
    const codeCollaboration = await collabSwarm.coordinateCollaborativeResponse(
      codeMessage,
      codeContext
    );
    
    console.log(`\n   💻 Code Review Collaboration:`);
    console.log(`   Participants: ${codeCollaboration.participants.join(', ')}`);
    console.log(`   Components: ${Object.keys(codeCollaboration.results).join(', ')}`);
    
    // Show overall collaboration statistics
    console.log('\n5️⃣ Overall Collaboration Statistics:');
    
    const stats = collabSwarm.getCollaborationStats();
    console.log(`   Total Collaborations: ${stats.totalCollaborations}`);
    console.log(`   Completed: ${stats.completedCollaborations}`);
    console.log(`   Average Participants: ${stats.averageParticipants.toFixed(1)}`);
    console.log(`   Average Duration: ${stats.averageDuration.toFixed(0)}ms`);
    
    // Demonstrate responsibility signaling
    console.log('\n6️⃣ Responsibility Signaling Demo:');
    
    const testMessageId = 'test_msg_123';
    const components = ['risk_assessment', 'feasibility_check', 'profit_calculation'];
    
    console.log('   Claiming responsibilities:');
    
    components.forEach((component, index) => {
      const agentId = ['sean', 'kilo', 'qwen'][index];
      collabSwarm.signalResponsibility(agentId, testMessageId, component, 500);
    });
    
    console.log('\n   Checking claimed responsibilities:');
    components.forEach(component => {
      const isClaimed = collabSwarm.isComponentClaimed(testMessageId, component);
      console.log(`   ${component}: ${isClaimed ? '✅ CLAIMED' : '❌ AVAILABLE'}`);
    });
    
    console.log('\n🎉 COLLABORATIVE SWARM DEMO COMPLETED!');
    console.log('🚀 Your swarm now collaborates intelligently with responsibility signaling!');
    
  } catch (error) {
    console.error('💥 Collaborative demo failed:', error);
  }
}

// Run the collaborative demo
runCollaborativeDemo();
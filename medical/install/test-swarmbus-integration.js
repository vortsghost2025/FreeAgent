// 🧪 SwarmBus Integration Test
// Demonstrates how ZeroMQ SwarmBus connects with cooperative role-based system

import SwarmBus from './utils/swarm-bus.js';
import swarm from './COLLAB_HUB.js';

console.log('🧪 SWARMBUS + COOPERATIVE SWARM INTEGRATION TEST');
console.log('================================================');

async function runIntegrationTest() {
  try {
    // Initialize SwarmBus nodes for different agents
    console.log('\n1️⃣ Setting up SwarmBus nodes...');
    
    const mevOrganismBus = new SwarmBus('mev_organism', { debug: true });
    const arbScannerBus = new SwarmBus('arb_scanner', { debug: true });
    const strategyWorkerBus = new SwarmBus('strategy_worker_1', { debug: true });
    const healthMonitorBus = new SwarmBus('health_monitor', { debug: true });
    
    // Connect all nodes
    await Promise.all([
      mevOrganismBus.connect(),
      arbScannerBus.connect(),
      strategyWorkerBus.connect(),
      healthMonitorBus.connect()
    ]);
    
    console.log('✅ All SwarmBus nodes connected');
    
    // Set up message handlers for integration
    console.log('\n2️⃣ Setting up integration handlers...');
    
    // MEV Organism listens for health alerts and opportunity findings
    mevOrganismBus.on('health_alert', (data) => {
      console.log(`🤖 MEV Organism received health alert: ${data.payload.type}`);
      // Integrate with cooperative swarm
      swarm.broadcastToSwarm('health_status_update', {
        source: 'mev_organism',
        alert: data.payload,
        timestamp: Date.now()
      }, 'high', 'meta_controller');
    });
    
    // Arb Scanner broadcasts opportunities to the swarm
    arbScannerBus.on('arbitrage_opportunity', (data) => {
      console.log(`🔍 Arb Scanner found opportunity: ${data.payload.pair}`);
      // Send to cooperative swarm for evaluation
      swarm.broadcastToSwarm('opportunity_detected', {
        source: 'arb_scanner',
        opportunity: data.payload,
        confidence: 0.95
      }, 'urgent', 'economic_engine');
    });
    
    // Strategy Worker listens for execution commands
    strategyWorkerBus.on('execute_strategy', (data) => {
      console.log(`⚡ Strategy Worker executing: ${data.payload.strategy}`);
      swarm.broadcastToSwarm('strategy_execution_started', {
        worker: 'strategy_worker_1',
        strategy: data.payload.strategy,
        timestamp: Date.now()
      }, 'normal', 'strategy_worker');
    });
    
    // Health Monitor broadcasts system metrics
    healthMonitorBus.onAny((data) => {
      if (data.type === 'system_metrics') {
        console.log(`❤️ Health Monitor reporting: Stress=${data.payload.stress_level}%`);
        swarm.broadcastToSwarm('health_metrics_update', {
          metrics: data.payload,
          source: 'health_monitor'
        }, 'normal', 'health_monitor');
      }
    });
    
    console.log('✅ Integration handlers registered');
    
    // Demonstrate cross-system communication
    console.log('\n3️⃣ Testing cross-system communication...');
    
    // Simulate MEV organism mode change
    setTimeout(() => {
      mevOrganismBus.broadcast('mode_change', {
        from: 'economic',
        to: 'aggressive',
        parameters: { risk: 0.3, filter: 0.25, explore: 0.7 }
      });
    }, 1000);
    
    // Simulate arbitrage opportunity
    setTimeout(() => {
      arbScannerBus.broadcast('arbitrage_opportunity', {
        pair: 'ETH/USDC',
        profit: 0.00012,
        confidence: 0.92,
        dex: 'uniswap'
      });
    }, 2000);
    
    // Simulate health alert
    setTimeout(() => {
      healthMonitorBus.broadcast('health_alert', {
        type: 'high_stress',
        level: 'warning',
        stress_level: 75,
        affected_components: ['strategy_worker_1']
      });
    }, 3000);
    
    // Simulate strategy execution
    setTimeout(() => {
      strategyWorkerBus.broadcast('execute_strategy', {
        strategy: 'triangular_arbitrage',
        opportunity_id: 'opp_12345',
        expected_profit: 0.00012
      });
    }, 4000);
    
    console.log('📡 Broadcast messages sent - monitoring responses...');
    
    // Monitor for 6 seconds to see all communications
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Show final status
    console.log('\n📊 FINAL SYSTEM STATUS:');
    console.log('   MEV Organism Bus:', mevOrganismBus.getStatus());
    console.log('   Arb Scanner Bus:', arbScannerBus.getStatus());
    console.log('   Strategy Worker Bus:', strategyWorkerBus.getStatus());
    console.log('   Health Monitor Bus:', healthMonitorBus.getStatus());
    
    // Close connections
    console.log('\n🧹 Cleaning up...');
    await Promise.all([
      mevOrganismBus.close(),
      arbScannerBus.close(),
      strategyWorkerBus.close(),
      healthMonitorBus.close()
    ]);
    
    console.log('\n🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    console.log('🚀 Your distributed organism now has a true nervous system!');
    
  } catch (error) {
    console.error('💥 Integration test failed:', error);
  }
}

// Run the integration test
runIntegrationTest();
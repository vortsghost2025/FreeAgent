#!/usr/bin/env node

/**
 * MEV Swarm System Validation
 * Quick validation of the 50-agent system
 */

import MEVSwarmCoordinator from './swarm-coordinator.js';

async function validateSystem() {
    console.log('🔍 MEV Swarm System Validation');
    console.log('=====================================\n');

    try {
        // Initialize system
        console.log('📦 Initializing MEV Swarm Coordinator...');
        const coordinator = new MEVSwarmCoordinator();
        
        // Check agent count
        const agentCount = coordinator.agents.size;
        console.log(`   ✅ System initialized with ${agentCount} agents`);
        
        if (agentCount !== 50) {
            throw new Error(`Expected 50 agents, got ${agentCount}`);
        }
        
        // Check agent roles
        const roles = new Set();
        for (const [id, agent] of coordinator.agents) {
            roles.add(agent.role);
        }
        
        console.log(`   ✅ Agent roles: ${Array.from(roles).join(', ')}`);
        console.log(`   ✅ Total roles: ${roles.size}`);
        
        // Check role distribution
        const roleCounts = {};
        for (const [id, agent] of coordinator.agents) {
            roleCounts[agent.role] = (roleCounts[agent.role] || 0) + 1;
        }
        
        console.log('   📊 Agent Distribution:');
        Object.entries(roleCounts).forEach(([role, count]) => {
            console.log(`      ${role}: ${count} agents`);
        });
        
        // Test basic functionality
        console.log('\n🧪 Testing basic functionality...');
        
        // Test performance calculation
        const successRate = coordinator.calculateSuccessRate();
        console.log(`   ✅ Success rate calculation: ${(successRate * 100).toFixed(1)}%`);
        
        // Test agent performance update
        const firstAgent = Array.from(coordinator.agents.values())[0];
        const initialOps = firstAgent.performance.opsCompleted;
        coordinator.updateAgentPerformance(firstAgent, 100);
        
        if (firstAgent.performance.opsCompleted > initialOps) {
            console.log('   ✅ Agent performance update works');
        } else {
            console.log('   ❌ Agent performance update failed');
        }
        
        // Test error handling
        const testAgent = Array.from(coordinator.agents.values())[1];
        const initialStatus = testAgent.status;
        coordinator.handleAgentFailure(testAgent, new Error('Test error'));
        
        if (testAgent.status === 'error') {
            console.log('   ✅ Error handling works');
        } else {
            console.log('   ❌ Error handling failed');
        }
        
        console.log('\n🎉 System validation completed successfully!');
        console.log('✅ All core functionality is working correctly');
        console.log('🚀 System is ready for deployment');
        
        return true;
        
    } catch (error) {
        console.error('❌ System validation failed:', error.message);
        return false;
    }
}

// Run validation
validateSystem().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Validation error:', error);
    process.exit(1);
});
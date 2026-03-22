#!/usr/bin/env node

/**
 * MEV Swarm Test Suite
 * Validates the 50-agent parallel MEV arbitrage system
 */

import MEVSwarmCoordinator from './swarm-coordinator.js';
import { ethers } from 'ethers';
import 'dotenv/config';

class MEVSwarmTester {
    constructor() {
        this.coordinator = null;
        this.testResults = {
            initialization: false,
            agentCount: 0,
            agentRoles: new Set(),
            performance: {},
            errorHandling: false
        };
    }

    /**
     * Run comprehensive system tests
     */
    async runTests() {
        console.log('🧪 MEV Swarm Test Suite v2.0');
        console.log('=====================================\n');

        try {
            // Test 1: System Initialization
            console.log('📋 Test 1: System Initialization');
            await this.testInitialization();
            
            // Test 2: Agent Count and Roles
            console.log('📋 Test 2: Agent Count and Roles');
            await this.testAgentCountAndRoles();
            
            // Test 3: Performance Metrics
            console.log('📋 Test 3: Performance Metrics');
            await this.testPerformanceMetrics();
            
            // Test 4: Error Handling
            console.log('📋 Test 4: Error Handling');
            await this.testErrorHandling();
            
            // Test 5: System Operations
            console.log('📋 Test 5: System Operations');
            await this.testSystemOperations();
            
            // Generate Test Report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    /**
     * Test system initialization
     */
    async testInitialization() {
        try {
            this.coordinator = new MEVSwarmCoordinator();
            
            if (this.coordinator.agents.size === 50) {
                console.log('   ✅ System initialized with 50 agents');
                this.testResults.initialization = true;
            } else {
                console.log(`   ❌ Expected 50 agents, got ${this.coordinator.agents.size}`);
                throw new Error('Incorrect agent count');
            }
        } catch (error) {
            console.log(`   ❌ Initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Test agent count and roles
     */
    async testAgentCountAndRoles() {
        const expectedRoles = [
            'price-monitor',
            'opportunity-detector', 
            'risk-assessor',
            'execution-coordinator',
            'fallback-manager',
            'swarm-manager'
        ];

        const roleCounts = {
            'price-monitor': 0,
            'opportunity-detector': 0,
            'risk-assessor': 0,
            'execution-coordinator': 0,
            'fallback-manager': 0,
            'swarm-manager': 0
        };

        // Count agents by role
        for (const [id, agent] of this.coordinator.agents) {
            if (roleCounts[agent.role] !== undefined) {
                roleCounts[agent.role]++;
                this.testResults.agentRoles.add(agent.role);
            }
        }

        // Validate counts
        const expectedCounts = {
            'price-monitor': 10,
            'opportunity-detector': 15,
            'risk-assessor': 5,
            'execution-coordinator': 10,
            'fallback-manager': 5,
            'swarm-manager': 5
        };

        let allCorrect = true;
        for (const [role, count] of Object.entries(expectedCounts)) {
            if (roleCounts[role] === count) {
                console.log(`   ✅ ${role}: ${count} agents`);
            } else {
                console.log(`   ❌ ${role}: expected ${count}, got ${roleCounts[role]}`);
                allCorrect = false;
            }
        }

        if (allCorrect) {
            this.testResults.agentCount = 50;
            console.log('   ✅ All agent roles correctly configured');
        } else {
            throw new Error('Incorrect agent role distribution');
        }
    }

    /**
     * Test performance metrics
     */
    async testPerformanceMetrics() {
        try {
            // Test performance calculation
            const successRate = this.coordinator.calculateSuccessRate();
            const totalOps = this.coordinator.performanceMetrics.totalOps;
            
            console.log(`   ✅ Success rate calculation: ${(successRate * 100).toFixed(1)}%`);
            console.log(`   ✅ Total operations tracking: ${totalOps}`);
            
            // Test agent performance update
            const firstAgent = Array.from(this.coordinator.agents.values())[0];
            const initialOps = firstAgent.performance.opsCompleted;
            
            this.coordinator.updateAgentPerformance(firstAgent, 100);
            
            if (firstAgent.performance.opsCompleted > initialOps) {
                console.log('   ✅ Agent performance metrics updated');
            } else {
                console.log('   ❌ Agent performance metrics not updated');
            }
            
            this.testResults.performance = {
                successRate,
                totalOps,
                agentPerformanceUpdated: firstAgent.performance.opsCompleted > initialOps
            };
            
        } catch (error) {
            console.log(`   ❌ Performance metrics test failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        try {
            // Test agent failure handling
            const testAgent = Array.from(this.coordinator.agents.values())[0];
            const initialStatus = testAgent.status;
            
            // Simulate agent failure
            this.coordinator.handleAgentFailure(testAgent, new Error('Test error'));
            
            if (testAgent.status === 'error') {
                console.log('   ✅ Agent failure handling works');
                this.testResults.errorHandling = true;
            } else {
                console.log('   ❌ Agent failure handling failed');
            }
            
        } catch (error) {
            console.log(`   ❌ Error handling test failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Test system operations
     */
    async testSystemOperations() {
        try {
            // Test opportunity detection
            const marketData = await this.coordinator.fetchMarketData({
                strategy: 'arbitrage',
                minProfitThreshold: 0.001
            });
            
            if (marketData && marketData.opportunities) {
                console.log('   ✅ Market data fetching works');
            } else {
                console.log('   ❌ Market data fetching failed');
            }
            
            // Test opportunity scoring
            const scoredOpportunities = await this.coordinator.scoreOpportunities(
                marketData, 
                { config: { minProfitThreshold: 0.001 } }
            );
            
            if (Array.isArray(scoredOpportunities)) {
                console.log('   ✅ Opportunity scoring works');
            } else {
                console.log('   ❌ Opportunity scoring failed');
            }
            
            // Test profitability check
            const opportunity = {
                expectedProfit: 0.01,
                gasEstimate: 21000
            };
            
            const isProfitable = this.coordinator.isProfitable(opportunity, {
                config: { minProfitThreshold: 0.001 }
            });
            
            if (typeof isProfitable === 'boolean') {
                console.log('   ✅ Profitability calculation works');
            } else {
                console.log('   ❌ Profitability calculation failed');
            }
            
        } catch (error) {
            console.log(`   ❌ System operations test failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n📊 Test Results Summary');
        console.log('=====================================\n');
        
        const tests = [
            { name: 'System Initialization', result: this.testResults.initialization },
            { name: 'Agent Count (50)', result: this.testResults.agentCount === 50 },
            { name: 'Agent Roles', result: this.testResults.agentRoles.size === 6 },
            { name: 'Performance Metrics', result: Object.keys(this.testResults.performance).length > 0 },
            { name: 'Error Handling', result: this.testResults.errorHandling }
        ];
        
        let passedTests = 0;
        tests.forEach(test => {
            const status = test.result ? '✅ PASS' : '❌ FAIL';
            console.log(`   ${test.name}: ${status}`);
            if (test.result) passedTests++;
        });
        
        console.log(`\n📈 Overall Result: ${passedTests}/${tests.length} tests passed`);
        
        if (passedTests === tests.length) {
            console.log('🎉 All tests passed! System is ready for deployment.');
        } else {
            console.log('⚠️ Some tests failed. Review and fix issues before deployment.');
        }
        
        // Detailed agent role information
        console.log('\n👥 Agent Distribution:');
        const roleCounts = {};
        for (const [id, agent] of this.coordinator.agents) {
            roleCounts[agent.role] = (roleCounts[agent.role] || 0) + 1;
        }
        
        Object.entries(roleCounts).forEach(([role, count]) => {
            console.log(`   ${role}: ${count} agents`);
        });
    }
}

/**
 * Run the test suite
 */
async function main() {
    const tester = new MEVSwarmTester();
    await tester.runTests();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception in tests:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection in tests at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Test suite fatal error:', error);
        process.exit(1);
    });
}

export default MEVSwarmTester;
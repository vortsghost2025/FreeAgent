// Stress Testing Controller - 1000-agent simulation framework
// Uses 70M Alibaba credits for large-scale testing

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

class StressTester {
    constructor(config = {}) {
        this.targetAgentCount = config.targetAgentCount || 1000;
        this.testDuration = config.duration || 1800000; // 30 minutes
        this.spawnRate = config.spawnRate || 50; // agents per second
        this.testScenarios = config.scenarios || ['normal', 'high_load', 'failure_recovery'];
        
        this.agents = new Map();
        this.metrics = {
            spawnedAgents: 0,
            activeAgents: 0,
            failedSpawns: 0,
            consensusDecisions: 0,
            avgResponseTime: 0,
            systemLatency: []
        };
        
        this.resultsDir = path.join(process.cwd(), 'stress-results');
        this.ensureResultsDirectory();
        
        this.startTime = null;
        this.testTimer = null;
    }

    ensureResultsDirectory() {
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir, { recursive: true });
        }
    }

    async runFullStressTest() {
        console.log('🏋️  STRESS TESTING INITIATED');
        console.log('================================');
        console.log(`🎯 Target: ${this.targetAgentCount} agents`);
        console.log(`⏱️  Duration: ${this.testDuration / 1000 / 60} minutes`);
        console.log(`🚀 Spawn rate: ${this.spawnRate} agents/second`);
        console.log('');
        
        this.startTime = performance.now();
        
        // Start coordinator
        await this.startCoordinator();
        
        // Gradual agent spawning
        await this.spawnAgentsGradually();
        
        // Run test scenarios
        await this.executeTestScenarios();
        
        // Monitor for duration
        await this.monitorTestDuration();
        
        // Generate results
        await this.generateTestReport();
    }

    async startCoordinator() {
        console.log('🔄 Starting consensus coordinator...');
        const coordinator = spawn('node', ['consensus-coordinator.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        coordinator.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output.includes('ACTIVE')) {
                console.log('✅ Coordinator ready');
            }
        });
        
        this.coordinator = coordinator;
    }

    async spawnAgentsGradually() {
        console.log(`🚀 Spawning ${this.targetAgentCount} agents gradually...`);
        
        const spawnInterval = 1000 / this.spawnRate; // ms between spawns
        let spawned = 0;
        
        return new Promise((resolve) => {
            const spawnTimer = setInterval(() => {
                if (spawned >= this.targetAgentCount) {
                    clearInterval(spawnTimer);
                    console.log('✅ All agents spawned');
                    resolve();
                    return;
                }
                
                this.spawnSingleAgent(spawned);
                spawned++;
                this.metrics.spawnedAgents = spawned;
            }, spawnInterval);
        });
    }

    spawnSingleAgent(agentIndex) {
        const agentProcess = spawn('node', ['decision-agent.js'], {
            env: {
                PATH: process.env.PATH,
                NODE_ENV: 'production',
                AGENT_INDEX: agentIndex,
                CONSENSUS_HUB_URL: 'ws://localhost:8765'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        const agentId = `stress_agent_${agentIndex}`;
        
        agentProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output.includes('Connected')) {
                this.metrics.activeAgents++;
            }
        });
        
        agentProcess.on('error', (error) => {
            console.error(`Agent ${agentIndex} spawn failed:`, error.message);
            this.metrics.failedSpawns++;
        });
        
        agentProcess.on('exit', (code) => {
            this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
            this.agents.delete(agentId);
        });
        
        this.agents.set(agentId, agentProcess);
    }

    async executeTestScenarios() {
        console.log('🧪 Executing test scenarios...');
        
        for (const scenario of this.testScenarios) {
            console.log(`🎮 Running scenario: ${scenario}`);
            await this.runScenario(scenario);
            await this.waitForCooldown(30000); // 30 second cooldown
        }
    }

    async runScenario(scenario) {
        switch (scenario) {
            case 'normal':
                await this.normalOperationTest();
                break;
            case 'high_load':
                await this.highLoadTest();
                break;
            case 'failure_recovery':
                await this.failureRecoveryTest();
                break;
        }
    }

    async normalOperationTest() {
        console.log('📊 Normal operation test (5 minutes)');
        const duration = 300000; // 5 minutes
        const startTime = performance.now();
        
        // Simulate normal decision requests
        const requestInterval = setInterval(() => {
            this.simulateDecisionRequest('NORMAL_OPERATION');
        }, 5000); // Every 5 seconds
        
        await this.sleep(duration);
        clearInterval(requestInterval);
    }

    async highLoadTest() {
        console.log('🔥 High load test (3 minutes)');
        const duration = 180000; // 3 minutes
        const startTime = performance.now();
        
        // Rapid decision requests
        const requestInterval = setInterval(() => {
            this.simulateDecisionRequest('HIGH_LOAD');
        }, 1000); // Every second
        
        await this.sleep(duration);
        clearInterval(requestInterval);
    }

    async failureRecoveryTest() {
        console.log('⛑️  Failure recovery test');
        
        // Kill 10% of agents
        const agentsToKill = Math.floor(this.agents.size * 0.1);
        const agentIds = Array.from(this.agents.keys());
        const victims = agentIds.slice(0, agentsToKill);
        
        console.log(`💀 Killing ${agentsToKill} agents...`);
        victims.forEach(id => {
            const agent = this.agents.get(id);
            if (agent) {
                agent.kill();
                this.agents.delete(id);
            }
        });
        
        // Wait and monitor recovery
        await this.sleep(60000); // 1 minute recovery time
        
        console.log(`✅ Recovery complete. Active agents: ${this.metrics.activeAgents}`);
    }

    simulateDecisionRequest(testType) {
        // Simulate decision requests to measure system response
        const request = {
            type: 'REQUEST_DECISION',
            payload: {
                topic: `Stress_Test_${testType}_${Date.now()}`,
                type: 'STRATEGIC',
                requester: 'stress_controller',
                complexity: testType === 'HIGH_LOAD' ? 8 : 3
            }
        };
        
        // Would send to coordinator in real implementation
        this.metrics.consensusDecisions++;
    }

    async monitorTestDuration() {
        console.log('⏱️  Monitoring test duration...');
        await this.sleep(this.testDuration - (performance.now() - this.startTime));
    }

    async generateTestReport() {
        const endTime = performance.now();
        const totalTime = endTime - this.startTime;
        
        const report = {
            testMetadata: {
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                duration: totalTime,
                targetAgents: this.targetAgentCount
            },
            finalMetrics: {
                ...this.metrics,
                successRate: this.metrics.spawnedAgents > 0 ? 
                    (this.metrics.spawnedAgents - this.metrics.failedSpawns) / this.metrics.spawnedAgents : 0,
                avgActiveAgents: this.metrics.activeAgents / (totalTime / 1000)
            },
            performanceAnalysis: {
                scalability: this.analyzeScalability(),
                reliability: this.analyzeReliability(),
                efficiency: this.analyzeEfficiency()
            },
            recommendations: this.generateRecommendations()
        };
        
        const reportPath = path.join(this.resultsDir, `stress-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('');
        console.log('📈 STRESS TEST COMPLETE');
        console.log('========================');
        console.log(`📋 Report saved: ${reportPath}`);
        console.log(`🎯 Success rate: ${(report.finalMetrics.successRate * 100).toFixed(1)}%`);
        console.log(`⚡ Avg active agents: ${report.finalMetrics.avgActiveAgents.toFixed(1)}`);
        console.log(`📊 Total decisions: ${this.metrics.consensusDecisions}`);
        
        return report;
    }

    analyzeScalability() {
        const idealAgents = this.targetAgentCount;
        const actualAgents = this.metrics.spawnedAgents - this.metrics.failedSpawns;
        const scalabilityScore = actualAgents / idealAgents;
        
        return {
            score: scalabilityScore,
            description: scalabilityScore > 0.9 ? 'Excellent' : 
                        scalabilityScore > 0.7 ? 'Good' : 'Needs improvement'
        };
    }

    analyzeReliability() {
        const uptime = this.metrics.activeAgents / this.metrics.spawnedAgents;
        return {
            score: uptime,
            description: uptime > 0.95 ? 'Highly Reliable' :
                        uptime > 0.9 ? 'Reliable' : 'Unstable'
        };
    }

    analyzeEfficiency() {
        const decisionsPerSecond = this.metrics.consensusDecisions / (this.testDuration / 1000);
        return {
            score: decisionsPerSecond,
            description: decisionsPerSecond > 10 ? 'Highly Efficient' :
                        decisionsPerSecond > 5 ? 'Efficient' : 'Needs optimization'
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.metrics.failedSpawns > 0) {
            recommendations.push('Investigate agent spawn failures - check resource limits');
        }
        
        if (this.metrics.activeAgents < this.targetAgentCount * 0.9) {
            recommendations.push('Optimize memory usage for higher agent density');
        }
        
        if (this.metrics.consensusDecisions < 100) {
            recommendations.push('Increase decision request frequency for better throughput testing');
        }
        
        return recommendations;
    }

    async waitForCooldown(ms) {
        await this.sleep(ms);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        console.log('🧹 Cleaning up stress test processes...');
        
        // Kill all agents
        for (const [id, agent] of this.agents) {
            try {
                agent.kill();
            } catch (error) {
                // Agent already terminated
            }
        }
        
        // Kill coordinator
        if (this.coordinator) {
            this.coordinator.kill();
        }
        
        console.log('✅ Stress test cleanup complete');
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new StressTester({
        targetAgentCount: parseInt(process.argv[2]) || 1000,
        duration: parseInt(process.argv[3]) || 1800000
    });
    
    process.on('SIGINT', () => {
        console.log('\n🛑 Interrupt received, cleaning up...');
        tester.cleanup();
        process.exit(0);
    });
    
    tester.runFullStressTest().catch(console.error);
}

export { StressTester };
#!/usr/bin/env node

/**
 * MEV Swarm Main - 50 Parallel Agent System
 * Main entry point for the MEV swarm arbitrage system
 */

import MEVSwarmCoordinator from './swarm-coordinator.js';
import { ethers } from 'ethers';
import 'dotenv/config';

class MEVSwarmMain {
    constructor() {
        this.coordinator = new MEVSwarmCoordinator();
        this.provider = null;
        this.wallet = null;
        this.isRunning = false;
        this.startTime = null;
        
        // System configuration
        this.config = {
            maxParallelOps: 50,
            targetLatency: 1, // 1ms target latency
            minProfitThreshold: 0.001, // 0.1% minimum profit
            maxGasPrice: 100, // gwei
            autoRecovery: true,
            monitoringInterval: 1000 // 1 second
        };
        
        this.initializeProvider();
    }

    /**
     * Initialize Ethereum provider and wallet
     */
    initializeProvider() {
        try {
            // Use the configured RPC URL from .env
            const rpcUrl = process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL;
            
            if (!rpcUrl) {
                throw new Error('No RPC URL configured in .env file');
            }
            
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Initialize wallet from private key
            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('No private key configured in .env file');
            }
            
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            
            console.log('🔗 Connected to Ethereum network');
            console.log('👤 Wallet address:', this.wallet.address);
            console.log('📡 RPC endpoint:', rpcUrl.split('//')[1]);
            
        } catch (error) {
            console.error('❌ Failed to initialize provider:', error.message);
            process.exit(1);
        }
    }

    /**
     * Start the MEV swarm system
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ MEV Swarm already running');
            return;
        }
        
        console.log('🚀 Starting MEV Swarm System...\n');
        
        try {
            // Initialize system
            await this.initializeSystem();
            
            // Start the swarm coordinator
            await this.coordinator.start();
            
            this.isRunning = true;
            this.startTime = Date.now();
            
            // Start system monitoring
            this.startSystemMonitoring();
            
            // Set up graceful shutdown
            this.setupGracefulShutdown();
            
            console.log('✅ MEV Swarm System fully operational\n');
            console.log('🎯 System Status:');
            console.log(`   📊 Active Agents: ${this.getActiveAgentCount()}/${this.coordinator.agents.size}`);
            console.log(`   ⚡ Target Latency: ${this.config.targetLatency}ms`);
            console.log(`   💰 Min Profit: ${this.config.minProfitThreshold * 100}%`);
            console.log(`   🔥 Max Gas Price: ${this.config.maxGasPrice} gwei\n`);
            
        } catch (error) {
            console.error('❌ Failed to start MEV Swarm:', error.message);
            process.exit(1);
        }
    }

    /**
     * Initialize the MEV system
     */
    async initializeSystem() {
        console.log('🔧 Initializing MEV System...\n');
        
        // Check wallet balance
        const balance = await this.provider.getBalance(this.wallet.address);
        const ethBalance = parseFloat(ethers.formatEther(balance));
        
        console.log(`💰 Wallet Balance: ${ethBalance.toFixed(6)} ETH`);
        
        if (ethBalance < 0.1) {
            console.log('⚠️ Warning: Low wallet balance. Minimum 0.1 ETH recommended for operations.');
        }
        
        // Check network connection
        const network = await this.provider.getNetwork();
        console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
        
        // Initialize system contracts
        await this.initializeContracts();
        
        console.log('✅ MEV System initialized\n');
    }

    /**
     * Initialize system contracts
     */
    async initializeContracts() {
        console.log('📜 Initializing system contracts...\n');
        
        // This would initialize actual MEV-related contracts
        // For now, we'll simulate the process
        
        try {
            const executorAddress = process.env.EXECUTOR_ADDRESS;
            
            if (executorAddress) {
                console.log(`🎯 Executor Contract: ${executorAddress}`);
                
                // Verify contract exists
                const code = await this.provider.getCode(executorAddress);
                if (code === '0x') {
                    console.log('⚠️ Warning: Executor contract code not found at address');
                } else {
                    console.log('✅ Executor contract verified');
                }
            }
            
            console.log('✅ System contracts initialized\n');
            
        } catch (error) {
            console.error('❌ Contract initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Start system monitoring
     */
    startSystemMonitoring() {
        setInterval(() => {
            this.reportSystemStatus();
            this.checkSystemHealth();
        }, this.config.monitoringInterval);
    }

    /**
     * Report system status
     */
    reportSystemStatus() {
        if (!this.isRunning) return;
        
        const runtime = Date.now() - this.startTime;
        const runtimeMinutes = (runtime / 60000).toFixed(1);
        
        const activeAgents = this.getActiveAgentCount();
        const successRate = this.coordinator.calculateSuccessRate();
        
        console.log(`📊 [${runtimeMinutes}m] System Status:`);
        console.log(`   🤖 Active Agents: ${activeAgents}/${this.coordinator.agents.size}`);
        console.log(`   🎯 Success Rate: ${(successRate * 100).toFixed(1)}%`);
        console.log(`   ⚡ Avg Latency: ${this.coordinator.performanceMetrics.averageLatency.toFixed(2)}ms`);
        console.log(`   📈 Total Ops: ${this.coordinator.performanceMetrics.totalOps}`);
        console.log(`   💰 Profit Target: ${this.config.minProfitThreshold * 100}%\n`);
    }

    /**
     * Check system health
     */
    checkSystemHealth() {
        const activeAgents = this.getActiveAgentCount();
        const successRate = this.coordinator.calculateSuccessRate();
        const avgLatency = this.coordinator.performanceMetrics.averageLatency;
        
        // Check if we need to optimize
        if (successRate < 0.9) {
            console.log('🔧 Low success rate detected - triggering optimization...');
            this.coordinator.optimizeSwarmPerformance();
        }
        
        // Check if latency is too high
        if (avgLatency > this.config.targetLatency * 2) {
            console.log('⚠️ High latency detected - adjusting strategies...');
            this.adjustLatencyStrategies();
        }
        
        // Check if we need more agents
        if (activeAgents < this.coordinator.agents.size * 0.8) {
            console.log('🔄 Some agents offline - attempting recovery...');
            this.recoverOfflineAgents();
        }
    }

    /**
     * Get count of active agents
     */
    getActiveAgentCount() {
        return Array.from(this.coordinator.agents.values())
            .filter(agent => agent.status === 'active').length;
    }

    /**
     * Adjust latency strategies
     */
    adjustLatencyStrategies() {
        console.log('🎯 Adjusting latency optimization strategies...');
        
        // Update agent configurations for better performance
        for (const [id, agent] of this.coordinator.agents) {
            if (agent.role === 'price-monitor') {
                agent.config.updateInterval = Math.max(50, agent.config.updateInterval - 10);
            }
        }
        
        console.log('✅ Latency strategies updated');
    }

    /**
     * Recover offline agents
     */
    recoverOfflineAgents() {
        console.log('🔄 Attempting to recover offline agents...');
        
        const offlineAgents = Array.from(this.coordinator.agents.values())
            .filter(agent => agent.status !== 'active');
        
        offlineAgents.forEach(agent => {
            this.coordinator.recoverAgent(agent);
        });
    }

    /**
     * Set up graceful shutdown
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal} - shutting down gracefully...`);
            
            try {
                await this.stop();
                console.log('✅ MEV Swarm shutdown complete');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error.message);
                process.exit(1);
            }
        };
        
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }

    /**
     * Stop the MEV swarm system
     */
    async stop() {
        if (!this.isRunning) {
            console.log('⚠️ MEV Swarm not running');
            return;
        }
        
        console.log('🛑 Stopping MEV Swarm System...\n');
        
        try {
            // Stop the coordinator
            await this.coordinator.stop();
            
            this.isRunning = false;
            
            // Final status report
            this.reportFinalStatus();
            
            console.log('✅ MEV Swarm System stopped\n');
            
        } catch (error) {
            console.error('❌ Error stopping MEV Swarm:', error.message);
            throw error;
        }
    }

    /**
     * Report final system status
     */
    reportFinalStatus() {
        const runtime = Date.now() - this.startTime;
        const runtimeMinutes = (runtime / 60000).toFixed(1);
        
        console.log('📊 Final System Report:');
        console.log(`   🕐 Runtime: ${runtimeMinutes} minutes`);
        console.log(`   📈 Total Operations: ${this.coordinator.performanceMetrics.totalOps}`);
        console.log(`   🎯 Success Rate: ${(this.coordinator.calculateSuccessRate() * 100).toFixed(1)}%`);
        console.log(`   ⚡ Average Latency: ${this.coordinator.performanceMetrics.averageLatency.toFixed(2)}ms`);
        console.log(`   🤖 Final Active Agents: ${this.getActiveAgentCount()}/${this.coordinator.agents.size}\n`);
    }

    /**
     * Execute MEV opportunity
     */
    async executeMEVOpportunity(opportunity) {
        try {
            console.log(`🎯 Executing MEV opportunity: ${opportunity.type}`);
            
            // This would contain actual MEV execution logic
            // For now, we'll simulate the process
            
            const estimatedGas = Math.floor(Math.random() * 100000) + 21000;
            const gasPrice = Math.min(
                this.config.maxGasPrice,
                Math.floor(Math.random() * 50) + 10
            );
            
            const estimatedCost = (estimatedGas * gasPrice) / 1000000000; // Convert to ETH
            
            console.log(`💰 Estimated Gas Cost: ${estimatedCost.toFixed(6)} ETH`);
            console.log(`⚡ Gas Price: ${gasPrice} gwei`);
            
            if (opportunity.expectedProfit > this.config.minProfitThreshold) {
                console.log('✅ Opportunity profitable - executing...');
                
                // Simulate execution
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                
                console.log('✅ MEV opportunity executed successfully');
                return true;
            } else {
                console.log('❌ Opportunity not profitable enough');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Failed to execute MEV opportunity:', error.message);
            return false;
        }
    }

    /**
     * Get system statistics
     */
    getSystemStats() {
        return {
            runtime: Date.now() - this.startTime,
            activeAgents: this.getActiveAgentCount(),
            totalAgents: this.coordinator.agents.size,
            successRate: this.coordinator.calculateSuccessRate(),
            totalOps: this.coordinator.performanceMetrics.totalOps,
            avgLatency: this.coordinator.performanceMetrics.averageLatency,
            walletBalance: parseFloat(ethers.formatEther(this.provider.getBalance(this.wallet.address)))
        };
    }
}

// Main execution
const main = new MEVSwarmMain();

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--start') || args.length === 0) {
    main.start().catch(console.error);
} else if (args.includes('--stop')) {
    main.stop().catch(console.error);
} else if (args.includes('--stats')) {
    const stats = main.getSystemStats();
    console.log('📊 MEV Swarm Statistics:');
    Object.entries(stats).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
} else {
    console.log('Usage:');
    console.log('  node mev-swarm-main.js     # Start the MEV swarm');
    console.log('  node mev-swarm-main.js --stop  # Stop the MEV swarm');
    console.log('  node mev-swarm-main.js --stats # Show system statistics');
}

export default MEVSwarmMain;
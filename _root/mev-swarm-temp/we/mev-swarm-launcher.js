#!/usr/bin/env node

/**
 * MEV Swarm Launcher
 * Main entry point for the 50-agent parallel MEV arbitrage system
 * Integrates with existing FreeAgent infrastructure
 */

import MEVSwarmCoordinator from './mev-swarm-coordinator.js';
import { ethers } from 'ethers';
import 'dotenv/config';

class MEVSwarmLauncher {
    constructor() {
        this.coordinator = null;
        this.isRunning = false;
        this.config = this.loadConfig();
    }

    /**
     * Load configuration from environment and existing FreeAgent setup
     */
    loadConfig() {
        return {
            // Network configuration
            networks: {
                ethereum: process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
                arbitrum: process.env.ARB_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
                optimism: process.env.OPT_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
                polygon: process.env.POLY_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'
            },
            
            // Wallet configuration
            wallet: {
                privateKey: process.env.PRIVATE_KEY || '',
                address: process.env.WALLET_ADDRESS || ''
            },
            
            // Strategy configuration
            strategies: {
                arbitrage: {
                    enabled: true,
                    minProfit: parseFloat(process.env.MIN_ARBITRAGE_PROFIT || '0.001'),
                    maxGas: parseFloat(process.env.MAX_ARBITRAGE_GAS || '0.0001')
                },
                sandwich: {
                    enabled: true,
                    minProfit: parseFloat(process.env.MIN_SANDWICH_PROFIT || '0.002'),
                    maxGas: parseFloat(process.env.MAX_SANDWICH_GAS || '0.0002')
                },
                liquidation: {
                    enabled: true,
                    minProfit: parseFloat(process.env.MIN_LIQUIDATION_PROFIT || '0.005'),
                    maxGas: parseFloat(process.env.MAX_LIQUIDATION_GAS || '0.001')
                },
                flashloan: {
                    enabled: true,
                    minProfit: parseFloat(process.env.MIN_FLASHLOAN_PROFIT || '0.01'),
                    maxGas: parseFloat(process.env.MAX_FLASHLOAN_GAS || '0.005')
                }
            },
            
            // Performance configuration
            performance: {
                targetLatency: parseInt(process.env.TARGET_LATENCY || '100'),
                maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '50'),
                retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
                timeout: parseInt(process.env.TIMEOUT || '30000')
            },
            
            // Safety configuration
            safety: {
                maxGasPrice: parseInt(process.env.MAX_GAS_PRICE || '100'),
                maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.005'),
                minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.001'),
                riskTolerance: process.env.RISK_TOLERANCE || 'medium'
            },
            
            // Orchestration configuration
            orchestration: {
                masterPort: parseInt(process.env.MASTER_PORT || '5001'),
                coordinationInterval: parseInt(process.env.COORDINATION_INTERVAL || '5000'),
                heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '2000'),
                syncInterval: parseInt(process.env.SYNC_INTERVAL || '10000')
            }
        };
    }

    /**
     * Launch the 50-agent MEV swarm system
     */
    async launch() {
        console.log('🚀 MEV Swarm Launcher v2.0');
        console.log('=====================================');
        console.log('🎯 Launching 50-Agent Parallel MEV System');
        console.log('🔗 Integrating with FreeAgent Infrastructure');
        console.log('=====================================\n');

        try {
            // Validate configuration
            await this.validateConfig();
            
            // Initialize the swarm coordinator
            console.log('📦 Initializing MEV Swarm Coordinator...');
            this.coordinator = new MEVSwarmCoordinator(this.config);
            await this.coordinator.initialize();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start the swarm
            console.log('\n⚡ Starting parallel agent operations...\n');
            await this.coordinator.start();
            
            this.isRunning = true;
            
            // Set up graceful shutdown
            this.setupGracefulShutdown();
            
            // Monitor system status
            this.monitorSystem();
            
        } catch (error) {
            console.error('❌ Launch failed:', error);
            process.exit(1);
        }
    }

    /**
     * Validate configuration
     */
    async validateConfig() {
        console.log('🔍 Validating configuration...');
        
        // Check wallet configuration
        if (!this.config.wallet.privateKey) {
            console.warn('⚠️ Warning: No private key configured. Using read-only mode.');
        }
        
        // Check network connectivity
        for (const [network, url] of Object.entries(this.config.networks)) {
            try {
                const provider = new ethers.JsonRpcProvider(url);
                await provider.getNetwork();
                console.log(`   ✅ ${network} network: Connected`);
            } catch (error) {
                console.warn(`   ⚠️ ${network} network: Connection failed - ${error.message}`);
            }
        }
        
        console.log('✅ Configuration validation complete\n');
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        this.coordinator.on('swarm-started', (data) => {
            console.log(`🎉 Swarm started with ${data.agentCount} agents`);
        });
        
        this.coordinator.on('performance-update', (data) => {
            // Log performance updates
        });
        
        this.coordinator.on('swarm-stopped', () => {
            console.log('🛑 Swarm stopped gracefully');
        });
    }

    /**
     * Set up graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
            
            if (this.coordinator && this.isRunning) {
                await this.coordinator.stop();
            }
            
            console.log('✅ Shutdown complete');
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }

    /**
     * Monitor system performance and status
     */
    monitorSystem() {
        const monitorInterval = setInterval(() => {
            if (!this.isRunning || !this.coordinator) {
                clearInterval(monitorInterval);
                return;
            }

            const status = this.coordinator.getStatus();
            
            console.log(`🔄 System Status: ${status.activeAgents}/${status.agentCount} agents active`);
            console.log(`📊 Success Rate: ${(status.swarmHealth.successRate * 100).toFixed(1)}%`);
            console.log(`⚡ Average Latency: ${status.swarmHealth.averageLatency.toFixed(2)}ms`);
            console.log(`📈 Total Operations: ${status.performanceMetrics.totalOps}`);
            console.log('---');
            
        }, 10000); // Monitor every 10 seconds
    }
}

/**
 * Main execution
 */
async function main() {
    const launcher = new MEVSwarmLauncher();
    
    console.log('🎯 Launching 50-Agent MEV Swarm System');
    console.log('=====================================\n');
    console.log('📋 System Overview:');
    console.log('   • 10 Price Monitoring Agents');
    console.log('   • 15 Opportunity Detection Agents');
    console.log('   • 5 Risk Assessment Agents');
    console.log('   • 10 Execution Coordination Agents');
    console.log('   • 5 Fallback Management Agents');
    console.log('   • 5 Swarm Management Agents');
    console.log('   • Total: 50 Parallel Agents\n');
    
    console.log('⚡ Starting system initialization...\n');
    
    await launcher.launch();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the launcher
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default MEVSwarmLauncher;
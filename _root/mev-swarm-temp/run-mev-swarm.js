#!/usr/bin/env node

/**
 * MEV Swarm Main Execution Script
 * Launches the 50-agent parallel MEV arbitrage system
 */

import MEVSwarmCoordinator from './swarm-coordinator.js';
import { ethers } from 'ethers';
import 'dotenv/config';

class MEVSwarmLauncher {
    constructor() {
        this.coordinator = null;
        this.isRunning = false;
    }

    /**
     * Launch the 50-agent MEV swarm system
     */
    async launch() {
        console.log('🚀 MEV Swarm Launcher v2.0');
        console.log('=====================================\n');
        
        try {
            // Initialize the swarm coordinator
            console.log('📦 Initializing 50-Agent MEV Swarm System...');
            this.coordinator = new MEVSwarmCoordinator();
            
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

            const activeAgents = Array.from(this.coordinator.agents.values())
                .filter(agent => agent.status === 'active').length;
            
            const totalAgents = this.coordinator.agents.size;
            const successRate = this.coordinator.calculateSuccessRate();
            
            console.log(`🔄 System Status: ${activeAgents}/${totalAgents} agents active | Success Rate: ${(successRate * 100).toFixed(1)}%`);
            
        }, 5000); // Monitor every 5 seconds
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
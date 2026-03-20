#!/usr/bin/env node

// 🚨 LIVE TRADING MODE - REAL EXECUTION 🚨
// This script executes actual trades, not simulations

console.log('=====================================');
console.log('🚨 ENTERING LIVE TRADING MODE 🚨');
console.log('=====================================');

// Set environment for live trading
process.env.DRY_RUN = 'false';
console.log('✅ DRY_RUN DISABLED - LIVE TRADING ACTIVE');
console.log('⚠️  WARNING: REAL TRANSACTIONS WILL BE EXECUTED');
console.log('⚠️  WARNING: REAL FUNDS MAY BE AT RISK');
console.log('=====================================');

// Import required modules
import('./COLLAB_HUB.js').then(swarm => {
    import('./utils/swarm-bus.js').then(SwarmBus => {
        import('./utils/collaborative-swarm.js').then(CollaborativeSwarm => {
            
            console.log('\n🚀 INITIALIZING LIVE TRADING INFRASTRUCTURE...');
            
            // Initialize live trading components
            const liveBus = new SwarmBus.default('live_trader', { debug: true });
            const liveCollab = new CollaborativeSwarm.default();
            
            liveBus.connect().then(() => {
                liveCollab.initializeCollaborativeProfiles(swarm.default);
                
                console.log('✅ LIVE TRADING SYSTEM ONLINE');
                console.log('💰 READY TO EXECUTE REAL ARBITRAGE');
                
                // Set aggressive live trading mode
                swarm.default.broadcastToSwarm('mode_change', {
                    from: 'economic',
                    to: 'aggressive',
                    parameters: {
                        risk: 0.3,
                        filter: 0.25,
                        explore: 0.7,
                        minProfitThreshold: 0.0001
                    }
                }, 'high', 'meta_controller');
                
                console.log('📈 AGGRESSIVE TRADING MODE ACTIVATED');
                console.log('🎯 SEARCHING FOR REAL 0.0001+ ETH OPPORTUNITIES');
                
                // Start live monitoring
                setInterval(() => {
                    console.log(`[${new Date().toISOString()}] LIVE TRADING ACTIVE - MONITORING MARKET`);
                }, 30000); // Log every 30 seconds
                
            }).catch(error => {
                console.error('💥 Live bus connection failed:', error);
            });
            
        }).catch(error => {
            console.error('💥 Collaborative swarm failed to load:', error);
        });
        
    }).catch(error => {
        console.error('💥 SwarmBus failed to load:', error);
    });
    
}).catch(error => {
    console.error('💥 Core swarm failed to load:', error);
});

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('\n🛑 RECEIVED SHUTDOWN SIGNAL');
    console.log('💰 EXECUTING GRACEFUL TRADING TERMINATION');
    process.exit(0);
});
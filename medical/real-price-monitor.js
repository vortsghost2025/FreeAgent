// Real DEX Price Monitor
// Replaces simulated prices with live Uniswap V3 data

import { UniswapV3Integration } from './uniswap-v3-integration.js';

class RealPriceMonitor {
    constructor(provider) {
        this.integration = new UniswapV3Integration(provider);
        this.prices = new Map();
        this.lastUpdate = 0;
        this.updateInterval = 5000; // 5 seconds
        this.isRunning = false;
    }

    async start() {
        console.log('📈 Real Price Monitor Starting...');
        
        // Perform initial health check
        const health = await this.integration.healthCheck();
        if (health.responsivePools === 0) {
            throw new Error('No responsive pools available - check RPC connection');
        }
        
        this.isRunning = true;
        await this.updatePrices(); // Initial fetch
        
        // Start periodic updates
        this.updateTimer = setInterval(() => {
            this.updatePrices();
        }, this.updateInterval);
        
        console.log('✅ Real Price Monitor Active - Fetching live Uniswap V3 data');
    }

    async updatePrices() {
        try {
            const poolPrices = await this.integration.getAllPoolPrices();
            
            for (const [pairName, data] of Object.entries(poolPrices)) {
                if (data.error) {
                    console.warn(`⚠️ ${pairName}: ${data.error}`);
                    continue;
                }
                
                if (data.price && data.price.adjusted) {
                    this.prices.set(pairName, {
                        price: data.price.adjusted,
                        sqrtPriceX96: data.sqrtPriceX96,
                        tick: data.tick,
                        timestamp: Date.now(),
                        blockNumber: data.blockNumber
                    });
                    
                    console.log(`🔄 ${pairName}: $${data.price.adjusted.toFixed(6)}`);
                }
            }
            
            this.lastUpdate = Date.now();
            
        } catch (error) {
            console.error('❌ Price update failed:', error.message);
        }
    }

    getPrice(pairName) {
        const priceData = this.prices.get(pairName);
        if (!priceData) return null;
        
        // Check if price is stale (older than 30 seconds)
        if (Date.now() - priceData.timestamp > 30000) {
            console.warn(`⚠️ Stale price data for ${pairName}`);
            return null;
        }
        
        return priceData;
    }

    getAllPrices() {
        const result = {};
        for (const [pairName, priceData] of this.prices) {
            result[pairName] = priceData;
        }
        return result;
    }

    async getDelta(pairA, pairB) {
        const priceA = this.getPrice(pairA);
        const priceB = this.getPrice(pairB);
        
        if (!priceA || !priceB) {
            return { error: 'Price data unavailable' };
        }
        
        const delta = Math.abs((priceA.price - priceB.price) / priceA.price) * 100;
        
        return {
            pairA: { name: pairA, price: priceA.price },
            pairB: { name: pairB, price: priceB.price },
            deltaPercent: delta,
            absoluteDelta: Math.abs(priceA.price - priceB.price),
            timestamp: Math.min(priceA.timestamp, priceB.timestamp)
        };
    }

    stop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        this.isRunning = false;
        console.log('🛑 Real Price Monitor Stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastUpdate: this.lastUpdate,
            trackedPairs: Array.from(this.prices.keys()),
            totalPairs: this.prices.size,
            uptime: this.isRunning ? Date.now() - (Date.now() - this.lastUpdate) : 0
        };
    }
}

// Backward compatibility wrapper
class HybridPriceMonitor extends RealPriceMonitor {
    constructor(provider, useRealPrices = true) {
        super(provider);
        this.useRealPrices = useRealPrices;
        this.simulationMode = !useRealPrices;
    }
    
    // Original simulatePrice method for backward compatibility
    simulatePrice(pairName) {
        if (this.useRealPrices) {
            const realPrice = this.getPrice(pairName);
            if (realPrice) {
                return realPrice.price;
            }
            // Fallback to simulation if real data unavailable
        }
        
        // Original simulation logic
        const basePrices = {
            'USDC/ETH': 2000 + (Math.random() - 0.5) * 100,
            'USDT/ETH': 2000 + (Math.random() - 0.5) * 100,
            'WBTC/ETH': 15 + (Math.random() - 0.5) * 0.5
        };
        
        return basePrices[pairName] || 2000;
    }
}

export { RealPriceMonitor, HybridPriceMonitor };
// Multi-Pool Arbitrage Router
// Detects triangular, cross-DEX, and cross-fee-tier opportunities

import { profitabilityEngine } from './profitability-engine.js';

class MultiPoolRouter {
    constructor() {
        this.pools = new Map(); // poolAddress -> poolInfo
        this.routes = new Map(); // routeKey -> routeInfo
        this.dexes = new Set(); // Supported DEX protocols
    }

    // Register pool information
    registerPool(address, dex, tokens, feeTier, reserves) {
        this.pools.set(address, {
            address,
            dex,
            tokens,
            feeTier,
            reserves,
            lastUpdate: Date.now()
        });
        
        this.dexes.add(dex);
    }

    // Find triangular arbitrage opportunities
    async findTriangularRoutes(tokenA, tokenB, tokenC) {
        const routes = [];
        
        // Find all pools connecting these tokens
        const poolsAB = this.getPoolsForPair(tokenA, tokenB);
        const poolsBC = this.getPoolsForPair(tokenB, tokenC);
        const poolsCA = this.getPoolsForPair(tokenC, tokenA);
        
        // Generate triangular combinations
        for (const poolAB of poolsAB) {
            for (const poolBC of poolsBC) {
                for (const poolCA of poolsCA) {
                    const route = {
                        type: 'triangular',
                        tokens: [tokenA, tokenB, tokenC, tokenA],
                        pools: [poolAB, poolBC, poolCA],
                        inputToken: tokenA,
                        outputToken: tokenA
                    };
                    
                    const profitability = await this.analyzeRouteProfitability(route);
                    if (profitability.netProfit > 0) {
                        routes.push({ route, profitability });
                    }
                }
            }
        }
        
        return routes.sort((a, b) => b.profitability.netProfit - a.profitability.netProfit);
    }

    // Find cross-DEX arbitrage opportunities
    async findCrossDexRoutes(tokenIn, tokenOut) {
        const routes = [];
        const ethPrice = await this.getEthPrice(); // USD
        
        // Group pools by DEX
        const dexPools = new Map();
        for (const [address, pool] of this.pools) {
            if (pool.tokens.includes(tokenIn) && pool.tokens.includes(tokenOut)) {
                if (!dexPools.has(pool.dex)) {
                    dexPools.set(pool.dex, []);
                }
                dexPools.get(pool.dex).push(pool);
            }
        }
        
        // Find price discrepancies between DEXes
        const dexList = Array.from(dexPools.keys());
        for (let i = 0; i < dexList.length; i++) {
            for (let j = i + 1; j < dexList.length; j++) {
                const dex1 = dexList[i];
                const dex2 = dexList[j];
                
                const pools1 = dexPools.get(dex1);
                const pools2 = dexPools.get(dex2);
                
                for (const pool1 of pools1) {
                    for (const pool2 of pools2) {
                        const price1 = this.calculateSpotPrice(pool1, tokenIn, tokenOut);
                        const price2 = this.calculateSpotPrice(pool2, tokenIn, tokenOut);
                        
                        // Check for arbitrage opportunity
                        const priceRatio = Math.max(price1/price2, price2/price1);
                        if (priceRatio > 1.005) { // 0.5% minimum profit threshold
                            const route = {
                                type: 'cross-dex',
                                tokens: [tokenIn, tokenOut],
                                pools: [pool1, pool2],
                                inputToken: tokenIn,
                                outputToken: tokenOut
                            };
                            
                            const profitability = await this.analyzeRouteProfitability(route, ethPrice);
                            if (profitability.netProfit > 1) { // $1 minimum profit
                                routes.push({ route, profitability });
                            }
                        }
                    }
                }
            }
        }
        
        return routes.sort((a, b) => b.profitability.netProfit - a.profitability.netProfit);
    }

    // Find cross-fee-tier arbitrage (Uniswap V3 specific)
    async findFeeTierRoutes(tokenA, tokenB) {
        const routes = [];
        const ethPrice = await this.getEthPrice();
        
        // Get all pools for this token pair
        const pools = this.getPoolsForPair(tokenA, tokenB);
        
        // Group by fee tier
        const feeTiers = new Map();
        for (const pool of pools) {
            if (pool.dex === 'UniswapV3') {
                if (!feeTiers.has(pool.feeTier)) {
                    feeTiers.set(pool.feeTier, []);
                }
                feeTiers.get(pool.feeTier).push(pool);
            }
        }
        
        // Compare fee tiers for arbitrage opportunities
        const tiers = Array.from(feeTiers.keys()).sort();
        for (let i = 0; i < tiers.length - 1; i++) {
            const lowerFee = tiers[i];
            const higherFee = tiers[i + 1];
            
            const lowerFeePools = feeTiers.get(lowerFee);
            const higherFeePools = feeTiers.get(higherFee);
            
            for (const poolLow of lowerFeePools) {
                for (const poolHigh of higherFeePools) {
                    const priceLow = this.calculateSpotPrice(poolLow, tokenA, tokenB);
                    const priceHigh = this.calculateSpotPrice(poolHigh, tokenA, tokenB);
                    
                    // Look for price differences due to fee structure
                    const priceDiff = Math.abs(priceHigh - priceLow) / ((priceHigh + priceLow) / 2);
                    if (priceDiff > 0.001) { // 0.1% threshold
                        const route = {
                            type: 'fee-tier',
                            tokens: [tokenA, tokenB],
                            pools: [poolLow, poolHigh],
                            inputToken: tokenA,
                            outputToken: tokenB
                        };
                        
                        const profitability = await this.analyzeRouteProfitability(route, ethPrice);
                        if (profitability.netProfit > 0.5) {
                            routes.push({ route, profitability });
                        }
                    }
                }
            }
        }
        
        return routes;
    }

    // Core profitability analysis
    async analyzeRouteProfitability(route, ethPriceUSD = 3000) {
        try {
            // Calculate optimal trade size
            const liquidity = this.estimateRouteLiquidity(route);
            const optimalSize = profitabilityEngine.calculateOptimalTradeSize(liquidity);
            
            // Calculate net profitability
            const profitAnalysis = await profitabilityEngine.calculateNetProfit(
                route, 
                optimalSize, 
                ethPriceUSD
            );
            
            return {
                ...profitAnalysis,
                optimalTradeSize: Number(optimalSize),
                liquidityAvailable: liquidity,
                routeEfficiency: this.calculateRouteEfficiency(route)
            };
        } catch (error) {
            console.error('Profitability analysis failed:', error);
            return { netProfit: -Infinity, roi: -100 };
        }
    }

    // Helper methods
    getPoolsForPair(tokenA, tokenB) {
        const result = [];
        for (const [address, pool] of this.pools) {
            if (pool.tokens.includes(tokenA) && pool.tokens.includes(tokenB)) {
                result.push(pool);
            }
        }
        return result;
    }

    calculateSpotPrice(pool, tokenIn, tokenOut) {
        const [reserveIn, reserveOut] = this.getTokenReserves(pool, tokenIn, tokenOut);
        return Number(reserveOut) / Number(reserveIn);
    }

    getTokenReserves(pool, tokenIn, tokenOut) {
        // Return reserves in correct order
        const token0 = pool.tokens[0];
        const [reserve0, reserve1] = pool.reserves;
        return tokenIn === token0 ? [reserve0, reserve1] : [reserve1, reserve0];
    }

    estimateRouteLiquidity(route) {
        // Conservative estimate based on weakest pool
        let minLiquidity = Infinity;
        for (const pool of route.pools) {
            const totalLiquidity = pool.reserves.reduce((sum, r) => sum + Number(r), 0);
            minLiquidity = Math.min(minLiquidity, totalLiquidity);
        }
        return minLiquidity;
    }

    calculateRouteEfficiency(route) {
        // Measure gas efficiency vs profit potential
        return route.pools.length <= 3 ? 'high' : 
               route.pools.length <= 5 ? 'medium' : 'low';
    }

    async getEthPrice() {
        // Would fetch real ETH price from oracle
        return 3000; // Placeholder
    }
}

export const multiPoolRouter = new MultiPoolRouter();
// Real Uniswap V3 Pool Integration
// Fetches live slot0 data and calculates accurate prices

import { ethers } from 'ethers';

// Mainnet Uniswap V3 Pool Addresses
const UNISWAP_V3_POOLS = {
  'USDC/WETH_0.05%': '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', // 0.05% fee tier
  'USDT/WETH_0.05%': '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36', // 0.05% fee tier  
  'WBTC/WETH_0.3%': '0xCBCdF9626bC03E24f779434178A73a0B4bad62eD'   // 0.3% fee tier
};

// Uniswap V3 Pool ABI (slot0 function)
const UNISWAP_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)'
];

class UniswapV3Integration {
    constructor(provider) {
        this.provider = provider;
        this.pools = new Map();
        this.cache = new Map();
        this.initializePools();
    }

    initializePools() {
        console.log('🔄 Initializing Uniswap V3 pools...');
        
        for (const [pairName, poolAddress] of Object.entries(UNISWAP_V3_POOLS)) {
            const contract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
            this.pools.set(pairName, {
                address: poolAddress,
                contract,
                pair: pairName,
                lastUpdate: 0,
                cacheTTL: 30000 // 30 seconds
            });
        }
        
        console.log(`✅ Initialized ${this.pools.size} Uniswap V3 pools`);
    }

    // Fetch real slot0 data from pool
    async getPoolState(pairName) {
        const pool = this.pools.get(pairName);
        if (!pool) {
            throw new Error(`Pool not found: ${pairName}`);
        }

        // Check cache first
        const cached = this.cache.get(pairName);
        if (cached && (Date.now() - cached.timestamp) < pool.cacheTTL) {
            return cached.data;
        }

        try {
            console.log(`📡 Fetching real data for ${pairName}...`);
            
            // Get slot0 data (sqrtPriceX96, tick, etc.)
            const slot0 = await pool.contract.slot0();
            
            // Get token addresses
            const [token0, token1, fee] = await Promise.all([
                pool.contract.token0(),
                pool.contract.token1(), 
                pool.contract.fee()
            ]);

            const poolData = {
                sqrtPriceX96: slot0.sqrtPriceX96.toString(),
                tick: slot0.tick,
                token0,
                token1,
                fee: fee,
                timestamp: Date.now(),
                blockNumber: await this.provider.getBlockNumber()
            };

            // Cache the result
            this.cache.set(pairName, {
                data: poolData,
                timestamp: Date.now()
            });

            console.log(`✅ ${pairName}: sqrtPriceX96=${poolData.sqrtPriceX96}, tick=${poolData.tick}`);
            return poolData;

        } catch (error) {
            console.error(`❌ Failed to fetch ${pairName}:`, error.message);
            throw error;
        }
    }

    // Calculate precise price using BigInt-safe math
    calculatePrice(poolData, tokenIn = 'token0', decimals0 = 6, decimals1 = 18) {
        try {
            const sqrt = BigInt(poolData.sqrtPriceX96);
            const Q96 = 2n ** 96n;
            
            // price = (sqrtPriceX96² / Q96²) * 10^(decimals0 - decimals1)
            const priceRaw = (sqrt * sqrt) / (Q96 * Q96);
            
            // Adjust for token decimals
            const decimalsDiff = tokenIn === 'token0' ? decimals0 - decimals1 : decimals1 - decimals0;
            const adjustment = BigInt(10 ** Math.abs(decimalsDiff));
            
            const price = decimalsDiff >= 0 ? 
                Number(priceRaw) * Math.pow(10, decimalsDiff) :
                Number(priceRaw / adjustment);
            
            return {
                raw: priceRaw,
                adjusted: price,
                sqrtPriceX96: poolData.sqrtPriceX96,
                tick: poolData.tick
            };
        } catch (error) {
            console.error('Price calculation error:', error);
            return null;
        }
    }

    // Get all pool prices in batch
    async getAllPoolPrices() {
        const results = {};
        
        const promises = Array.from(this.pools.keys()).map(async (pairName) => {
            try {
                const poolData = await this.getPoolState(pairName);
                
                // Token decimal mappings (standard values)
                const tokenDecimals = {
                    'USDC': 6,
                    'USDT': 6, 
                    'WETH': 18,
                    'WBTC': 8
                };
                
                // Determine token types from pair name
                const [tokenA, tokenB] = pairName.split('/')[0].split('_')[0].split('/');
                const decimalsA = tokenDecimals[tokenA] || 18;
                const decimalsB = tokenDecimals[tokenB] || 18;
                
                const price = this.calculatePrice(poolData, 'token0', decimalsA, decimalsB);
                results[pairName] = {
                    ...poolData,
                    price,
                    pair: pairName
                };
            } catch (error) {
                console.error(`Failed to get price for ${pairName}:`, error.message);
                results[pairName] = { error: error.message };
            }
        });
        
        await Promise.all(promises);
        return results;
    }

    // Monitor pool for price changes
    async monitorPoolChanges(pairName, onChange) {
        const pool = this.pools.get(pairName);
        if (!pool) return;
        
        let lastTick = null;
        
        const interval = setInterval(async () => {
            try {
                const poolData = await this.getPoolState(pairName);
                if (lastTick !== poolData.tick) {
                    lastTick = poolData.tick;
                    const price = this.calculatePrice(poolData);
                    onChange({
                        pair: pairName,
                        tick: poolData.tick,
                        price,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error(`Monitor error for ${pairName}:`, error.message);
            }
        }, 1000); // Check every second
        
        return () => clearInterval(interval); // Cleanup function
    }

    // Validate pool connectivity and data quality
    async healthCheck() {
        console.log('🏥 Performing Uniswap V3 health check...');
        
        const results = {
            totalPools: this.pools.size,
            responsivePools: 0,
            errors: []
        };
        
        for (const [pairName, pool] of this.pools) {
            try {
                const data = await this.getPoolState(pairName);
                if (data && data.sqrtPriceX96 && data.tick !== undefined) {
                    results.responsivePools++;
                    console.log(`✅ ${pairName}: Healthy`);
                }
            } catch (error) {
                results.errors.push(`${pairName}: ${error.message}`);
                console.error(`❌ ${pairName}: ${error.message}`);
            }
        }
        
        const health = results.responsivePools === results.totalPools ? 'HEALTHY' : 'DEGRADED';
        console.log(`📊 Health Status: ${health} (${results.responsivePools}/${results.totalPools})`);
        
        return results;
    }
}

export { UniswapV3Integration, UNISWAP_V3_POOLS };
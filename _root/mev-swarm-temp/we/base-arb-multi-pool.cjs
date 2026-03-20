// base-arb-multi-pool.cjs
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ALL pools - let the agent observe which combinations work
const POOLS = [
  { 
    name: "UniV3-0.05%", 
    addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", 
    protocol: "uniswap",
    fee: 500 
  },
  { 
    name: "UniV3-0.3%", 
    addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", 
    protocol: "uniswap",
    fee: 3000 
  },
  { 
    name: "Aero-vol", 
    addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", 
    protocol: "aerodrome"
  },
];

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// CONFIG
const TRADE_SIZE_ETH = 0.005;
const AUTO_EXECUTE = false; // Agent can decide when to enable
const MIN_PROFIT_USD = 0.01;
const LOG_FILE = 'arb-data.jsonl';

const fs = require('fs');

// Enhanced logging for agent analysis
function logData(eventType, data) {
  const logEntry = {
    timestamp: Date.now(),
    datetime: new Date().toISOString(),
    type: eventType,
    ...data
  };
  
  fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
  
  // Also log to console for real-time monitoring
  if (eventType === 'opportunity' || eventType === 'execution' || eventType === 'error') {
    console.log(`📝 ${eventType.toUpperCase()}: ${JSON.stringify(data, null, 2)}`);
  }
}

async function getPrice(pool) {
  try {
    if (pool.protocol === "uniswap") {
      const c = new ethers.Contract(pool.addr, [
        "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"
      ], provider);
      const s = await c.slot0();
      const sqrtPriceX96 = s[0];
      const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
      const price = sqrtPrice * sqrtPrice;
      return price * (10 ** 12);
    } else {
      const c = new ethers.Contract(pool.addr, [
        "function getReserves() view returns (uint256,uint256,uint256)"
      ], provider);
      const r = await c.getReserves();
      return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
    }
  } catch (error) {
    logData('price_error', {
      pool: pool.name,
      error: error.message
    });
    return 0;
  }
}

async function main() {
  console.log("🤖 Multi-Pool Arb Monitor - Agent Learning Mode\n");
  console.log(`Monitoring ${POOLS.length} pools`);
  console.log(`Data logging to: ${LOG_FILE}`);
  console.log(`Auto-execute: ${AUTO_EXECUTE ? '⚡ YES' : '👀 OBSERVE'}\n`);
  
  // System startup log
  logData('startup', {
    pools: POOLS.map(p => p.name),
    config: {
      tradeSize: TRADE_SIZE_ETH,
      minProfit: MIN_PROFIT_USD,
      autoExecute: AUTO_EXECUTE
    }
  });
  
  let iteration = 0;
  let lastSuccessfulRead = Date.now();
  
  for (let i = 1; ; i++) {
    iteration++;
    
    try {
      // Fetch all pool prices
      const pricePromises = POOLS.map(async p => {
        const price = await getPrice(p);
        return { ...p, price, success: price > 0 };
      });
      
      const results = await Promise.all(pricePromises);
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length >= 2) {
        lastSuccessfulRead = Date.now();
        
        // Log all pool prices every 10 iterations for pattern analysis
        if (i % 10 === 0) {
          logData('price_snapshot', {
            iteration: i,
            pools: valid.map(p => ({
              name: p.name,
              protocol: p.protocol,
              price: p.price
            }))
          });
        }
        
        // Find best spread across ALL pool combinations
        let bestSpread = 0;
        let bestBuyPool = null;
        let bestSellPool = null;
        
        for (let buyIdx = 0; buyIdx < valid.length; buyIdx++) {
          for (let sellIdx = 0; sellIdx < valid.length; sellIdx++) {
            if (buyIdx === sellIdx) continue;
            
            const buyPool = valid[buyIdx];
            const sellPool = valid[sellIdx];
            const spread = (sellPool.price - buyPool.price) / buyPool.price;
            
            if (spread > bestSpread) {
              bestSpread = spread;
              bestBuyPool = buyPool;
              bestSellPool = sellPool;
            }
          }
        }
        
        // Calculate profitability
        const COST = 0.002; // Base cost estimate
        const net = bestSpread - COST;
        const profit = (TRADE_SIZE_ETH * bestBuyPool.price * net);
        
        const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
        console.log(`#${i} | ${str} | Best: ${(bestSpread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
        
        // Log opportunity
        if (profit >= MIN_PROFIT_USD) {
          logData('opportunity', {
            iteration: i,
            buyPool: { name: bestBuyPool.name, price: bestBuyPool.price, protocol: bestBuyPool.protocol },
            sellPool: { name: bestSellPool.name, price: bestSellPool.price, protocol: bestSellPool.protocol },
            spread: bestSpread,
            estimatedProfit: profit,
            allPrices: valid.map(p => ({ name: p.name, price: p.price }))
          });
          
          console.log(`\n🎯 OPPORTUNITY #${i}`);
          console.log(`Route: ${bestBuyPool.name} → ${bestSellPool.name}`);
          console.log(`Spread: ${(bestSpread*100).toFixed(3)}% | Profit: $${profit.toFixed(4)}\n`);
          
          if (AUTO_EXECUTE) {
            // Execution would go here
            console.log(`⚠️  Execution disabled for learning phase\n`);
          }
        }
        
      } else {
        console.log(`#${i} Insufficient valid prices (${valid.length}/${POOLS.length})`);
        
        // Log health issues
        if (valid.length === 0) {
          logData('health_warning', {
            iteration: i,
            validPools: valid.length,
            totalPools: POOLS.length,
            timeSinceSuccess: Date.now() - lastSuccessfulRead
          });
        }
      }
      
      // Health check - detect if stuck
      if (Date.now() - lastSuccessfulRead > 60000) { // 1 min
        logData('health_critical', {
          message: 'No successful reads for 60 seconds',
          iteration: i
        });
      }
      
    } catch (error) {
      console.log(`#${i} ERR: ${error.message.slice(0, 80)}`);
      logData('error', {
        iteration: i,
        error: error.message,
        stack: error.stack
      });
    }
    
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Graceful shutdown
process.on('SIGINT', () => {
  logData('shutdown', {
    reason: 'SIGINT',
    totalIterations: iteration
  });
  console.log('\n\n📊 Session ended. Data saved to', LOG_FILE);
  process.exit(0);
});

main();
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ALL pools - let the agent observe which combinations work
const POOLS = [
  { 
    name: "UniV3-0.05%", 
    addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", 
    protocol: "uniswap",
    fee: 500 
  },
  { 
    name: "UniV3-0.3%", 
    addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", 
    protocol: "uniswap",
    fee: 3000 
  },
  { 
    name: "Aero-vol", 
    addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", 
    protocol: "aerodrome"
  },
];

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// CONFIG
const TRADE_SIZE_ETH = 0.005;
const AUTO_EXECUTE = false; // Agent can decide when to enable
const MIN_PROFIT_USD = 0.01;
const LOG_FILE = 'arb-data.jsonl';

const fs = require('fs');

// Enhanced logging for agent analysis
function logData(eventType, data) {
  const logEntry = {
    timestamp: Date.now(),
    datetime: new Date().toISOString(),
    type: eventType,
    ...data
  };
  
  fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
  
  // Also log to console for real-time monitoring
  if (eventType === 'opportunity' || eventType === 'execution' || eventType === 'error') {
    console.log(`📝 ${eventType.toUpperCase()}: ${JSON.stringify(data, null, 2)}`);
  }
}

async function getPrice(pool) {
  try {
    if (pool.protocol === "uniswap") {
      const c = new ethers.Contract(pool.addr, [
        "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"
      ], provider);
      const s = await c.slot0();
      const sqrtPriceX96 = s[0];
      const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
      const price = sqrtPrice * sqrtPrice;
      return price * (10 ** 12);
    } else {
      const c = new ethers.Contract(pool.addr, [
        "function getReserves() view returns (uint256,uint256,uint256)"
      ], provider);
      const r = await c.getReserves();
      return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
    }
  } catch (error) {
    logData('price_error', {
      pool: pool.name,
      error: error.message
    });
    return 0;
  }
}

async function main() {
  console.log("🤖 Multi-Pool Arb Monitor - Agent Learning Mode\n");
  console.log(`Monitoring ${POOLS.length} pools`);
  console.log(`Data logging to: ${LOG_FILE}`);
  console.log(`Auto-execute: ${AUTO_EXECUTE ? '⚡ YES' : '👀 OBSERVE'}\n`);
  
  // System startup log
  logData('startup', {
    pools: POOLS.map(p => p.name),
    config: {
      tradeSize: TRADE_SIZE_ETH,
      minProfit: MIN_PROFIT_USD,
      autoExecute: AUTO_EXECUTE
    }
  });
  
  let iteration = 0;
  let lastSuccessfulRead = Date.now();
  
  for (let i = 1; ; i++) {
    iteration++;
    
    try {
      // Fetch all pool prices
      const pricePromises = POOLS.map(async p => {
        const price = await getPrice(p);
        return { ...p, price, success: price > 0 };
      });
      
      const results = await Promise.all(pricePromises);
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length >= 2) {
        lastSuccessfulRead = Date.now();
        
        // Log all pool prices every 10 iterations for pattern analysis
        if (i % 10 === 0) {
          logData('price_snapshot', {
            iteration: i,
            pools: valid.map(p => ({
              name: p.name,
              protocol: p.protocol,
              price: p.price
            }))
          });
        }
        
        // Find best spread across ALL pool combinations
        let bestSpread = 0;
        let bestBuyPool = null;
        let bestSellPool = null;
        
        for (let buyIdx = 0; buyIdx < valid.length; buyIdx++) {
          for (let sellIdx = 0; sellIdx < valid.length; sellIdx++) {
            if (buyIdx === sellIdx) continue;
            
            const buyPool = valid[buyIdx];
            const sellPool = valid[sellIdx];
            const spread = (sellPool.price - buyPool.price) / buyPool.price;
            
            if (spread > bestSpread) {
              bestSpread = spread;
              bestBuyPool = buyPool;
              bestSellPool = sellPool;
            }
          }
        }
        
        // Calculate profitability
        const COST = 0.002; // Base cost estimate
        const net = bestSpread - COST;
        const profit = (TRADE_SIZE_ETH * bestBuyPool.price * net);
        
        const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
        console.log(`#${i} | ${str} | Best: ${(bestSpread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
        
        // Log opportunity
        if (profit >= MIN_PROFIT_USD) {
          logData('opportunity', {
            iteration: i,
            buyPool: { name: bestBuyPool.name, price: bestBuyPool.price, protocol: bestBuyPool.protocol },
            sellPool: { name: bestSellPool.name, price: bestSellPool.price, protocol: bestSellPool.protocol },
            spread: bestSpread,
            estimatedProfit: profit,
            allPrices: valid.map(p => ({ name: p.name, price: p.price }))
          });
          
          console.log(`\n🎯 OPPORTUNITY #${i}`);
          console.log(`Route: ${bestBuyPool.name} → ${bestSellPool.name}`);
          console.log(`Spread: ${(bestSpread*100).toFixed(3)}% | Profit: $${profit.toFixed(4)}\n`);
          
          if (AUTO_EXECUTE) {
            // Execution would go here
            console.log(`⚠️  Execution disabled for learning phase\n`);
          }
        }
        
      } else {
        console.log(`#${i} Insufficient valid prices (${valid.length}/${POOLS.length})`);
        
        // Log health issues
        if (valid.length === 0) {
          logData('health_warning', {
            iteration: i,
            validPools: valid.length,
            totalPools: POOLS.length,
            timeSinceSuccess: Date.now() - lastSuccessfulRead
          });
        }
      }
      
      // Health check - detect if stuck
      if (Date.now() - lastSuccessfulRead > 60000) { // 1 min
        logData('health_critical', {
          message: 'No successful reads for 60 seconds',
          iteration: i
        });
      }
      
    } catch (error) {
      console.log(`#${i} ERR: ${error.message.slice(0, 80)}`);
      logData('error', {
        iteration: i,
        error: error.message,
        stack: error.stack
      });
    }
    
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Graceful shutdown
process.on('SIGINT', () => {
  logData('shutdown', {
    reason: 'SIGINT',
    totalIterations: iteration
  });
  console.log('\n\n📊 Session ended. Data saved to', LOG_FILE);
  process.exit(0);
});

main();


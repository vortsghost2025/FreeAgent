# REMOVED: sensitive data redacted by automated security cleanup
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

console.log('ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL);

const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL, { chainId: 1, name: "mainnet" });

async function testConnection() {
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log('Connected to block:', blockNumber);
    
    // Test USDT/ETH pool
    const usdtEthAddress = 'REDACTED_ADDRESS';
    const pool = new ethers.Contract(usdtEthAddress, [
      'function token0() view returns (address)',
      'function token1() view returns (address)',
      'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
    ], provider);
    
    const [token0, token1, slot0] = await Promise.all([
      pool.token0(),
      pool.token1(),
      pool.slot0()
    ]);
    
    console.log('USDT/ETH Pool:');
    console.log('  token0:', token0);
    console.log('  token1:', token1);
    console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
    console.log('  tick:', slot0.tick);
    
    // Test WBTC/ETH pool
    const wbtcEthAddress = 'REDACTED_ADDRESS';
    const pool2 = new ethers.Contract(wbtcEthAddress, [
      'function token0() view returns (address)',
      'function token1() view returns (address)',
      'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
    ], provider);
    
    const [token0_2, token1_2, slot0_2] = await Promise.all([
      pool2.token0(),
      pool2.token1(),
      pool2.slot0()
    ]);
    
    console.log('WBTC/ETH Pool:');
    console.log('  token0:', token0_2);
    console.log('  token1:', token1_2);
    console.log('  sqrtPriceX96:', slot0_2.sqrtPriceX96.toString());
    console.log('  tick:', slot0_2.tick);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnection();
import { simulateTriangularArb } from '../bundle-simulator.js';

// Mock poolData: minimal fields required by simulateRouteExactIn
const mockPool = {
  sqrtPriceX96: 79228162514264337593543950336n, // Q96
  liquidity: 1000000000000n,
  tick: 0,
  fee: 3000,
  decimalsIn: 18,
  decimalsOut: 18
};

const pools = {};

// Create three hop pools mapping
pools['A/B'] = mockPool;
pools['B/C'] = mockPool;
pools['C/D'] = mockPool;

const route = ['A', 'B', 'C', 'D'];
const amountIn = 1.0; // 1 ETH

(async () => {
  const res = simulateTriangularArb(route, pools, amountIn, 20n);
  console.log('Triangular sim result:', res);
})();

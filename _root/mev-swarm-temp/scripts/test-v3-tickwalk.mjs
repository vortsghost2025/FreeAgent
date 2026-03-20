import { simulateV3SwapExactIn } from '../bundle-simulator.js';

(async () => {
  const pool = {
    sqrtPriceX96: 79228162514264337593543950336n,
    liquidity: 1000000000000n,
    tick: 0,
    fee: 3000,
    decimalsIn: 18,
    decimalsOut: 18
  };

  const amountIn = 100; // 100 ETH

  const res = simulateV3SwapExactIn({
    amountIn,
    sqrtPriceX96: pool.sqrtPriceX96,
    liquidity: pool.liquidity,
    tick: pool.tick,
    fee: pool.fee,
    decimalsIn: pool.decimalsIn,
    decimalsOut: pool.decimalsOut
  });

  console.log('V3 tick-walk sim result:', res);
})();

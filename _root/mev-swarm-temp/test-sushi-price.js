import('ethers').then(async ({ ethers }) => {
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');

  const SUSHI_PAIR = '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0';
  const PAIR_ABI = [
    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() view returns (address)',
    'function token1() view returns (address)'
  ];

  const pair = new ethers.Contract(SUSHI_PAIR, PAIR_ABI, provider);
  const [reserves, token0, token1] = await Promise.all([
    pair.getReserves(),
    pair.token0(),
    pair.token1()
  ]);

  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

  const isUSDC0 = token0.toLowerCase() === USDC.toLowerCase();
  const isWETH0 = token0.toLowerCase() === WETH.toLowerCase();

  console.log('SushiSwap USDC/ETH Pair:');
  console.log('Token0:', token0);
  console.log('Token1:', token1);
  console.log('Reserve0:', reserves[0].toString());
  console.log('Reserve1:', reserves[1].toString());

  const decimals0 = isUSDC0 ? 6 : 18;
  const decimals1 = isUSDC0 ? 18 : 6;

  const r0 = Number(reserves[0]) / (10 ** decimals0);
  const r1 = Number(reserves[1]) / (10 ** decimals1);

  console.log('Normalized Reserve0:', r0);
  console.log('Normalized Reserve1:', r1);

  const price1Per0 = r1 / r0;
  const price0Per1 = 1 / price1Per0;

  console.log('Price (token1/token0):', price1Per0.toFixed(8));
  console.log('Price (token0/token1):', price0Per1.toFixed(8));

  if (isUSDC0) {
    console.log('USDC per ETH:', price0Per1.toFixed(8));
    console.log('ETH per USDC:', price1Per0.toFixed(8));
  } else {
    console.log('ETH per USDC:', price0Per1.toFixed(8));
    console.log('USDC per ETH:', price1Per0.toFixed(8));
  }
});

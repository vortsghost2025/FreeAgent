import('ethers').then(async ({ ethers }) => {
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');

  // Known USDC/ETH Curve pools
  const CURVE_POOLS = [
    {
      name: 'USDC/WETH (main)',
      address: '0x4DEcE878Ce96F3491ccAD3a663DcDa694D41e829',
    }
  ];

  console.log('Checking Curve pools for USDC/ETH...');

  const POOL_ABI = [
    'function get_balances() view returns (uint256[8])',
    'function coins(uint256) view returns (address)'
  ];

  for (const pool of CURVE_POOLS) {
    console.log(`\n${pool.name} (${pool.address}):`);
    try {
      const contract = new ethers.Contract(pool.address, POOL_ABI, provider);
      const balances = await contract.get_balances();
      const coin0 = await contract.coins(0);
      const coin1 = await contract.coins(1);

      console.log('  Coin0:', coin0);
      console.log('  Coin1:', coin1);

      const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

      const isUSDC = coin0.toLowerCase() === USDC.toLowerCase() || coin1.toLowerCase() === USDC.toLowerCase();
      const isWETH = coin0.toLowerCase() === WETH.toLowerCase() || coin1.toLowerCase() === WETH.toLowerCase();

      if (isUSDC && isWETH) {
        console.log('  ✅ This is a USDC/ETH pool!');
        console.log('  Balance0:', balances[0].toString());
        console.log('  Balance1:', balances[1].toString());

        if (Number(balances[0]) > 0 && Number(balances[1]) > 0) {
          const balance0 = Number(balances[0]);
          const balance1 = Number(balances[1]);
          const price = balance1 / balance0;
          console.log('  Approx price (token1/token0):', price.toFixed(8));
        }
      }
    } catch (e) {
      console.log('  ERROR:', e.message);
    }
  }
});

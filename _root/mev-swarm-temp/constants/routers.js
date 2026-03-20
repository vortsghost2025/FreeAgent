/**
 * Router ABIs for core DEXes (Uniswap V2, V3, Sushiswap)
 * Clean, minimal ABIs focused on decoding and pricing
 */

// Uniswap V2
export const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
export const UNISWAP_V2_FACTORY = '0x5C69bee701ef814a2b6fd3d28fde2642f7b15f';

export const UNISWAP_V2_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external pure returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)",
  "function swapTokensForExactETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)"
];

// Uniswap V3
export const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157c05861564';
export const UNISWAP_V3_FACTORY = '0x1F9840a85d5aFb401dE7048D3c15BCa';

export const UNISWAP_V3_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMin, uint160 sqrtPriceLimitX96, bytes calldata data)) payable returns (uint256 amountOut)",
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut, uint160 sqrtPriceX96, uint32 initializedTicksCrossed)"
];

// Sushiswap (same ABI as V2)
export const SUSHISWAP_ROUTER = '0xd9e1CE17f2641f24aE83637Ab66a2cCa9C378b9F';
export const SUSHISWAP_FACTORY = '0xc0aEe778fd80EaDdd86Ff1eAcbebe8ae';

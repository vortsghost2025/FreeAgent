/**
 * Swap Decoder - Normalizes DEX swap transactions
 * Takes raw transaction data + router info → structured swap object
 */

import { ethers } from 'ethers';

// Known router ABIs and configurations
const ROUTER_CONFIG = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': {
    name: 'Uniswap V2',
    abi: [
      "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
      "function swapTokensForExactETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
      "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)"
    ],
    encoder: 'v2'
  },
  '0xe592427a0aece92de3edee1f18e0157c05861564': {
    name: 'Uniswap V3',
    abi: [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMin, uint160 sqrtPriceLimitX96, bytes calldata data)",
      "function exactInput(bytes path, address recipient, uint256 amountIn, uint256 amountOutMin)"
    ],
    encoder: 'v3'
  },
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': {
    name: 'Sushiswap',
    abi: [
      "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
      "function swapTokensForExactETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
      "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)"
    ],
    encoder: 'v2'
  },
  '0x1111111254eeb25477b68fb85ed929f73a960582': {
    name: '1inch',
    abi: [
      "function swap(address fromToken, address toToken, uint256 amount, uint256 minReturnAmount, uint256 priceImpactX96)",
      "function unoswapTo(address srcToken, address dstToken, uint256 amount, uint256 minReturnAmount, uint256 priceImpactX96)"
    ],
    encoder: '1inch'
  }
};

// Common token addresses for symbol lookup
const TOKENS = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
  '0x6b175474e89094c44da98b954edeac495271d0f': { symbol: 'DAI', decimals: 18 },
};

/**
 * Decode a swap transaction
 * @param {string} txData - Transaction calldata
 * @param {string} routerAddress - Router contract address
 * @param {string} routerName - Name of the DEX
 * @returns {object|null} Normalized swap object or null
 */
export function decodeSwap(txData, routerAddress, routerName) {
  if (!txData || txData === '0x' || !routerAddress) {
    return null;
  }

  const config = ROUTER_CONFIG[routerAddress.toLowerCase()];
  if (!config) {
    return {
      router: 'UNKNOWN',
      routerName,
      routerAddress,
      error: 'Unknown router',
      decoded: false
    };
  }

  try {
    // Create interface for this router
    const iface = new ethers.Interface(config.abi);

    // Parse the transaction
    const parsed = iface.parseTransaction({ data: txData });

    if (!parsed || !parsed.name) {
      return {
        router: config.name,
        routerName,
        routerAddress,
        error: 'Could not decode function',
        decoded: false
      };
    }

    // Extract swap details based on function type
    let swap = null;

    if (parsed.name === 'swapExactETHForTokens') {
      // ETH → Tokens
      const path = parsed.args.path;
      const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
      const tokenOut = path[path.length - 1]; // Last token
      swap = {
        method: 'swapExactETHForTokens',
        direction: 'eth_to_tokens',
        tokenIn,
        tokenOut,
        amountIn: parsed.args.amountIn,
        amountOutMin: parsed.args.amountOutMin,
        path,
        recipient: parsed.args.to,
        deadline: parsed.args.deadline,
        slippageTolerance: parsed.args.slippage
      };
    } else if (parsed.name === 'swapTokensForExactETH') {
      // Tokens → ETH
      const path = parsed.args.path;
      const tokenIn = path[0]; // First token
      const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
      swap = {
        method: 'swapTokensForExactETH',
        direction: 'tokens_to_eth',
        tokenIn,
        tokenOut,
        amountIn: parsed.args.amountIn,
        amountOutMin: parsed.args.amountOutMin,
        path,
        recipient: parsed.args.to,
        deadline: parsed.args.deadline,
        slippageTolerance: parsed.args.slippage
      };
    } else if (parsed.name === 'swapExactTokensForTokens') {
      // Tokens → Tokens
      const path = parsed.args.path;
      const tokenIn = path[0];
      const tokenOut = path[path.length - 1];
      swap = {
        method: 'swapExactTokensForTokens',
        direction: 'token_to_token',
        tokenIn,
        tokenOut,
        amountIn: parsed.args.amountIn,
        amountOutMin: parsed.args.amountOutMin,
        path,
        recipient: parsed.args.to,
        deadline: parsed.args.deadline,
        slippageTolerance: parsed.args.slippage
      };
    } else if (parsed.name === 'exactInputSingle') {
      // Uniswap V3 single-hop
      const tokenIn = parsed.args.tokenIn;
      const tokenOut = parsed.args.tokenOut;
      swap = {
        method: 'exactInputSingle',
        direction: 'token_to_token',
        tokenIn,
        tokenOut,
        amountIn: parsed.args.amountIn,
        amountOutMin: parsed.args.amountOutMin,
        fee: parsed.args.fee,
        recipient: parsed.args.recipient,
        sqrtPriceLimitX96: parsed.args.sqrtPriceLimitX96
      };
    } else if (parsed.name === 'exactInput') {
      // Uniswap V3 multi-hop
      const tokenIn = parsed.args.path[0]; // First token in path
      const tokenOut = parsed.args.path[parsed.args.path.length - 1]; // Last token
      swap = {
        method: 'exactInput',
        direction: 'token_to_token',
        tokenIn,
        tokenOut,
        amountIn: parsed.args.amountIn,
        amountOutMin: parsed.args.amountOutMin,
        path: parsed.args.path,
        recipient: parsed.args.recipient
      };
    } else if (parsed.name === 'swap') {
      // 1inch swap
      const tokenIn = parsed.args.fromToken;
      const tokenOut = parsed.args.toToken;
      swap = {
        method: 'swap',
        direction: 'token_to_token',
        tokenIn,
        tokenOut,
        amountIn: parsed.args.amount,
        minReturnAmount: parsed.args.minReturnAmount,
        priceImpactX96: parsed.args.priceImpactX96
      };
    }

    if (!swap) {
      return {
        router: config.name,
        routerName,
        routerAddress,
        method: parsed.name,
        decoded: true,
        error: `Unknown method: ${parsed.name}`
      };
    }

    // Add token symbols
    swap.tokenInSymbol = TOKENS[swap.tokenIn.toLowerCase()]?.symbol || swap.tokenIn.slice(0, 6);
    swap.tokenOutSymbol = TOKENS[swap.tokenOut.toLowerCase()]?.symbol || swap.tokenOut.slice(0, 6);

    return {
      ...swap,
      router: config.name,
      routerName,
      routerAddress,
      decoded: true,
      error: null
    };

  } catch (error) {
    return {
      router: 'UNKNOWN',
      routerName,
      routerAddress,
      decoded: false,
      error: error.message
    };
  }
}

/**
 * Batch decode multiple transactions
 */
export function decodeSwaps(transactions) {
  return transactions
    .filter(tx => tx.data && tx.to)
    .map(tx => decodeSwap(tx.data, tx.to, tx.router))
    .filter(swap => swap && swap.decoded);
}

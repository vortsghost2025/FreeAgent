// Known Ethereum function signatures
const SIGNATURES = {
  '0x7ff36ab5': 'withdraw(uint256)',          // WETH withdraw
  '0x38ed1739': 'swapExactETHForTokens(...)',  // Uniswap V2
  '0x8803dbee': 'swapTokensForExactETH(...)',  // Uniswap V2
  '0xded9382a': 'swapExactTokensForTokens(...)',  // Uniswap V2
  '0x2e1a7d4d': 'dodoSwap(...)',           // DODO
  '0xa9059cbb': 'transfer(address,uint256)',  // ERC20
  '0x095ea7b3': 'approve(address,uint256)',  // ERC20
};

console.log('🔍 Function signature 0x7ff36ab5:');
console.log(`   Name: ${SIGNATURES['0x7ff36ab5'] || 'Unknown'}`);
console.log(`   This is WETH withdraw() function, NOT a swap!`);

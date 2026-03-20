/**
 * Balance Manager - The "Janitor" for your MEV bot
 * 
 * Runs SEPARATELY from the arbitrage loop to keep balances healthy.
 * This prevents race conditions and keeps the bot stable.
 * 
 * Rules:
 * - NEVER touches balances during active arbitrage
 * - Only checks every 60 seconds (not every cycle)
 * - Uses hysteresis to prevent flip-flopping
 * 
 * Holdings:
 * - ETH: Minimum reserve for gas
 * - WETH: Trade capital
 * - USDC: Accumulated profits
 */

import { ethers } from 'ethers';

// ============================================================
// CONFIG - Tweak these values
// ============================================================
const BALANCE_CONFIG = {
  // ETH Reserve: Keep this much ETH for gas ALWAYS
  MIN_ETH_RESERVE: '0.002',    // 0.002 ETH minimum
  
  // ETH Excess: Wrap excess above this
  ETH_EXCESS_THRESHOLD: '0.005', // 0.005 ETH - wrap anything above this
  
  // USDC Threshold: Only convert when above this (high gas costs!)
  // $40 at $3 gas = 7.5% loss. Need $100+ to make it worth it.
  MIN_USDC_TO_CONVERT: '100',    // $100 minimum - otherwise gas eats profits
  
  // USDC Convert Amount: Convert this percentage when threshold met
  USDC_CONVERT_PERCENT: 50,     // Convert 50% of USDC to WETH
  
  // Check interval: Don't check too often
  CHECK_INTERVAL_MS: 60000,     // 60 seconds between checks
  
  // Uniswap Router
  UNISWAP_ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4F659F2488D'
};

// Token addresses (mainnet)
const TOKENS = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint wad)',
  'function balanceOf(address) view returns (uint256)'
];

class BalanceManager {
  constructor(wallet) {
    this.wallet = wallet;
    this.provider = wallet.provider;
    
    // Contracts
    this.weth = new ethers.Contract(TOKENS.WETH, WETH_ABI, wallet);
    this.usdc = new ethers.Contract(TOKENS.USDC, ERC20_ABI, wallet);
    this.router = new ethers.Contract(BALANCE_CONFIG.UNISWAP_ROUTER, ROUTER_ABI, wallet);
    
    // State
    this.lastCheck = 0;
    this.isActive = false;
    this.lastAction = null; // 'wrap' | 'unwrap' | 'convert' | null
    
    console.log('🏠 Balance Manager initialized');
    console.log(`   Min ETH Reserve: ${BALANCE_CONFIG.MIN_ETH_RESERVE} ETH`);
    console.log(`   ETH Excess Threshold: ${BALANCE_CONFIG.ETH_EXCESS_THRESHOLD} ETH`);
    console.log(`   Min USDC to Convert: ${BALANCE_CONFIG.MIN_USDC_TO_CONVERT} (gas costs too high below $100)`);
  }

  /**
   * Get all balances in human-readable format
   */
  async getBalances() {
    const ethBalance = await this.provider.getBalance(this.wallet.address);
    const wethBalance = await this.weth.balanceOf(this.wallet.address);
    const usdcBalance = await this.usdc.balanceOf(this.wallet.address);
    
    return {
      eth: parseFloat(ethers.formatEther(ethBalance)),
      weth: parseFloat(ethers.formatEther(wethBalance)),
      usdc: parseFloat(ethers.formatUnits(usdcBalance, 6)),
      totalEth: parseFloat(ethers.formatEther(ethBalance)) + parseFloat(ethers.formatEther(wethBalance))
    };
  }

  /**
   * Main balance check - call this periodically from separate loop
   * Returns true if any action was taken
   */
  async checkAndRebalance() {
    const now = Date.now();
    
    // Rate limit checks
    if (now - this.lastCheck < BALANCE_CONFIG.CHECK_INTERVAL_MS) {
      return false;
    }
    this.lastCheck = now;
    
    const balances = await this.getBalances();
    let actionTaken = false;
    
    console.log('\n🏠 ========== BALANCE MANAGER ==========');
    console.log(`   ETH: ${balances.eth.toFixed(6)}`);
    console.log(`   WETH: ${balances.weth.toFixed(6)}`);
    console.log(`   USDC: $${balances.usdc.toFixed(2)}`);
    console.log(`   Total ETH: ${balances.totalEth.toFixed(6)}`);
    console.log('========================================\n');
    
    // 1. Check ETH reserve - unwrap WETH if ETH too low
    if (balances.eth < parseFloat(BALANCE_CONFIG.MIN_ETH_RESERVE)) {
      const amountToUnwrap = parseFloat(BALANCE_CONFIG.MIN_ETH_RESERVE) - balances.eth + 0.001; // Extra buffer
      if (balances.weth >= amountToUnwrap) {
        await this.unwrapWeth(amountToUnwrap);
        actionTaken = true;
      } else if (balances.weth > 0.001) {
        await this.unwrapWeth(balances.weth);
        actionTaken = true;
      }
    }
    
    // 2. Check ETH excess - wrap if too much ETH sitting idle
    else if (balances.eth > parseFloat(BALANCE_CONFIG.ETH_EXCESS_THRESHOLD)) {
      const amountToWrap = balances.eth - parseFloat(BALANCE_CONFIG.ETH_EXCESS_THRESHOLD);
      if (amountToWrap > 0.001) {
        await this.wrapEth(amountToWrap);
        actionTaken = true;
      }
    }
    
    // 3. Check USDC - convert to WETH if above threshold
    if (balances.usdc >= parseFloat(BALANCE_CONFIG.MIN_USDC_TO_CONVERT)) {
      const usdcToConvert = balances.usdc * (BALANCE_CONFIG.USDC_CONVERT_PERCENT / 100);
      if (usdcToConvert > 1) { // Minimum $1
        await this.convertUsdcToWeth(usdcToConvert);
        actionTaken = true;
      }
    }
    
    return actionTaken;
  }

  /**
   * Wrap ETH -> WETH (for trading capital)
   */
  async wrapEth(amountEth) {
    try {
      // Round to 6 decimal places to avoid precision issues with ethers.js
      const safeAmount = Math.round(amountEth * 1000000) / 1000000;
      console.log(`🔄 Wrapping ${safeAmount.toFixed(6)} ETH → WETH...`);
      
      const amountWei = ethers.parseEther(safeAmount.toString());
      const tx = await this.weth.deposit({ value: amountWei });
      await tx.wait();
      
      console.log(`✅ Wrapped ${safeAmount.toFixed(6)} ETH → WETH`);
      this.lastAction = 'wrap';
      
      return true;
    } catch (err) {
      console.log(`❌ Wrap failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Unwrap WETH -> ETH (for gas)
   */
  async unwrapWeth(amountEth) {
    try {
      // Round to 6 decimal places to avoid precision issues with ethers.js
      const safeAmount = Math.round(amountEth * 1000000) / 1000000;
      console.log(`🔄 Unwrapping ${safeAmount.toFixed(6)} WETH → ETH...`);
      
      const amountWei = ethers.parseEther(safeAmount.toString());
      const tx = await this.weth.withdraw(amountWei);
      await tx.wait();
      
      console.log(`✅ Unwrapped ${safeAmount.toFixed(6)} WETH → ETH`);
      this.lastAction = 'unwrap';
      
      return true;
    } catch (err) {
      console.log(`❌ Unwrap failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Convert USDC -> WETH (to reinvest profits)
   */
  async convertUsdcToWeth(amountUsdc) {
    try {
      // Round to 2 decimal places (USDC has 6 decimals but we work in dollars)
      const safeAmount = Math.round(amountUsdc * 100) / 100;
      console.log(`🔄 Converting ${safeAmount.toFixed(2)} USDC → WETH...`);
      
      const usdcWei = ethers.parseUnits(safeAmount.toString(), 6);
      
      // Check allowance
      const allowance = await this.usdc.allowance(this.wallet.address, BALANCE_CONFIG.UNISWAP_ROUTER);
      if (allowance < usdcWei) {
        console.log('   Approving USDC...');
        const approveTx = await this.usdc.approve(BALANCE_CONFIG.UNISWAP_ROUTER, ethers.MaxUint256);
        await approveTx.wait();
      }
      
      // Get expected output
      const amounts = await this.router.getAmountsOut(usdcWei, [TOKENS.USDC, TOKENS.WETH]);
      const minOut = amounts[1] * 95n / 100n; // 5% slippage tolerance
      
      // Swap
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min
      const tx = await this.router.swapExactTokensForTokens(
        usdcWei,
        minOut,
        [TOKENS.USDC, TOKENS.WETH],
        this.wallet.address,
        deadline
      );
      await tx.wait();
      
      const wethReceived = parseFloat(ethers.formatEther(amounts[1]));
      console.log(`✅ Converted $${amountUsdc.toFixed(2)} USDC → ${wethReceived.toFixed(6)} WETH`);
      this.lastAction = 'convert';
      
      return true;
    } catch (err) {
      console.log(`❌ USDC conversion failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Send USDC to external wallet (profit sweep)
   */
  async sweepUsdcTo(walletAddress, amountUsdc = null) {
    try {
      const balances = await this.getBalances();
      const amount = amountUsdc || balances.usdc;
      
      if (amount < 1) {
        console.log('⚠️  USDC balance too low to sweep');
        return false;
      }
      
      console.log(`💸 Sweeping $${amount.toFixed(2)} USDC to ${walletAddress.slice(0, 6)}...`);
      
      const usdcWei = ethers.parseUnits(amount.toString(), 6);
      const tx = await this.usdc.transfer(walletAddress, usdcWei);
      await tx.wait();
      
      console.log(`✅ Swept $${amount.toFixed(2)} USDC to external wallet`);
      return true;
    } catch (err) {
      console.log(`❌ Sweep failed: ${err.message}`);
      return false;
    }
  }
}

export default BalanceManager;
export { BALANCE_CONFIG };

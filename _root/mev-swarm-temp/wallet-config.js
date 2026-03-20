/**
 * Unified Wallet Configuration
 * Integrates Alchemy blockchain monitoring with KuCoin trading
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { KuCoinExchange } from './kucoin-exchange.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the .env file in the same directory
dotenv.config({ path: resolve(__dirname, '.env') });

export class WalletConfig {
  constructor() {
    // Alchemy configuration for blockchain monitoring
    this.alchemyConfig = {
      ethRpcUrl: process.env.ETH_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      ethWsUrl: process.env.ETH_WS_URL || `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` || 'wss://eth-mainnet.g.alchemy.com/v2/demo',
      bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
      arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      optimismRpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'
    };

    // KuCoin configuration for trading
    this.kucoinEnabled = !!(process.env.KUCOIN_API_KEY && process.env.KUCOIN_API_SECRET && process.env.KUCOIN_PASSPHRASE);
    
    if (this.kucoinEnabled) {
      this.kucoin = new KuCoinExchange(
        process.env.KUCOIN_API_KEY,
        process.env.KUCOIN_API_SECRET,
        process.env.KUCOIN_PASSPHRASE
      );
    }

    // Trading configuration
    this.tradingConfig = {
      minProfitPercent: parseFloat(process.env.MIN_PROFIT_PERCENT) || 0.5,
      tradeSizeEth: parseFloat(process.env.TRADE_SIZE_ETH) || 0.01,
      // Safe default: dryRun=true by default (must explicitly pass --live or set DRY_RUN=false for live trading)
      dryRun: process.env.DRY_RUN !== 'false' && !process.argv.includes('--live') && !process.argv.includes('-l'),
      walletAddress: process.env.WALLET_ADDRESS || null
    };
    
    // Direct access for backward compatibility
    this.privateKey = process.env.BOT_WALLET_PRIVATE_KEY || null;
    this.address = process.env.WALLET_ADDRESS || null;
    
    // Log trading mode
    console.log(this.tradingConfig.dryRun ? '🔒 DRY RUN MODE - No real trades' : '⚠️ LIVE TRADING MODE');

    // Telegram notifications
    this.telegramConfig = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || null,
      chatId: process.env.TELEGRAM_CHAT_ID || null,
      enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    };
  }

  /**
   * Get Alchemy RPC configuration
   */
  getAlchemyConfig() {
    return this.alchemyConfig;
  }

  /**
   * Get KuCoin exchange instance
   */
  getKuCoinExchange() {
    if (!this.kucoinEnabled) {
      throw new Error('KuCoin API credentials not configured. Add KUCOIN_API_KEY, KUCOIN_API_SECRET, and KUCOIN_PASSPHRASE to .env');
    }
    return this.kucoin;
  }

  /**
   * Check if KuCoin trading is enabled
   */
  isKuCoinEnabled() {
    return this.kucoinEnabled;
  }

  /**
   * Get trading configuration
   */
  getTradingConfig() {
    return this.tradingConfig;
  }

  /**
   * Get wallet config (for compatibility)
   */
  getWalletConfig() {
    return {
      privateKey: this.privateKey,
      address: this.address
    };
  }

  /**
   * Get Telegram configuration
   */
  getTelegramConfig() {
    return this.telegramConfig;
  }

  /**
   * Validate configuration
   */
  validate() {
    const issues = [];

    // Check Alchemy configuration
    if (!this.alchemyConfig.ethRpcUrl.includes('alchemy.com')) {
      console.warn('⚠️  Using demo Alchemy URL - replace with your API key for production');
    }

    // Check KuCoin configuration
    if (this.kucoinEnabled) {
      console.log('✅ KuCoin trading enabled');
    } else {
      console.log('ℹ️  KuCoin trading disabled (missing API credentials)');
    }

    // Check trading parameters
    if (this.tradingConfig.dryRun) {
      console.log('⚠️  Dry run mode enabled - no real trades will be executed');
    }

    return issues;
  }

  /**
   * Display current configuration
   */
  displayConfig() {
    console.log('\n=== WALLET CONFIGURATION ===');
    console.log('Alchemy RPC URLs:');
    console.log(`  ETH: ${this.alchemyConfig.ethRpcUrl.replace(/\/v2\/.*/, '/v2/***)')}`);
    console.log(`  BSC: ${this.alchemyConfig.bscRpcUrl}`);
    console.log(`  Arbitrum: ${this.alchemyConfig.arbitrumRpcUrl}`);
    console.log(`  Optimism: ${this.alchemyConfig.optimismRpcUrl}`);
    
    console.log('\nTrading Configuration:');
    console.log(`  Min Profit: ${this.tradingConfig.minProfitPercent}%`);
    console.log(`  Trade Size: ${this.tradingConfig.tradeSizeEth} ETH`);
    console.log(`  Dry Run: ${this.tradingConfig.dryRun ? 'ENABLED' : 'DISABLED'}`);
    
    console.log(`\nKuCoin: ${this.kucoinEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Telegram: ${this.telegramConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log('============================\n');
  }
}

// Export singleton instance
export const walletConfig = new WalletConfig();

// For backward compatibility
export default walletConfig;
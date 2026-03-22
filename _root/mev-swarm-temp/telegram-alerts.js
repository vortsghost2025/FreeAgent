/**
 * Telegram Alert System for MEV Swarm
 * Sends notifications on trade executions
 */

const TelegramBot = require('node-telegram-bot-api');
import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

class TelegramAlerts {
  constructor() {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.log('⚠️  Telegram alerts not configured - set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
      this.enabled = false;
      return;
    }

    this.bot = new TelegramBot(BOT_TOKEN, { polling: false });
    this.enabled = true;
    console.log('✅ Telegram alerts enabled');
  }

  async sendMessage(message) {
    if (!this.enabled) return;

    try {
      await this.bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
      console.log('📱 Telegram alert sent');
    } catch (error) {
      console.error('❌ Telegram error:', error.message);
    }
  }

  async tradeExecuted(tradeData) {
    if (!this.enabled) return;

    const message = `
🚀 <b>MEV SWARM TRADE EXECUTED</b>

💰 <b>Amount:</b> ${tradeData.amount} ETH
📊 <b>Spread:</b> ${tradeData.spread}%
⛽ <b>Gas Used:</b> ${tradeData.gasUsed}
💵 <b>Gas Cost:</b> ${tradeData.gasCost} ETH
📦 <b>TX Hash:</b> <code>${tradeData.txHash}</code>
🔗 <a href="https://etherscan.io/tx/${tradeData.txHash}">View on Etherscan</a>

📈 <b>Total Trades:</b> ${tradeData.totalTrades}
🔄 <b>Next Scale:</b> ${tradeData.tradesUntilScale} trades remaining
    `;

    await this.sendMessage(message);
  }

  async tradeFailed(errorData) {
    if (!this.enabled) return;

    const message = `
❌ <b>MEV SWARM TRADE FAILED</b>

💰 <b>Amount:</b> ${errorData.amount} ETH
⚠️  <b>Error:</b> ${errorData.error}

🔗 Check logs for details
    `;

    await this.sendMessage(message);
  }

  async botStarted(config) {
    if (!this.enabled) return;

    const message = `
🤖 <b>MEV SWARM BOT STARTED</b>

💰 <b>Balance:</b> ${config.balance} ETH
📊 <b>Trade Size:</b> ${config.tradeSize} ETH
🔄 <b>Auto-Scale:</b> Every ${config.scaleInterval} trades
📈 <b>Current Multiplier:</b> ${config.multiplier}x

🚀 <b>Status:</b> HUNTING FOR ARBITRAGE
    `;

    await this.sendMessage(message);
  }

  async scaleUp(newSize, multiplier) {
    if (!this.enabled) return;

    const message = `
📈 <b>AUTO-SCALE TRIGGERED!</b>

🔄 <b>Trade Size Doubled:</b> ${newSize} ETH
📊 <b>New Multiplier:</b> ${multiplier}x
💰 <b>Profit Potential:</b> 2x per trade

🚀 <b>Bot continues running...</b>
    `;

    await this.sendMessage(message);
  }
}

export { TelegramAlerts };
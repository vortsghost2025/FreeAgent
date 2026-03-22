/**
 * Simple Telegram Alert System for MEV Swarm
 * Uses existing @VSMarginBot for notifications
 */

import 'dotenv/config';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

class SimpleTelegramAlerts {
  constructor() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('⚠️  Telegram alerts not configured');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    console.log('✅ Telegram alerts enabled (@VSMarginBot)');
  }

  async sendMessage(message) {
    if (!this.enabled) return;

    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        console.log('📱 Telegram alert sent');
      } else {
        console.error('❌ Telegram error:', await response.text());
      }
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
💵 <b>Gas Cost:</b> ${tradeData.gasCost} ETH
📦 <b>TX:</b> <code>${tradeData.txHash.substring(0, 10)}...</code>

📈 <b>Total Trades:</b> ${tradeData.totalTrades}
    `;

    await this.sendMessage(message);
  }

  async tradeFailed(errorData) {
    if (!this.enabled) return;

    const message = `
❌ <b>MEV SWARM TRADE FAILED</b>

💰 <b>Amount:</b> ${errorData.amount} ETH
⚠️  <b>Error:</b> ${errorData.error}
    `;

    await this.sendMessage(message);
  }

  async scaleUp(newSize, multiplier) {
    if (!this.enabled) return;

    const message = `
📈 <b>AUTO-SCALE TRIGGERED!</b>

🔄 <b>New Size:</b> ${newSize} ETH
📊 <b>Multiplier:</b> ${multiplier}x
💰 <b>Profit Potential:</b> 2x per trade
    `;

    await this.sendMessage(message);
  }
}

export { SimpleTelegramAlerts };
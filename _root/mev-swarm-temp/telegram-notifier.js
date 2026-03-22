/**
 * Telegram Notifier for MEV Swarm
 * Sends alerts when arbitrage opportunities are detected
 * 
 * Setup:
 * 1. Create bot via @BotFather on Telegram
 * 2. Get your chat ID from @userinfobot
 * 3. Add credentials to .env
 */

import fetch from 'node-fetch';

class TelegramNotifier {
  constructor(config = {}) {
    this.botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = config.chatId || process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!(this.botToken && this.chatId);
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(text, parseMode = 'Markdown') {
    if (!this.enabled) {
      console.log('[Telegram] Not configured - skipping notification');
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.log(`[Telegram] Error: ${data.description}`);
        return null;
      }
      
      return data.result;
    } catch (error) {
      console.log(`[Telegram] Failed to send: ${error.message}`);
      return null;
    }
  }

  async sendOpportunityAlert(opp) {
    const message = `
🚀 *MEV ARBITRAGE OPPORTUNITY*

💰 *Profit:* ${opp.profitPercent.toFixed(2)}%
📊 *Pair:* \`${opp.tokenPair}\`
⬆️ *Buy on:* ${opp.buyOn}
⬇️ *Sell on:* ${opp.sellOn}
💵 *Buy Price:* $${opp.buyPrice.toFixed(6)}
💵 *Sell Price:* $${opp.sellPrice.toFixed(6)}
    `.trim();

    return this.sendMessage(message);
  }

  async sendStartupNotification(walletAddress, chains) {
    const message = `
🟢 *MEV SWARM ONLINE*

👛 *Wallet:* \`${walletAddress.slice(0, 8)}...\`
🌐 *Chains:* ${chains.join(', ')}
⏰ *Started:* ${new Date().toISOString()}
    `.trim();

    return this.sendMessage(message);
  }

  async sendStatusUpdate(stats) {
    const message = `
📊 *SWARM STATUS*

⏱️ *Uptime:* ${stats.uptimeFormatted}
🎯 *Opportunities:* ${stats.opportunitiesFound}
Trades *Executed:*  ${stats.tradesExecuted}
💵 *Total Profit:* $${stats.totalProfit.toFixed(4)}
    `.trim();

    return this.sendMessage(message);
  }

  async testConnection() {
    if (!this.enabled) {
      console.log('[Telegram] Not configured');
      return false;
    }

    const result = await this.sendMessage('🟢 MEV Swarm connected! Testing notifications...');
    return !!result;
  }
}

export default TelegramNotifier;

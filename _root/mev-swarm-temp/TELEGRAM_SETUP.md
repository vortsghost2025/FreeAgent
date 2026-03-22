# Telegram Alerts Setup for MEV Swarm

## Quick Setup (5 minutes)

### 1. Get Your Telegram Chat ID
1. Open Telegram and start a chat with @userinfobot
2. Send `/start` command
3. You'll get your Chat ID (copy it)

### 2. Create a Telegram Bot (or use existing one)
1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow the prompts:
   - Name your bot (e.g., "MEV Swarm Alerts")
   - Create username (e.g., "mev_swarm_bot")
4. Copy the **Bot Token** (looks like: `123456789:ABCdefGHI...`)

### 3. Add Credentials to .env File
Open `mev-swarm/.env` and add:

```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
TELEGRAM_CHAT_ID=123456789
```

Replace with your actual bot token and chat ID.

### 4. Restart the Bot
```bash
# Kill current bot
taskkill //F //IM node.exe

# Start with alerts
node simple-launcher.js
```

## What You'll Get Alerts For:

✅ **Trade Executed** - Every successful arbitrage trade
- Amount traded
- Spread percentage
- Gas cost
- Transaction hash
- Running trade count

❌ **Trade Failed** - When trades don't execute
- Amount attempted
- Error message

📈 **Auto-Scale Triggered** - When trade size doubles
- New trade size
- Multiplier level
- Profit potential increase

## Testing

Once configured, you'll see:
```
✅ Telegram alerts enabled (@VSMarginBot)
```

When the first trade executes, check your Telegram - you should get an alert!

## Troubleshooting

**No alerts showing up?**
- Check .env file has correct TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
- Make sure bot token has no extra spaces
- Restart the bot after updating .env

**Bot not sending messages?**
- Make sure you started a chat with your bot in Telegram
- Send `/start` to your bot first
- Check bot has permission to send messages

## Current Status

- ✅ Telegram alert system integrated
- ✅ Uses your existing @VSMarginBot infrastructure
- ✅ Alerts configured but not active (needs credentials in .env)
- ✅ Bot running with full functionality
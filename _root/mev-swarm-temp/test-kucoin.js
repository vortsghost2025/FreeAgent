/**
 * KuCoin API Test
 * Run: node mev-swarm/test-kucoin.js
 * 
 * Get API keys from: https://www.kucoin.com/account/api
 */

import crypto from 'crypto';

const API_KEY = process.env.KUCOIN_API_KEY || '';
const API_SECRET = process.env.KUCOIN_API_SECRET || '';
const PASSPHRASE = process.env.KUCOIN_PASSPHRASE || '';

// Try loading from external config if not set
if (!API_KEY) {
  try {
    const extPath = 'C:\\Dev\\kucoin-margin-bot\\.env';
    const fs = require('fs');
    if (fs.existsSync(extPath)) {
      const envContent = fs.readFileSync(extPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^(KUCOIN_API_KEY|KUCOIN_API_SECRET|KUCOIN_PASSPHRASE)=(.+)$/);
        if (match) {
          if (match[1] === 'KUCOIN_API_KEY' && !API_KEY) process.env[match[1]] = match[2];
          if (match[1] === 'KUCOIN_API_SECRET' && !API_SECRET) process.env[match[1]] = match[2];
          if (match[1] === 'KUCOIN_PASSPHRASE' && !PASSPHRASE) process.env[match[1]] = match[2];
        }
      });
    }
  } catch (e) {}
}

async function testKuCoin() {
  console.log('🧪 Testing KuCoin API...\n');
  
  if (!API_KEY || !API_SECRET || !PASSPHRASE) {
    console.log('❌ Missing API credentials!');
    console.log('\nTo get API keys:');
    console.log('1. Go to https://www.kucoin.com/account/api');
    console.log('2. Create API key with "Trade" permission');
    console.log('3. Add credentials to .env:');
    console.log('   KUCOIN_API_KEY=your_key');
    console.log('   KUCOIN_API_SECRET=your_secret');
    console.log('   KUCOIN_PASSPHRASE=your_passphrase');
    return;
  }

  const baseURL = 'https://api.kucoin.com';
  
  function sign(method, endpoint, body = '') {
    const timestamp = Date.now().toString();
    const message = timestamp + method + endpoint + body;
    
    const signature = crypto
      .createHmac('sha256', API_SECRET)
      .update(message)
      .digest('base64');
    
    const passphraseEncrypted = crypto
      .createHmac('sha256', API_SECRET)
      .update(PASSPHRASE)
      .digest('base64');

    return {
      'KC-API-KEY': API_KEY,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphraseEncrypted,
      'KC-API-KEY-VERSION': '2'
    };
  }

  try {
    // Test 1: Get account balance
    console.log('📊 Getting account balance...');
    const headers = sign('GET', '/api/v1/accounts', '');
    const balanceRes = await fetch(`${baseURL}/api/v1/accounts`, {
      headers: { ...headers }
    });
    const balanceData = await balanceRes.json();
    
    if (balanceData.code === '200000') {
      console.log('✅ Balance retrieved!');
      balanceData.data.forEach(acc => {
        if (parseFloat(acc.balance) > 0) {
          console.log(`   ${acc.currency}: ${acc.balance}`);
        }
      });
    } else {
      console.log('❌ Error:', balanceData.msg);
    }

    // Test 2: Get USDT price
    console.log('\n📈 Getting USDT price...');
    const tickerRes = await fetch(`${baseURL}/api/v1/market/orderbook/level1?symbol=USDT-USDC`);
    const tickerData = await tickerRes.json();
    
    if (tickerData.code === '200000') {
      console.log('✅ USDT Price:', tickerData.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testKuCoin();
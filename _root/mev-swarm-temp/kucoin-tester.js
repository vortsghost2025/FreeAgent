/**
 * KuCoin Quick Test
 * Run: node mev-swarm/kucoin-tester.js
 * 
 * Add your credentials directly below to test
 */

import crypto from 'crypto';

// === YOUR KUCOIN CREDENTIALS HERE ===
const API_KEY = 'your_api_key_here';
const API_SECRET = 'your_api_secret_here';
const PASSPHRASE = 'your_passphrase_here';
// ======================================

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

async function testAPI() {
  console.log('🧪 Testing KuCoin API...\n');
  
  if (API_KEY === 'your_api_key_here') {
    console.log('❌ Please add your credentials in mev-swarm/kucoin-tester.js');
    return;
  }

  try {
    // Get account info
    const headers = sign('GET', '/api/v1/accounts', '');
    const res = await fetch(`${baseURL}/api/v1/accounts`, { headers: { ...headers } });
    const data = await res.json();
    
    if (data.code === '200000') {
      console.log('✅ API Connected!\n');
      console.log('📊 Your Balances:');
      data.data.forEach(acc => {
        if (parseFloat(acc.balance) > 0) {
          console.log(`   ${acc.currency}: ${acc.balance}`);
        }
      });
      
      // Check for USDT
      const usdt = data.data.find(a => a.currency === 'USDT');
      if (usdt) {
        console.log(`\n💰 USDT Balance: ${usdt.balance}`);
      }
    } else {
      console.log('❌ Error:', data.msg);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testAPI();
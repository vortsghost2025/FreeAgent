/**
 * KuCoin Exchange API
 * For trading with your $120 USDT on KuCoin
 */

import crypto from 'crypto';

export class KuCoinExchange {
  constructor(apiKey, apiSecret, passphrase) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    this.baseURL = 'https://api.kucoin.com';
  }

  _sign(method, endpoint, body = '') {
    const timestamp = Date.now().toString();
    const message = timestamp + method + endpoint + body;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
    
    const passphraseEncrypted = crypto
      .createHmac('sha256', this.apiSecret)
      .update(this.passphrase)
      .digest('base64');

    return {
      'KC-API-KEY': this.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphraseEncrypted,
      'KC-API-KEY-VERSION': '2'
    };
  }

  async request(method, endpoint, body = '') {
    try {
      const headers = this._sign(method, endpoint, body);
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body || undefined
      });
      const data = await response.json();
      
      if (data.code && data.code !== '200000') {
        throw new Error(data.msg || `API Error: ${data.code}`);
      }
      
      return data;
    } catch (error) {
      console.error(`[KuCoin API] Request failed: ${error.message}`);
      throw error;
    }
  }

  async getBalance() {
    return this.request('GET', '/api/v1/accounts');
  }

  async getTickers() {
    return this.request('GET', '/api/v1/market/allTickers');
  }

  async placeOrder(pair, side, size, price) {
    const endpoint = '/api/v1/orders';
    const order = {
      clientOid: Date.now().toString(),
      side,
      symbol: pair,
      type: 'limit',
      price: price.toString(),
      size: size.toString()
    };
    const body = JSON.stringify(order);
    return this.request('POST', endpoint, body);
  }
}
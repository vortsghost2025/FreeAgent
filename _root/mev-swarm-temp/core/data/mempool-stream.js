import { EventEmitter } from 'events';
import { ethers } from 'ethers';

export class MempoolStream extends EventEmitter {
  /**
   * providerOrUrl: ws url string or ethers Provider
   * options: { selectors: [], watchedAddresses: [] }
   */
  constructor(providerOrUrl, options = {}) {
    super();
    this.options = options || {};
    this.selectors = new Set(this.options.selectors || [
      '0x38ed1739', // swapExactTokensForTokens
      '0x8803dbee', // swapTokensForExactTokens
      '0x5ae401dc', // common multicall/multiswap
    ]);

    this.watchedAddresses = new Set((this.options.watchedAddresses || []).map(a => a.toLowerCase()));

    if (providerOrUrl && typeof providerOrUrl === 'object' && providerOrUrl.getBlockNumber) {
      this.provider = providerOrUrl;
      this.isWebsocket = !!providerOrUrl.connection && providerOrUrl.connection.url && providerOrUrl.connection.url.startsWith('ws');
    } else if (typeof providerOrUrl === 'string' && providerOrUrl.startsWith('ws')) {
      this.provider = new ethers.providers.WebSocketProvider(providerOrUrl);
      this.isWebsocket = true;
    } else if (typeof providerOrUrl === 'string') {
      this.provider = new ethers.providers.JsonRpcProvider(providerOrUrl);
      this.isWebsocket = false;
    } else {
      throw new Error('MempoolStream requires a provider instance or URL');
    }

    this.connected = false;
    this._onPending = this._onPending.bind(this);
  }

  connect() {
    if (this.connected) return;
    this.connected = true;

    // If ws provider supports 'pending' subscription, use it
    if (this.provider.on) {
      this.provider.on('pending', this._onPending);
    } else {
      throw new Error('Provider does not support event subscriptions');
    }
  }

  disconnect() {
    if (!this.connected) return;
    if (this.provider.off) this.provider.off('pending', this._onPending);
    this.connected = false;
    if (this.provider.destroy) this.provider.destroy();
  }

  async _onPending(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;

      if (this.isRelevantTx(tx)) {
        this.emit('pending', tx);
      }
    } catch (err) {
      // ignore transient errors
    }
  }

  isWatchedAddress(addr) {
    if (!addr) return false;
    return this.watchedAddresses.has(addr.toLowerCase());
  }

  isRelevantTx(tx) {
    if (!tx) return false;
    const selector = tx.data && tx.data.length >= 10 ? tx.data.slice(0, 10) : null;
    if (selector && this.selectors.has(selector)) return true;
    if (this.isWatchedAddress(tx.to)) return true;
    return false;
  }

  watchAddress(addr) {
    if (addr) this.watchedAddresses.add(addr.toLowerCase());
  }

  unwatchAddress(addr) {
    if (addr) this.watchedAddresses.delete(addr.toLowerCase());
  }

  status() {
    return {
      connected: this.connected,
      watched: Array.from(this.watchedAddresses),
      selectors: Array.from(this.selectors).slice(0, 10)
    };
  }
}

export default MempoolStream;

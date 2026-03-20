import { buildArbBundle, simulateBundle as simBundle } from '../../bundle-simulator.js';
import Flashbots from './flashbots-submitter.js';
import metrics from '../utils/metrics.js';
import { Wallet } from 'ethers';

export class BundleExecutor {
  constructor(config = {}) {
    this.config = config;
    this.pendingBundles = [];
  }

  async getPendingBundles() {
    return this.pendingBundles;
  }

  async checkBalance() {
    // If wallet provided, check balance
    try {
      if (this.config.wallet && this.config.wallet.getBalance) {
        const bal = await this.config.wallet.getBalance();
        return { ok: true, balance: bal };
      }
      return { ok: true, balance: 0n };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async checkContractExists() {
    // Placeholder: in production, verify deployed helper contracts
    return { ok: true };
  }

  async buildBundle(opportunity, { gasStrategy, scoring } = {}) {
    // Build a simulated bundle using bundle-simulator
    const route = opportunity.tokens || opportunity.path || ['WETH', 'USDC'];
    const amountIn = Number(opportunity.expectedProfitWei ? Number(opportunity.expectedProfitWei) / 1e18 : 0.01);
    const bundle = buildArbBundle(route, amountIn, this.config.provider);
    bundle.opportunity = opportunity;
    bundle.gasCost = BigInt(Math.floor(bundle.gasEstimate || 250000) * 1_000_000_000); // rough gasCost in wei at 1 gwei

    // For local testing/dev convenience, optionally attach a fake signed bundle
    if (this.config.autoSign) {
      const fakeRaw = '0x' + 'f'.repeat(64);
      bundle.signedBundle = [{ raw: fakeRaw, meta: { expectedProfitEth: Number(opportunity.expectedProfitWei || 0n) / 1e18 } }];
    }
    return bundle;
  }

  async signBundleWithWallet(wallet, bundle) {
    // Only allow explicit liveSign config for safety
    if (!this.config.liveSign) throw new Error('liveSign not enabled on BundleExecutor');

    if (!wallet || typeof wallet.signTransaction !== 'function') {
      throw new Error('Invalid wallet provided for signing');
    }

    // Create minimal signed transactions for each tx in bundle.txs
    const signed = [];
    for (let i = 0; i < (bundle.txs || []).length; i++) {
      const tx = bundle.txs[i];
      // Build a minimal transaction object. In production you'd populate proper `to`, `data`, `value`, `gasLimit`, etc.
      const unsigned = {
        to: this.config.executorAddress || wallet.address,
        value: 0n,
        data: '0x',
        gasLimit: 21000n,
        gasPrice: 1n,
        nonce: i
      };

      const raw = await wallet.signTransaction(unsigned);
      signed.push({ raw, meta: { idx: i } });
    }

    bundle.signedBundle = signed;
    metrics.recordEvent({ event: 'bundle_signed', bundleSize: signed.length });
    return signed;
  }

  async simulateBundle(bundle) {
    try {
      const provider = this.config.provider;
      const res = await simBundle(bundle, provider);
      // normalize response for HFT loop
      return {
        success: !!res && !res.error,
        profit: res && res.profitable ? BigInt(Math.floor(Number(res.netProfit) * 1e18)) : 0n,
        gasCost: bundle.gasCost || 0n,
        raw: res
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async submitBundle(bundle) {
    // Default: dry-run behavior
    if (!this.config.submit) {
      const txHash = '0x' + 'd'.repeat(64);
      return { result: { success: true, txHash, simulated: true } };
    }

    // Live submit path: require signed bundle and flashbots provider
    // Build or reuse Flashbots provider
    if (!this._fb) {
      const ethersProvider = this.config.provider;
      const relaySigner = this.config.relaySigner || null; // wallet used to sign relay requests
      const created = await Flashbots.createFlashbotsProvider(ethersProvider, relaySigner);
      if (!created.ready) {
        return { result: { success: false, error: created.error } };
      }
      this._fb = created.provider;
    }

    // Expect caller to provide a pre-signed bundle (signedBundle)
    const signedBundle = bundle.signedBundle || bundle.signedTxs || null;
    if (!signedBundle) {
      return { result: { success: false, error: 'No signedBundle provided. Build and sign bundle before submitting.' } };
    }

    // Determine target block
    let targetBlock = null;
    try {
      const bn = await this.config.provider.getBlockNumber();
      targetBlock = bn + 1;
    } catch (e) {
      return { result: { success: false, error: 'Failed to get block number: ' + String(e) } };
    }

    // Use safeSendBundle wrapper which simulates and requires LIVE_SUBMIT to be set for live sends
    try {
      const res = await Flashbots.safeSendBundle(this._fb, signedBundle, targetBlock);
      metrics.recordEvent({ event: 'bundle_submit_attempt', live: !!res.live, result: res });
      return { result: { success: true, response: res } };
    } catch (err) {
      metrics.recordEvent({ event: 'bundle_submit_error', error: String(err) });
      return { result: { success: false, error: String(err) } };
    }
  }
}

export default BundleExecutor;

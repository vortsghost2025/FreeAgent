import Flashbots from '../core/execution/flashbots-submitter.js';

// This script demonstrates safe-send behavior while LIVE_SUBMIT is not enabled.
(async () => {
  const fakeFb = {
    simulate: async () => ({ ok: true, note: 'simulated' }),
    sendRawBundle: async () => ({ ok: true, txHash: '0xdeadbeef' })
  };

  const signedBundle = [{ raw: '0x00', meta: { expectedProfitEth: 0.1 } }];
  const targetBlock = 12345678;

  try {
    const res = await Flashbots.safeSendBundle(fakeFb, signedBundle, targetBlock);
    console.log('safeSendBundle result:', res);
  } catch (err) {
    console.error('safeSendBundle error:', String(err));
  }
})();

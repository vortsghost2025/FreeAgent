import BundleExecutor from '../core/execution/bundle-executor.js';

async function run() {
  // Provider shim implementing getBlockNumber and getFeeData
  const providerShim = {
    getBlockNumber: async () => 1000,
    getFeeData: async () => ({ gasPrice: 20n * 1000000000n })
  };

  // Create executor in submit mode but with autoSign to generate a test signedBundle
  const be = new BundleExecutor({ submit: true, provider: providerShim, autoSign: true });

  const bundle = await be.buildBundle({ tokens: ['WETH','USDC'], expectedProfitWei: 10000000000000000n });
  const sim = await be.simulateBundle(bundle);
  console.log('Bundle sim:', sim);

  // Set a fake Flashbots provider on the executor to avoid real network ops
  be._fb = {
    simulate: async () => ({ ok: true, note: 'simulated-by-fake' }),
    sendRawBundle: async (signed, target) => ({ ok: true, txHash: '0xfeedface' })
  };

  // Now demonstrate signing with an ephemeral wallet (test-only). Enable liveSign to allow signing.
  be.config.liveSign = true;
  const { Wallet } = await import('ethers');
  const ephemeral = Wallet.createRandom();
  const signed = await be.signBundleWithWallet(ephemeral, bundle);
  console.log('Signed bundle entries:', signed.length);

  // Submit: safeSendBundle will simulate and not send because LIVE_SUBMIT is unset
  const sub = await be.submitBundle(bundle);
  console.log('Submit result:', sub);
}

run().catch(e => console.error(e));

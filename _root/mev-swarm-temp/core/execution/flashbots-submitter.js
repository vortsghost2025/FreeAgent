/**
 * Flashbots submitter scaffold
 * - Provides a safe, opt-in interface to create a Flashbots provider and prepare/send bundles.
 * - This file intentionally avoids performing live submits unless explicitly requested by the caller.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function createFlashbotsProvider(ethersProvider, signingWallet) {
  // Try dynamic import of @flashbots/ethers-provider-bundle
  try {
    const { FlashbotsBundleProvider } = await import('@flashbots/ethers-provider-bundle');
    if (!ethersProvider || !signingWallet) {
      return { ready: false, error: 'ethersProvider and signingWallet required to initialize flashbots provider' };
    }

    const fb = await FlashbotsBundleProvider.create(ethersProvider, signingWallet);
    return { ready: true, provider: fb };
  } catch (err) {
    return {
      ready: false,
      error: 'flashbots package not installed or failed to initialize: ' + String(err)
    };
  }
}

export async function simulateBundle(fbProvider, signedBundle, blockNumber) {
  if (!fbProvider || !fbProvider.getBundleReceipt) {
    return { ok: false, note: 'Flashbots provider not available for simulation' };
  }

  try {
    const sim = await fbProvider.simulate(signedBundle, blockNumber);
    return { ok: true, result: sim };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendBundleDryRun(fbProvider, signedBundle, targetBlock) {
  // Do not send; run simulate or return prepared payload. This function is safe by default.
  return { dryRun: true, signedBundle, targetBlock };
}

export async function sendBundleLive(fbProvider, signedBundle, targetBlock) {
  // Safety guards: require explicit env opt-in
  const LIVE_SUBMIT = process.env.LIVE_SUBMIT === 'true';
  if (!LIVE_SUBMIT) {
    throw new Error('LIVE_SUBMIT is not enabled. Set LIVE_SUBMIT=true in environment to allow live submits');
  }

  if (!fbProvider || !fbProvider.sendRawBundle) {
    throw new Error('Flashbots provider not initialized; cannot send live bundle');
  }

  // Optional safety thresholds
  const MAX_LOSS_ETH = process.env.MAX_LOSS_ETH ? Number(process.env.MAX_LOSS_ETH) : null;

  if (MAX_LOSS_ETH !== null) {
    // Expect caller to have computed expectedProfit and pass as metadata on signedBundle[0].meta
    const meta = signedBundle?.[0]?.meta;
    const expectedProfit = meta?.expectedProfitEth ?? null;
    if (expectedProfit !== null && Number(expectedProfit) < -Math.abs(MAX_LOSS_ETH)) {
      throw new Error(`Expected profit ${expectedProfit} ETH is below max allowed loss ${MAX_LOSS_ETH} ETH`);
    }
  }

  // This will submit the bundle to flashbots. Caller MUST ensure preflight safety checks passed.
  const res = await fbProvider.sendRawBundle(signedBundle, targetBlock);
  return res;
}

/**
 * Safe send wrapper that performs a simulate step and only proceeds to live send when
 * `LIVE_SUBMIT=true` and optional thresholds are satisfied. Returns an object describing actions taken.
 */
export async function safeSendBundle(fbProvider, signedBundle, targetBlock) {
  // Simulate first if supported
  let simResult = null;
  try {
    if (fbProvider && fbProvider.simulate) {
      simResult = await fbProvider.simulate(signedBundle, targetBlock - 1);
    }
  } catch (e) {
    simResult = { error: String(e) };
  }

  // If LIVE_SUBMIT not enabled, return simulation result and don't send
  const LIVE_SUBMIT = process.env.LIVE_SUBMIT === 'true';
  if (!LIVE_SUBMIT) {
    return { live: false, simulated: true, simResult };
  }

  // Perform additional safety checks before live send
  const CIRCUIT_BREAKER = process.env.CIRCUIT_BREAKER === 'true';
  if (CIRCUIT_BREAKER) {
    throw new Error('Circuit breaker is enabled; aborting live submit');
  }

  // Delegate to sendBundleLive (which includes MAX_LOSS checks)
  const sendRes = await sendBundleLive(fbProvider, signedBundle, targetBlock);
  return { live: true, sent: sendRes, simResult };
}

export default {
  createFlashbotsProvider,
  simulateBundle,
  sendBundleDryRun,
  sendBundleLive
  ,safeSendBundle
};

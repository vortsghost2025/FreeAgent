import Flashbots from '../core/execution/flashbots-submitter.js';

(async () => {
  const fakeFb = { getBundleReceipt: null };
  // Dry run
  const dry = await Flashbots.sendBundleDryRun(null, [{raw: '0x00'}], 12345678);
  console.log('Flashbots dry run output:', dry);

  // Check scaffold create
  const created = await Flashbots.createFlashbotsProvider(null, null);
  console.log('Flashbots create result:', created);
})();

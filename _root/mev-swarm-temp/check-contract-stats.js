# REMOVED: sensitive data redacted by automated security cleanup
import 'dotenv/config';
import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const contract = new ethers.Contract(
    'REDACTED_ADDRESS',
    ['function getStats() view returns (uint256 totalExecuted, uint256 totalProfit, uint256 totalFailed, bool paused)'],
    wallet
  );

  try {
    const stats = await contract.getStats();

    console.log('═══ CONTRACT STATS ═══');
    console.log('Total Executed:', stats.totalExecuted.toString());
    console.log('Total Profit (ETH):', ethers.formatEther(stats.totalProfit));
    console.log('Total Failed:', stats.totalFailed.toString());
    console.log('Paused:', stats.paused);
    console.log('═══════════════════════╝\n');

    // Calculate profit in USD
    const profitEth = Number(ethers.formatEther(stats.totalProfit));
    const profitUsd = profitEth * 2500;
    console.log('Profit USD: $' + profitUsd.toFixed(2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);

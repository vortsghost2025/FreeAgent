import { ethers } from 'ethers';

export const SAFETY_CONFIG = {
  maxSingleTrade: ethers.parseEther('0.5'),
  maxDailyExposure: ethers.parseEther('5'),
  minProfitThreshold: ethers.parseEther('0.005'),
  maxGasPrice: ethers.parseUnits('50', 'gwei'),
  cooldownAfterLossMs: 60_000,
};

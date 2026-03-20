import { ethers } from 'ethers';

const MEMPOOL_TIERS = ['solo', 'contested', 'crowded'];

export function classifyMempoolContention({ uniqueTraceCount, duplicateTraceCount }) {
  if (duplicateTraceCount === 0) return 'solo';
  if (duplicateTraceCount < uniqueTraceCount) return 'contested';
  return 'crowded';
}

export function calcEvMetrics({ expectedProfitWei, gasCostWei, successRate, contention }) {
  const profit = BigInt(expectedProfitWei || 0n);
  const gas = BigInt(gasCostWei || 0n);

  const rate = Number.isFinite(successRate) ? successRate : 0.2;

  const baseEv = Number(profit - gas) * rate;
  const contentionPenalty = contention === 'crowded' ? 0.35 : contention === 'contested' ? 0.15 : 0;
  const effectiveEv = baseEv * (1 - contentionPenalty);

  const relative = profit > 0n ? Number(profit) / Number(gas + 1n) : 0;

  return {
    expectedProfitWei: profit,
    gasCostWei: gas,
    netWei: profit - gas,
    successRate: rate,
    contention,
    ev: effectiveEv,
    profitPerGas: relative,
  };
}

export function decisionFromScore({ ev, minEv = 0, thresholdBundle = 0.15, thresholdSkip = -0.15 }) {
  if (ev >= thresholdBundle) return 'EXECUTE_BUNDLE';
  if (ev > minEv) return 'EXECUTE';
  return 'SKIP';
}

export function evaluateOpportunityWithCompetition({
  expectedProfitWei,
  gasCostWei,
  successRate,
  contention,
  simulationVariance = 0.0,
}) {
  const metrics = calcEvMetrics({ expectedProfitWei, gasCostWei, successRate, contention });

  const variancePenalty = Math.max(0, Math.min(0.5, simulationVariance));
  const adjustedEv = metrics.ev * (1 - variancePenalty);

  const decision = decisionFromScore({ ev: adjustedEv });

  return {
    ...metrics,
    simulationVariance,
    adjustedEv,
    decision,
  };
}

export function describeDecision(decision) {
  if (decision === 'EXECUTE') return 'Standard execution path';
  if (decision === 'EXECUTE_BUNDLE') return 'Flashbots bundle lane due to contention';
  if (decision === 'SKIP') return 'Skip - low expected value / high competition';
  return 'Unknown';
}

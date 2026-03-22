export const GAS_STRATEGIES = {
  OBSERVE: {
    tipMultiplier: 0,
    maxGasPrice: 0,
    maxPriorityFee: 0,
    description: 'Watch only, no submission'
  },
  CONSERVATIVE: {
    tipMultiplier: 0.5,
    maxGasPrice: 30,
    maxPriorityFee: 1.0,
    description: 'Low cost, accept lower landing rate'
  },
  STANDARD: {
    tipMultiplier: 1.0,
    maxGasPrice: 80,
    maxPriorityFee: 2.5,
    description: 'Balanced cost/reliability'
  },
  AGGRESSIVE: {
    tipMultiplier: 2.0,
    maxGasPrice: 200,
    maxPriorityFee: 5.0,
    description: 'Max landing probability'
  }
};

export default GAS_STRATEGIES;

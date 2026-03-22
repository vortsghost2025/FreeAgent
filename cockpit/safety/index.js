/**
 * Safety Module - Iteration Governor
 * 
 * Exports:
 * - IterationGovernor: Main class for tracking and limiting agent iterations
 * - createIterationGovernor: Factory function
 */

const IterationGovernor = require('./iterationGovernor');

module.exports = {
  IterationGovernor,
  createIterationGovernor: IterationGovernor.createIterationGovernor
};

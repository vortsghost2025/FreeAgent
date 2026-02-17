// Small, pure helper utilities for the math library

import { isNumber, isFiniteNumber, validateFiniteNumbers } from './validation.js';

export { isNumber, isFiniteNumber };

export const clamp = (value, min, max) => {
  validateFiniteNumbers(value, min, max);
  if (min > max) {
    throw new RangeError('`min` must be <= `max`');
  }
  return Math.min(Math.max(value, min), max);
};

export const approxEqual = (a, b, eps = 1e-9) => {
  validateFiniteNumbers(a, b, eps);
  return Math.abs(a - b) <= Math.abs(eps);
};

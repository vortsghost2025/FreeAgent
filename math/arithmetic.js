import { validateFiniteNumbers } from './validation.js';

export const add = (a, b) => {
  validateFiniteNumbers(a, b);
  return a + b;
};

export const subtract = (a, b) => {
  validateFiniteNumbers(a, b);
  return a - b;
};

export const multiply = (a, b) => {
  validateFiniteNumbers(a, b);
  return a * b;
};

export const divide = (a, b) => {
  validateFiniteNumbers(a, b);
  if (b === 0) {
    throw new RangeError('Division by zero');
  }
  return a / b;
};

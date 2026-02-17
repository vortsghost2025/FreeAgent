// Shared, pure validation helpers for math modules

export const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);

export const isFiniteNumber = (v) => isNumber(v) && Number.isFinite(v);

export const validateFiniteNumbers = (...vals) => {
  for (const v of vals) {
    if (!isFiniteNumber(v)) {
      throw new TypeError('Expected finite number(s)');
    }
  }
};

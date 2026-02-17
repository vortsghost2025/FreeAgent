import { isNumber, isFiniteNumber, validateFiniteNumbers, clamp, approxEqual } from '../utils.js';

describe('utils', () => {
  test('isNumber and isFiniteNumber (arrange/act/assert)', () => {
    // arrange
    const a = 5;
    const b = NaN;
    const c = '5';
    // act/assert
    expect(isNumber(a)).toBe(true);
    expect(isFiniteNumber(a)).toBe(true);
    expect(isNumber(b)).toBe(false);
    expect(isNumber(c)).toBe(false);
  });

  test('validateFiniteNumbers throws on invalid input', () => {
    // arrange/act/assert
    expect(() => validateFiniteNumbers(1, NaN)).toThrow(TypeError);
  });

  test('clamp enforces bounds and validates arguments', () => {
    // arrange
    // act/assert
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(() => clamp(1, 5, 2)).toThrow(RangeError);
  });

  test('approxEqual recognizes numerical closeness', () => {
    // arrange
    const a = 0.1 + 0.2;
    const b = 0.3;
    // act/assert
    expect(approxEqual(a, b, 1e-9)).toBe(true);
  });
});

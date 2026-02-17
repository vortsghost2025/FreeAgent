import { add, subtract, multiply, divide } from '../arithmetic.js';

describe('arithmetic', () => {
  test('add, subtract, multiply (arrange/act/assert)', () => {
    // arrange
    const a = 1;
    const b = 2;
    // act/assert
    expect(add(a, b)).toBe(3);
    expect(subtract(5, 3)).toBe(2);
    expect(multiply(3, 4)).toBe(12);
  });

  test('divide and division-by-zero handling', () => {
    // arrange/act/assert
    expect(divide(10, 2)).toBe(5);
    expect(() => divide(1, 0)).toThrow(RangeError);
  });

  test('operations validate inputs', () => {
    // arrange/act/assert
    expect(() => add(1, NaN)).toThrow(TypeError);
  });
});

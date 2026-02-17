import defaultExport, * as named from '../index.js';

describe('index aggregation', () => {
  test('default export contains core functions (arrange/act/assert)', () => {
    // arrange/act/assert
    expect(typeof defaultExport.add).toBe('function');
    expect(defaultExport.add(2, 3)).toBe(5);
    expect(defaultExport.areaOfCircle(1)).toBeCloseTo(Math.PI);
  });

  test('named exports are available and functional', () => {
    // arrange/act/assert
    expect(typeof named.add).toBe('function');
    expect(named.divide(10, 2)).toBe(5);
  });
});

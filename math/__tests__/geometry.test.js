import { areaOfCircle, circumference, areaOfRectangle, perimeterOfRectangle } from '../geometry.js';

describe('geometry', () => {
  test('circle area and circumference (arrange/act/assert)', () => {
    // arrange
    const r = 1;
    // act/assert
    expect(areaOfCircle(r)).toBeCloseTo(Math.PI);
    expect(circumference(r)).toBeCloseTo(2 * Math.PI);
  });

  test('rectangle area and perimeter', () => {
    // arrange/act/assert
    expect(areaOfRectangle(2, 3)).toBe(6);
    expect(perimeterOfRectangle(2, 3)).toBe(10);
  });

  test('negative dimensions throw', () => {
    // arrange/act/assert
    expect(() => areaOfCircle(-1)).toThrow(RangeError);
    expect(() => areaOfRectangle(-1, 2)).toThrow(RangeError);
  });
});

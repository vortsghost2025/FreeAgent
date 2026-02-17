import { validateFiniteNumbers } from './validation.js';

export const areaOfCircle = (radius) => {
  validateFiniteNumbers(radius);
  if (radius < 0) throw new RangeError('radius must be non-negative');
  return Math.PI * radius * radius;
};

export const circumference = (radius) => {
  validateFiniteNumbers(radius);
  if (radius < 0) throw new RangeError('radius must be non-negative');
  return 2 * Math.PI * radius;
};

export const areaOfRectangle = (width, height) => {
  validateFiniteNumbers(width, height);
  if (width < 0 || height < 0) throw new RangeError('dimensions must be non-negative');
  return width * height;
};

export const perimeterOfRectangle = (width, height) => {
  validateFiniteNumbers(width, height);
  if (width < 0 || height < 0) throw new RangeError('dimensions must be non-negative');
  return 2 * (width + height);
};

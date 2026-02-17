export * from './utils.js';
export * from './arithmetic.js';
export * from './geometry.js';

import * as utils from './utils.js';
import * as arithmetic from './arithmetic.js';
import * as geometry from './geometry.js';

const all = { ...utils, ...arithmetic, ...geometry };
export default all;

import('../core/data/reserve-cache.js').then(m => {
  console.log('ReserveCache imported OK');
}).catch(e => {
  console.error('ReserveCache import FAILED', e);
  process.exit(2);
});

import('../core/data/mempool-stream.js').then(m => {
  console.log('MempoolStream imported OK');
}).catch(e => {
  console.error('MempoolStream import FAILED', e);
  process.exit(3);
});

// wait a bit to allow async messages to flush
setTimeout(() => process.exit(0), 250);

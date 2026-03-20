import fs from 'fs';

const logFile = 'C:\\workspace\\medical\\mev-swarm\\bot-output.log';

console.log('Watching bot output...\n');

// Watch for new lines
const tail = fs.createReadStream(logFile, { encoding: 'utf8', start: 0 });

tail.on('data', (chunk) => {
  // Remove unicode/emojis - keep only printable ASCII
  const clean = chunk.toString().replace(/[^\x20-\x7E]/g, '');
  console.log(clean);
});

tail.on('error', (err) => {
  console.error('Error reading log:', err);
});

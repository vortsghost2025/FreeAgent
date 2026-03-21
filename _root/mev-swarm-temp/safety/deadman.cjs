const fs = require('fs');
const path = require('path');

// Dead-man switch helper (CommonJS).
// Arm by creating a file named DEADMAN_ARMED at the repository root
// or by setting the environment variable DEADMAN_ARMED=true.

function isArmed() {
  if (process.env.DEADMAN_ARMED && process.env.DEADMAN_ARMED.toLowerCase() === 'true') return true;
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const marker = path.join(repoRoot, 'DEADMAN_ARMED');
    return fs.existsSync(marker);
  } catch (e) {
    return false;
  }
}

module.exports = { isArmed };

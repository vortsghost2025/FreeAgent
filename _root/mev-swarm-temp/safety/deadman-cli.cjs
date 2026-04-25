#!/usr/bin/env node
// deadman-cli.cjs - small CLI to arm/disarm/inspect the dead-man marker
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const marker = path.join(repoRoot, 'DEADMAN_ARMED');

function usage() {
  console.log('Usage: deadman-cli.cjs [status|arm|disarm]');
  process.exit(2);
}

const cmd = process.argv[2] || 'status';
if (cmd === 'status') {
  const envArmed = (process.env.DEADMAN_ARMED || '').toLowerCase() === 'true';
  const fileArmed = fs.existsSync(marker);
  console.log(envArmed || fileArmed ? 'ARMED' : 'DISARMED');
  process.exit(0);
} else if (cmd === 'arm') {
  try {
    fs.writeFileSync(marker, new Date().toISOString());
    console.log('ARMED');
    process.exit(0);
  } catch (e) {
    console.error('Failed to arm deadman:', e && e.message ? e.message : e);
    process.exit(1);
  }
} else if (cmd === 'disarm') {
  try {
    if (fs.existsSync(marker)) fs.unlinkSync(marker);
    console.log('DISARMED');
    process.exit(0);
  } catch (e) {
    console.error('Failed to disarm deadman:', e && e.message ? e.message : e);
    process.exit(1);
  }
} else {
  usage();
}

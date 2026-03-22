import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'exec_log.ndjson');

function ensureDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export function recordEvent(obj) {
  try {
    ensureDir();
    const line = JSON.stringify({ ts: Date.now(), ...obj });
    fs.appendFileSync(LOG_FILE, line + '\n', { encoding: 'utf8' });
  } catch (e) {
    // best-effort logging
    console.error('metrics.recordEvent error', e);
  }
}

export default { recordEvent };

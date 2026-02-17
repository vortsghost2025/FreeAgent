// Structured Logging & Metrics Foundation
const levels = ['debug', 'info', 'warn', 'error'];

export function log(level, msg, meta = {}) {
  if (!levels.includes(level)) level = 'info';
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta
  };
  console.log(JSON.stringify(entry));
}

export function metric(name, value, meta = {}) {
  log('info', `metric:${name}`, { value, ...meta });
}

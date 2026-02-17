// Event Tap: Hooks into all orchestration events
const listeners = [];

export function tapEvent(fn) {
  listeners.push(fn);
}

export function emitEvent(event, data) {
  for (const fn of listeners) fn(event, data);
}

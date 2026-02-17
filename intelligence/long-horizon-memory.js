// Long-Horizon Memory
// Stores historical metrics, topology shifts, failure patterns, plugin behavior, routing outcomes, optimization deltas

export class LongHorizonMemory {
  constructor() {
    this.history = [];
  }

  record(event) {
    this.history.push({ ...event, ts: new Date().toISOString() });
  }

  query(filterFn) {
    return this.history.filter(filterFn);
  }

  getAll() {
    return this.history;
  }
}

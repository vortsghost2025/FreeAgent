const crypto = require('crypto');

/**
 * Deterministically hash a compact snapshot and runtime state subset.
 * @param {Object} snapshot - The compact snapshot object.
 * @param {Object} runtimeStateSubset - Subset of runtime state relevant for continuity.
 * @returns {string} SHA-256 hash as hex string.
 */
function hashContinuity(snapshot, runtimeStateSubset) {
  // Ensure deterministic JSON stringification by sorting keys
  const deterministicStringify = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    const keys = Object.keys(obj).sort();
    const entries = keys.map(key => {
      const value = obj[key];
      return JSON.stringify(key) + ':' + deterministicStringify(value);
    });
    return '{' + entries.join(',') + '}';
  };

  const snapshotStr = deterministicStringify(snapshot);
  const runtimeStr = deterministicStringify(runtimeStateSubset);
  const combined = snapshotStr + '|' + runtimeStr;

  const hash = crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
  return hash;
}

module.exports = { hashContinuity };
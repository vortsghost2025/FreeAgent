/**
 * Phase 8.4: Compliance Evidence Ledger
 * Maintains tamper-evident evidence chains for autonomous release decisions.
 */

import crypto from 'node:crypto';

export class ComplianceEvidenceLedger {
  constructor() {
    this.entries = [];
  }

  appendEvidence(eventType, releaseId, payload = {}) {
    const prevHash = this.entries.length > 0 ? this.entries[this.entries.length - 1].hash : 'GENESIS';
    const entry = {
      index: this.entries.length,
      eventType,
      releaseId,
      payload,
      timestamp: Date.now(),
      prevHash
    };

    entry.hash = this._hashEntry(entry);
    this.entries.push(entry);

    return { success: true, entry: { ...entry } };
  }

  verifyIntegrity() {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedPrevHash = i === 0 ? 'GENESIS' : this.entries[i - 1].hash;
      const expectedHash = this._hashEntry({
        index: entry.index,
        eventType: entry.eventType,
        releaseId: entry.releaseId,
        payload: entry.payload,
        timestamp: entry.timestamp,
        prevHash: expectedPrevHash
      });

      if (entry.prevHash !== expectedPrevHash || entry.hash !== expectedHash) {
        return {
          valid: false,
          failedAtIndex: i,
          reason: 'HASH_CHAIN_MISMATCH'
        };
      }
    }

    return { valid: true, entries: this.entries.length };
  }

  getEntriesByRelease(releaseId) {
    return this.entries.filter((entry) => entry.releaseId === releaseId).map((entry) => ({ ...entry }));
  }

  getRecentEntries(limit = 20) {
    const safeLimit = Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : 20);
    return this.entries.slice(-safeLimit).map((entry) => ({ ...entry }));
  }

  getSummary() {
    const byEventType = {};
    for (const entry of this.entries) {
      byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      byEventType,
      integrity: this.verifyIntegrity()
    };
  }

  _hashEntry(entry) {
    const canonical = JSON.stringify({
      index: entry.index,
      eventType: entry.eventType,
      releaseId: entry.releaseId,
      payload: entry.payload,
      timestamp: entry.timestamp,
      prevHash: entry.prevHash
    });

    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}

export default {
  ComplianceEvidenceLedger
};


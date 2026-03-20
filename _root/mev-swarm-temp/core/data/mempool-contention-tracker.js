import { EventEmitter } from 'events';

export class MempoolContentionTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      txTTL: 60_000,
      snapshotInterval: 5_000,
      maxEntries: 50_000,
      arbSelectors: new Set([
        '0x38ed1739', '0x8803dbee', '0x5ae401dc', '0x414bf389', '0xc04b8d59',
        '0xdb3e2198', '0xf28c0498', '0xb6f9de95', '0x7ff36ab5'
      ]),
      ...config
    };

    this.pathWatchers = new Map();
    this.pendingTxs = new Map();
    this.senderProfiles = new Map();
    this.pathContention = new Map();

    this.cleanupInterval = setInterval(() => this.prune(), 10_000);
    this.snapshotInterval = setInterval(() => this.emitSnapshot(), this.config.snapshotInterval);
  }

  processTx(tx) {
    if (!tx || !tx.data || tx.data.length < 10) return null;

    const selector = tx.data.slice(0, 10).toLowerCase();
    if (!this.config.arbSelectors.has(selector)) return null;

    const txHash = tx.hash?.toLowerCase();
    if (!txHash || this.pendingTxs.has(txHash)) return null;

    const pathSig = this.extractPathSignature(tx, selector);
    if (!pathSig) return null;

    const entry = {
      hash: txHash,
      from: tx.from?.toLowerCase(),
      to: tx.to?.toLowerCase(),
      selector,
      gasPrice: BigInt(tx.gasPrice || tx.maxFeePerGas || 0),
      gasLimit: BigInt(tx.gasLimit || 0),
      value: BigInt(tx.value || 0),
      pathSignature: pathSig,
      decodedPath: this.decodePathFromCalldata(tx, selector),
      timestamp: Date.now(),
    };

    this.pendingTxs.set(txHash, entry);
    this.updateSenderProfile(entry);
    const contention = this.updatePathContention(entry);

    this.emit('txProcessed', { tx: entry, contention });
    return contention;
  }

  extractPathSignature(tx, selector) {
    try {
      const data = tx.data;
      const contractAddr = tx.to?.toLowerCase() || '';
      const addresses = [];
      const addrRegex = /0x[0-9a-fA-F]{40}/g;
      let match;
      const dataWithSelector = data;
      while ((match = addrRegex.exec(dataWithSelector)) !== null) {
        const addr = match[0].toLowerCase();
        if (addr !== contractAddr && addr !== '0x0000000000000000000000000000000000000000') {
          addresses.push(addr);
        }
      }
      if (addresses.length < 2) return null;
      const unique = [...new Set(addresses)].sort();
      return `${contractAddr}:${unique.join('-')}`;
    } catch {
      return null;
    }
  }

  decodePathFromCalldata(tx, selector) {
    try {
      const data = tx.data;
      const v2Selectors = new Set(['0x38ed1739', '0x8803dbee', '0xb6f9de95', '0x7ff36ab5']);
      if (v2Selectors.has(selector)) {
        const pathHex = data.slice(164);
        const pathLength = parseInt(pathHex.slice(64, 128), 16);
        const addresses = [];
        for (let i = 0; i < pathLength; i++) {
          const start = 128 + i * 64;
          const addr = '0x' + pathHex.slice(start + 24, start + 64);
          addresses.push(addr.toLowerCase());
        }
        return addresses;
      }
      return null;
    } catch {
      return null;
    }
  }

  updateSenderProfile(entry) {
    const addr = entry.from;
    if (!addr) return;
    let profile = this.senderProfiles.get(addr);
    if (!profile) {
      profile = {
        address: addr,
        txCount: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        paths: new Set(),
        selectors: new Set(),
        avgGasPrice: 0n,
        gasPrices: [],
        isLikelyBot: false,
        classification: 'UNKNOWN',
      };
      this.senderProfiles.set(addr, profile);
    }

    profile.txCount++;
    profile.lastSeen = Date.now();
    profile.paths.add(entry.pathSignature);
    profile.selectors.add(entry.selector);
    profile.gasPrices.push(entry.gasPrice);

    const sum = profile.gasPrices.reduce((a, b) => a + b, 0n);
    profile.avgGasPrice = sum / BigInt(profile.gasPrices.length);

    if (profile.txCount >= 5) {
      profile.isLikelyBot = profile.gasPrices.length >= 5 && profile.selectors.size >= 2;
      profile.classification = this.classifySender(profile);
    }
  }

  classifySender(profile) {
    if (profile.avgGasPrice > 50_000_000_000n && profile.paths.size >= 3) return 'MEV_BOT';
    if (profile.paths.size >= 5) return 'ARB_SCANNER';
    if (profile.avgGasPrice > 100_000_000_000n) return 'FRONTRUNNER';
    return 'UNKNOWN';
  }

  updatePathContention(entry) {
    const sig = entry.pathSignature;
    let contention = this.pathContention.get(sig);
    if (!contention) {
      contention = {
        pathSignature: sig,
        attempts: [],
        gasEscalation: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        uniqueSenders: new Set(),
        competitorClassifications: {},
        contentionLevel: 'SOLO',
      };
      this.pathContention.set(sig, contention);
    }

    contention.attempts.push({ txHash: entry.hash, sender: entry.from, gasPrice: entry.gasPrice, timestamp: entry.timestamp });
    contention.uniqueSenders.add(entry.from);
    contention.lastSeen = Date.now();

    if (contention.attempts.length >= 2) {
      const recent = contention.attempts.slice(-10);
      const prices = recent.map(a => a.gasPrice);
      const maxPrice = prices.reduce((a, b) => a > b ? a : b);
      const minPrice = prices.reduce((a, b) => a < b ? a : b);
      contention.gasEscalation.push({ timestamp: Date.now(), minGas: minPrice, maxGas: maxPrice, spread: maxPrice - minPrice, attemptCount: contention.attempts.length, uniqueSenders: contention.uniqueSenders.size });
      if (contention.gasEscalation.length > 1000) contention.gasEscalation = contention.gasEscalation.slice(-500);
    }

    for (const sender of contention.uniqueSenders) {
      const profile = this.senderProfiles.get(sender);
      if (profile) contention.competitorClassifications[profile.classification] = (contention.competitorClassifications[profile.classification] || 0) + 1;
    }

    contention.contentionLevel = this.computeContentionLevel(contention);
    return this.getContentionSnapshot(contention);
  }

  computeContentionLevel(contention) {
    const uniqueCount = contention.uniqueSenders.size;
    const hasEscalation = contention.gasEscalation.length >= 2 && contention.gasEscalation.at(-1)?.spread > 0n;
    const hasBots = Object.keys(contention.competitorClassifications).some(c => ['MEV_BOT', 'FRONTRUNNER'].includes(c));
    if (uniqueCount === 0) return 'SOLO';
    if (uniqueCount === 1 && !hasBots) return 'SOLO';
    if (uniqueCount <= 2 && !hasEscalation) return 'CONTESTED_LIGHT';
    if (uniqueCount <= 3 || (hasEscalation && !hasBots)) return 'CONTESTED';
    if (hasBots && hasEscalation) return 'CROWDED_HOSTILE';
    if (hasBots) return 'CROWDED';
    return 'CROWDED';
  }

  getPathContention(pathSignature) {
    const contention = this.pathContention.get(pathSignature);
    if (!contention) return { level: 'SOLO', competitors: 0 };
    return this.getContentionSnapshot(contention);
  }

  getContentionSnapshot(contention) {
    const recentWindow = Date.now() - 30_000;
    const recentAttempts = contention.attempts.filter(a => a.timestamp > recentWindow);
    return {
      level: contention.contentionLevel,
      competitors: contention.uniqueSenders.size,
      recentAttempts: recentAttempts.length,
      gasEscalation: this.computeEscalationMetrics(contention),
      competitorBreakdown: { ...contention.competitorClassifications },
      recommendation: this.getRecommendation(contention),
    };
  }

  computeEscalationMetrics(contention) {
    const timeline = contention.gasEscalation;
    if (timeline.length < 2) return { trend: 'STABLE', velocity: 0 };
    const recent = timeline.slice(-5);
    const first = recent[0];
    const last = recent.at(-1);
    const gasDelta = Number(last.maxGas - first.maxGas);
    const timeDelta = last.timestamp - first.timestamp;
    const velocity = timeDelta > 0 ? gasDelta / timeDelta : 0;
    let trend = 'STABLE';
    if (velocity > 1_000_000) trend = 'ESCALATING_FAST';
    else if (velocity > 100_000) trend = 'ESCALATING';
    return { trend, velocity, currentMax: last.maxGas.toString(), currentSpread: last.spread.toString(), uniqueCompetitors: last.uniqueSenders };
  }

  getRecommendation(contention) {
    switch (contention.contentionLevel) {
      case 'SOLO': return { action: 'EXECUTE', gasMultiplier: 1.0, note: 'No competition detected' };
      case 'CONTESTED_LIGHT': return { action: 'EXECUTE', gasMultiplier: 1.2, note: 'One competitor, slight edge recommended' };
      case 'CONTESTED': return { action: 'EXECUTE_BUNDLE', gasMultiplier: 1.5, note: 'Multiple competitors, use bundle lane' };
      case 'CROWDED': return { action: 'EXECUTE_BUNDLE', gasMultiplier: 2.0, note: 'Heavy competition, high-priority bundle' };
      case 'CROWDED_HOSTILE': return { action: 'SKIP', gasMultiplier: 0, note: 'Known MEV bots competing, likely unprofitable' };
      default: return { action: 'SKIP', gasMultiplier: 0, note: 'Unknown contention state' };
    }
  }

  getGlobalContention() {
    const summary = { totalPaths: this.pathContention.size, totalPendingTxs: this.pendingTxs.size, totalKnownSenders: this.senderProfiles.size, byLevel: { SOLO: 0, CONTESTED_LIGHT: 0, CONTESTED: 0, CROWDED: 0, CROWDED_HOSTILE: 0 }, botCount: 0, hottestPaths: [] };
    for (const [sig, contention] of this.pathContention) summary.byLevel[contention.contentionLevel]++;
    for (const [addr, profile] of this.senderProfiles) if (profile.isLikelyBot) summary.botCount++;
    const sorted = [...this.pathContention.entries()].sort((a, b) => b[1].uniqueSenders.size - a[1].uniqueSenders.size).slice(0, 10);
    summary.hottestPaths = sorted.map(([sig, c]) => ({ path: sig, contenders: c.uniqueSenders.size, level: c.contentionLevel, gasTrend: this.computeEscalationMetrics(c).trend }));
    return summary;
  }

  watchPaths(pathSignatures) { for (const sig of pathSignatures) { if (!this.pathWatchers.has(sig)) { this.pathWatchers.set(sig, new Set()); if (!this.pathContention.has(sig)) this.pathContention.set(sig, { pathSignature: sig, attempts: [], gasEscalation: [], firstSeen: Date.now(), lastSeen: Date.now(), uniqueSenders: new Set(), competitorClassifications: {}, contentionLevel: 'SOLO' }); } } }

  prune() {
    const now = Date.now();
    const ttl = this.config.txTTL;
    for (const [hash, tx] of this.pendingTxs) if (now - tx.timestamp > ttl) this.pendingTxs.delete(hash);
    for (const [sig, contention] of this.pathContention) { if (now - contention.lastSeen > ttl * 2 && !this.pathWatchers.has(sig)) this.pathContention.delete(sig); else contention.attempts = contention.attempts.filter(a => now - a.timestamp < ttl); }
    if (this.pendingTxs.size > this.config.maxEntries) { const entries = [...this.pendingTxs.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp); const toRemove = entries.slice(0, entries.length - this.config.maxEntries); for (const [hash] of toRemove) this.pendingTxs.delete(hash); }
  }

  emitSnapshot() { this.emit('contentionSnapshot', this.getGlobalContention()); }

  destroy() { clearInterval(this.cleanupInterval); clearInterval(this.snapshotInterval); this.removeAllListeners(); }
}
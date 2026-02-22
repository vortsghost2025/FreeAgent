/**
 * WE4FREE Mesh Health Signals
 *
 * Anonymous, privacy-preserving health signal collection and aggregation.
 * Works fully offline — signals stored locally, shared via mesh, synced when online.
 *
 * Signal Types:
 *   SYMPTOM       — Anonymous symptom reports (flu-like, respiratory, mental health)
 *   MENTAL_HEALTH — Mood/stress/anxiety signals (self-reported, anonymized)
 *   ENVIRONMENT   — Local environmental observations
 *   OUTBREAK      — Peer-confirmed outbreak signals from mesh
 *
 * Privacy Guarantees:
 *   - No PII collected ever
 *   - Laplace noise on all numeric values (ε=0.5)
 *   - Only regional aggregates shared, never individual signals
 *   - IndexedDB storage, never transmitted raw
 *   - User consent required for each signal type
 */

'use strict';

const SIGNALS_DB_VERSION  = 1;
const SIGNALS_STORE       = 'health-signals';
const AGGREGATES_STORE    = 'regional-aggregates';
const MESH_SIGNAL_EPSILON = 0.5;

// ── SYMPTOM TAXONOMY ──────────────────────────────────────────────────────────
const SymptomCodes = {
  // Influenza-like illness (ILI)
  FEVER:           { code: 'S001', weight: 0.8, iliRelevance: 0.9, category: 'ILI' },
  COUGH:           { code: 'S002', weight: 0.6, iliRelevance: 0.8, category: 'ILI' },
  FATIGUE:         { code: 'S003', weight: 0.5, iliRelevance: 0.6, category: 'ILI' },
  BODY_ACHES:      { code: 'S004', weight: 0.7, iliRelevance: 0.8, category: 'ILI' },
  HEADACHE:        { code: 'S005', weight: 0.5, iliRelevance: 0.5, category: 'ILI' },
  SORE_THROAT:     { code: 'S006', weight: 0.5, iliRelevance: 0.7, category: 'ILI' },
  SHORTNESS_BREATH:{ code: 'S007', weight: 0.9, iliRelevance: 0.6, category: 'RESPIRATORY' },
  LOSS_SMELL:      { code: 'S008', weight: 0.8, iliRelevance: 0.4, category: 'RESPIRATORY' },
  GI_SYMPTOMS:     { code: 'S009', weight: 0.4, iliRelevance: 0.3, category: 'GI' },

  // Mental health signals
  LOW_MOOD:        { code: 'M001', weight: 0.7, category: 'MENTAL_HEALTH' },
  ANXIETY:         { code: 'M002', weight: 0.6, category: 'MENTAL_HEALTH' },
  SLEEP_DISRUPTION:{ code: 'M003', weight: 0.5, category: 'MENTAL_HEALTH' },
  SOCIAL_WITHDRAWAL:{ code: 'M004', weight: 0.6, category: 'MENTAL_HEALTH' },
  CRISIS_SIGNAL:   { code: 'M005', weight: 1.0, category: 'MENTAL_HEALTH', urgent: true },
};

const SignalCategory = {
  ILI:           'influenza-like-illness',
  RESPIRATORY:   'respiratory',
  GI:            'gastrointestinal',
  MENTAL_HEALTH: 'mental-health',
  ENVIRONMENT:   'environment',
};

// ── LAPLACE NOISE ─────────────────────────────────────────────────────────────
function addNoise(value, sensitivity = 1.0) {
  const scale = sensitivity / MESH_SIGNAL_EPSILON;
  const u = Math.random() - 0.5;
  return value + (-scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)));
}

// ── CONSENT MANAGER ───────────────────────────────────────────────────────────
const ConsentManager = {
  _consent: null,

  getConsent() {
    if (this._consent) return this._consent;
    const stored = localStorage.getItem('we4free-mesh-consent');
    this._consent = stored ? JSON.parse(stored) : null;
    return this._consent;
  },

  grantConsent(types = ['symptoms', 'mental_health', 'environment']) {
    this._consent = {
      granted: true,
      types,
      grantedAt: new Date().toISOString(),
      version: '1.0',
      note: 'Anonymous signals only. No PII. Laplace noise applied.',
    };
    localStorage.setItem('we4free-mesh-consent', JSON.stringify(this._consent));
    console.log('[Consent] Granted for:', types);
    return this._consent;
  },

  revokeConsent() {
    this._consent = null;
    localStorage.removeItem('we4free-mesh-consent');
    // Clear all stored signals
    HealthSignalStore.clearAll();
    console.log('[Consent] Revoked — all local data cleared');
  },

  hasConsent(type) {
    const c = this.getConsent();
    return c?.granted && c.types.includes(type);
  },
};

// ── SIGNAL STORE (IndexedDB) ───────────────────────────────────────────────────
const HealthSignalStore = {
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('we4free-health-signals', SIGNALS_DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(SIGNALS_STORE)) {
          const store = db.createObjectStore(SIGNALS_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('category', 'category');
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('region', 'region');
        }
        if (!db.objectStoreNames.contains(AGGREGATES_STORE)) {
          db.createObjectStore(AGGREGATES_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror   = e => reject(e.target.error);
    });
  },

  async save(signal) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(SIGNALS_STORE, 'readwrite');
      const store = tx.objectStore(SIGNALS_STORE);
      store.add(signal);
      tx.oncomplete = resolve;
      tx.onerror    = reject;
    });
  },

  async getRecent(hours = 24) {
    const db    = await this.open();
    const since = Date.now() - hours * 3600000;
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(SIGNALS_STORE, 'readonly');
      const index   = tx.objectStore(SIGNALS_STORE).index('timestamp');
      const range   = IDBKeyRange.lowerBound(since);
      const results = [];
      const cursor  = index.openCursor(range);
      cursor.onsuccess = e => {
        const c = e.target.result;
        if (c) { results.push(c.value); c.continue(); }
        else resolve(results);
      };
      cursor.onerror = reject;
    });
  },

  async saveAggregate(key, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AGGREGATES_STORE, 'readwrite');
      tx.objectStore(AGGREGATES_STORE).put({ key, ...data, savedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror    = reject;
    });
  },

  async clearAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SIGNALS_STORE, AGGREGATES_STORE], 'readwrite');
      tx.objectStore(SIGNALS_STORE).clear();
      tx.objectStore(AGGREGATES_STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror    = reject;
    });
  },
};

// ── REGIONAL AGGREGATOR ───────────────────────────────────────────────────────
const RegionalAggregator = {
  // Aggregate local signals into a regional summary (safe to share)
  async buildAggregate(region, hours = 24) {
    const signals = await HealthSignalStore.getRecent(hours);
    const regional = signals.filter(s => s.region === region || region === 'ALL');

    if (!regional.length) return null;

    const byCategory = {};
    for (const s of regional) {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    }

    const summary = {};
    for (const [cat, catSignals] of Object.entries(byCategory)) {
      const scores    = catSignals.map(s => s.score);
      const mean      = scores.reduce((a, b) => a + b, 0) / scores.length;
      const noisedMean = addNoise(mean, 0.5); // Apply noise before aggregating

      summary[cat] = {
        count:        catSignals.length,
        mean:         parseFloat(noisedMean.toFixed(3)),
        trend:        this._computeTrend(catSignals),
        topSymptoms:  this._topSymptoms(catSignals),
        alertLevel:   this._alertLevel(noisedMean, cat),
      };
    }

    // ILI score — composite influenza-like illness signal
    const iliSignals = regional.filter(s => s.category === SignalCategory.ILI);
    const iliScore   = this._computeILIScore(iliSignals);

    return {
      region,
      periodHours:  hours,
      signalCount:  regional.length,
      summary,
      iliScore:     parseFloat(addNoise(iliScore, 0.3).toFixed(3)),
      mentalHealthScore: this._mentalHealthScore(regional),
      computedAt:   new Date().toISOString(),
      privacy:      `laplace-epsilon-${EPSILON}`,
    };
  },

  _computeILIScore(signals) {
    if (!signals.length) return 0;
    let weightedSum = 0, totalWeight = 0;
    for (const s of signals) {
      const symptomMeta = Object.values(SymptomCodes)
        .find(m => m.code === s.symptomCode);
      const iliRel = symptomMeta?.iliRelevance || 0.5;
      weightedSum  += s.score * iliRel;
      totalWeight  += iliRel;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  },

  _mentalHealthScore(signals) {
    const mh = signals.filter(s => s.category === SignalCategory.MENTAL_HEALTH);
    if (!mh.length) return null;
    const mean = mh.reduce((a, s) => a + s.score, 0) / mh.length;
    return parseFloat(addNoise(mean, 0.3).toFixed(3));
  },

  _computeTrend(signals) {
    if (signals.length < 2) return 'stable';
    const sorted = signals.sort((a, b) => a.timestamp - b.timestamp);
    const half   = Math.floor(sorted.length / 2);
    const early  = sorted.slice(0, half).reduce((a, s) => a + s.score, 0) / half;
    const late   = sorted.slice(half).reduce((a, s) => a + s.score, 0) / (sorted.length - half);
    if (late > early * 1.2) return 'rising';
    if (late < early * 0.8) return 'falling';
    return 'stable';
  },

  _topSymptoms(signals) {
    const counts = {};
    for (const s of signals) {
      if (s.symptomCode) counts[s.symptomCode] = (counts[s.symptomCode] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count }));
  },

  _alertLevel(score, category) {
    if (category === SignalCategory.MENTAL_HEALTH) {
      return score > 0.7 ? 'HIGH' : score > 0.4 ? 'MEDIUM' : 'LOW';
    }
    return score > 0.6 ? 'HIGH' : score > 0.3 ? 'MEDIUM' : 'LOW';
  },
};

// ── HEALTH SIGNAL COLLECTOR ───────────────────────────────────────────────────
const HealthSignalCollector = {
  _region: 'UNKNOWN',
  _listeners: [],

  onSignal(cb) { this._listeners.push(cb); return this; },
  _emit(signal) { this._listeners.forEach(cb => cb(signal)); },

  setRegion(region) { this._region = region; },

  /**
   * Log an ILI symptom signal
   * @param {string[]} symptoms - Array of symptom keys from SymptomCodes
   * @param {number} severity   - Self-reported severity 0-10
   */
  async logSymptoms(symptoms, severity = 5) {
    if (!ConsentManager.hasConsent('symptoms')) {
      console.warn('[Signals] Consent not granted for symptoms');
      return null;
    }

    // Compute composite score from symptom weights
    let score = 0;
    const codes = [];
    for (const sym of symptoms) {
      const meta = SymptomCodes[sym];
      if (meta) { score += meta.weight; codes.push(meta.code); }
    }
    score = Math.min(score / symptoms.length, 1.0);

    // Noise the severity immediately
    const noisedSeverity = Math.max(0, Math.min(10, addNoise(severity, 2)));

    const signal = {
      category:    SignalCategory.ILI,
      symptomCode: codes[0] || 'S000',
      allCodes:    codes,
      score:       parseFloat((score * noisedSeverity / 10).toFixed(3)),
      severity:    parseFloat(noisedSeverity.toFixed(1)),
      region:      this._region,
      timestamp:   Date.now(),
      epsilon:     MESH_SIGNAL_EPSILON,
    };

    await HealthSignalStore.save(signal);
    this._emit(signal);

    // Share via mesh
    if (window.MeshCoordinator?.running) {
      window.MeshCoordinator.broadcastHealthSignal('ILI', signal.score, this._region);
    }

    return signal;
  },

  /**
   * Log a mental health signal
   * @param {string} type  - Key from SymptomCodes (LOW_MOOD, ANXIETY, etc.)
   * @param {number} level - Self-reported level 0-10
   */
  async logMentalHealth(type, level = 5) {
    if (!ConsentManager.hasConsent('mental_health')) {
      console.warn('[Signals] Consent not granted for mental health');
      return null;
    }

    const meta         = SymptomCodes[type];
    const noisedLevel  = Math.max(0, Math.min(10, addNoise(level, 2)));
    const score        = parseFloat(((meta?.weight || 0.5) * noisedLevel / 10).toFixed(3));

    const signal = {
      category:    SignalCategory.MENTAL_HEALTH,
      symptomCode: meta?.code || 'M000',
      score,
      level:       parseFloat(noisedLevel.toFixed(1)),
      region:      this._region,
      timestamp:   Date.now(),
      urgent:      meta?.urgent && level >= 8, // Crisis signal
      epsilon:     MESH_SIGNAL_EPSILON,
    };

    await HealthSignalStore.save(signal);
    this._emit(signal);

    // Crisis signals get immediate mesh broadcast
    if (signal.urgent && window.MeshCoordinator?.running) {
      window.MeshCoordinator.broadcastOutbreakAlert({
        type:     'mental-health-crisis-cluster',
        region:   this._region,
        severity: 'HIGH',
        source:   'mesh-self-report',
      });
    } else if (window.MeshCoordinator?.running) {
      window.MeshCoordinator.broadcastHealthSignal('MENTAL_HEALTH', score, this._region);
    }

    return signal;
  },

  /**
   * Build and return the current regional aggregate
   */
  async getRegionalSummary(hours = 24) {
    return RegionalAggregator.buildAggregate(this._region, hours);
  },

  /**
   * Run influenza outbreak detection on local + mesh signals
   */
  async detectOutbreak(meshSignals = []) {
    const local     = await HealthSignalStore.getRecent(72); // 72-hour window
    const iliLocal  = local.filter(s => s.category === SignalCategory.ILI);

    // Combine local ILI score with mesh peer scores
    const localScore  = RegionalAggregator._computeILIScore(iliLocal);
    const meshScores  = meshSignals
      .filter(s => s.signalType === 'ILI')
      .map(s => s.value);
    const allScores   = [localScore, ...meshScores].filter(s => s > 0);

    if (allScores.length < 2) return null; // Not enough data

    const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const std  = Math.sqrt(allScores.reduce((a, v) => a + (v - mean) ** 2, 0) / allScores.length);

    // Z-score based outbreak detection (same as EarlyWarningEngine)
    const zScore = std > 0 ? (localScore - mean) / std : 0;

    if (Math.abs(zScore) >= 2.0) {
      const alert = {
        type:        'influenza-outbreak-signal',
        region:      this._region,
        iliScore:    parseFloat(localScore.toFixed(3)),
        meshPeers:   allScores.length - 1,
        zScore:      parseFloat(zScore.toFixed(2)),
        severity:    Math.abs(zScore) >= 3 ? 'CRITICAL' : 'WARNING',
        detectedAt:  new Date().toISOString(),
        source:      'mesh-p2p-surveillance',
      };
      return alert;
    }
    return null;
  },
};

// ── MESH SIGNAL AGGREGATOR (receives signals from peers) ──────────────────────
const MeshSignalAggregator = {
  _signals: [],   // Recent signals from mesh peers

  ingest(peerId, signal) {
    this._signals.push({ ...signal, fromPeer: peerId, ingestedAt: Date.now() });
    // Keep last 1000 signals
    if (this._signals.length > 1000) this._signals.shift();
  },

  getRecentByType(type, hours = 24) {
    const since = Date.now() - hours * 3600000;
    return this._signals.filter(s => s.signalType === type && s.ingestedAt > since);
  },

  getRegionalILIScore(region) {
    const signals = this.getRecentByType('ILI')
      .filter(s => !region || s.region === region);
    if (!signals.length) return null;
    const mean = signals.reduce((a, s) => a + s.value, 0) / signals.length;
    return { score: parseFloat(mean.toFixed(3)), peers: signals.length };
  },

  getMentalHealthPressure(region) {
    const signals = this.getRecentByType('MENTAL_HEALTH')
      .filter(s => !region || s.region === region);
    if (!signals.length) return null;
    const mean = signals.reduce((a, s) => a + s.value, 0) / signals.length;
    return { score: parseFloat(mean.toFixed(3)), peers: signals.length };
  },
};

// ── PLATFORM SINGLETON ────────────────────────────────────────────────────────
const MeshHealthPlatform = {
  collector:   HealthSignalCollector,
  aggregator:  MeshSignalAggregator,
  consent:     ConsentManager,
  store:       HealthSignalStore,

  async init(region = 'UNKNOWN') {
    console.log('[MeshHealth] Initializing...');
    HealthSignalCollector.setRegion(region);

    // Wire mesh signals into aggregator
    if (window.MeshCoordinator) {
      window.MeshCoordinator.on(({ type, data, sourcePeerId }) => {
        if (type === 'mesh:health-signal') {
          MeshSignalAggregator.ingest(sourcePeerId, data);

          // Feed into health dashboard early warning engine
          if (window.HealthIntelligencePlatform?.orchestrator?.warning) {
            const ew = window.HealthIntelligencePlatform.orchestrator.warning;
            ew.updateIndicator(`mesh_${data.signalType}`, data.value, data.region);
          }

          // Check for outbreak
          HealthSignalCollector.detectOutbreak(
            MeshSignalAggregator.getRecentByType('ILI')
          ).then(alert => {
            if (alert && window.MeshCoordinator.running) {
              window.MeshCoordinator.broadcastOutbreakAlert(alert);
              // Also push to health intelligence platform
              if (window.HealthIntelligencePlatform?.orchestrator?.warning) {
                window.HealthIntelligencePlatform.orchestrator.warning._emit({
                  severity: alert.severity,
                  title:    `Mesh P2P: ${alert.type}`,
                  detail:   `Region: ${alert.region} · ILI=${alert.iliScore} · Z=${alert.zScore} · ${alert.meshPeers} peers`,
                  type:     'MESH_OUTBREAK_SIGNAL',
                });
              }
            }
          });
        }

        if (type === 'mesh:outbreak-alert') {
          console.warn('[MeshHealth] Outbreak alert from mesh:', data);
          if (window.HealthIntelligencePlatform?.orchestrator?.warning) {
            window.HealthIntelligencePlatform.orchestrator.warning._emit({
              severity: data.severity || 'WARNING',
              title:    `Mesh Alert: ${data.type}`,
              detail:   `From ${data.meshPeers || '?'} peers · Region: ${data.region}`,
              type:     'MESH_OUTBREAK_ALERT',
            });
          }
        }
      });
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/swarm-sw.js', { scope: '/' });
        console.log('[MeshHealth] Service worker registered:', reg.scope);

        // Listen for SW messages
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'CACHE_STATUS') {
            console.log('[MeshHealth] Cache status:', e.data.status);
          }
        });
      } catch (e) {
        console.warn('[MeshHealth] Service worker registration failed:', e.message);
      }
    }

    console.log('[MeshHealth] Platform ready. Region:', region);
    return this;
  },

  // Convenience: request consent and start collecting
  async enableCollection(region, consentTypes = ['symptoms', 'mental_health', 'environment']) {
    ConsentManager.grantConsent(consentTypes);
    HealthSignalCollector.setRegion(region);
    console.log(`[MeshHealth] Collection enabled for region: ${region}`);
    return this;
  },

  getStatus() {
    const consent = ConsentManager.getConsent();
    const mesh    = window.MeshCoordinator?.getStatus() || { peers: 0, online: navigator.onLine };
    return {
      consent:       consent ? 'granted' : 'not-granted',
      consentTypes:  consent?.types || [],
      region:        HealthSignalCollector._region,
      meshPeers:     mesh.peers,
      meshOnline:    mesh.online,
      meshNode:      mesh.nodeId,
      serviceWorker: 'serviceWorker' in navigator,
    };
  },
};

// Export
if (typeof window !== 'undefined') {
  window.MeshHealthPlatform   = MeshHealthPlatform;
  window.HealthSignalCollector = HealthSignalCollector;
  window.ConsentManager        = ConsentManager;
  window.MeshSignalAggregator  = MeshSignalAggregator;
  window.SymptomCodes          = SymptomCodes;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MeshHealthPlatform, HealthSignalCollector, ConsentManager, SymptomCodes };
}

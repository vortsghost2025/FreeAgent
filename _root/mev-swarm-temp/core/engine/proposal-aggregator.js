import { EventEmitter } from 'events';

export class ProposalAggregator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxAnalysts: 8,
      proposalTimeoutMs: 200,
      minProposalsForQuorum: 1,
      maxProposalsToEvaluate: 20,
      dedupWindowMs: 5_000,
      ...config
    };

    this.analysts = new Map();
    this.recentProposals = [];
    this.pendingBatch = null;
    this.stats = { totalBatches: 0, totalProposals: 0, totalDuplicatesRemoved: 0, totalProposalsPromoted: 0, avgAnalystLatencyMs: 0 };
  }

  registerAnalyst(analystId, capabilities = {}) {
    this.analysts.set(analystId, { id: analystId, status: 'IDLE', capabilities: { dexes: capabilities.dexes || ['UNISWAP_V2', 'UNISWAP_V3'], maxHops: capabilities.maxHops || 4, tokens: capabilities.tokens || null, ...capabilities }, stats: { proposalsSubmitted: 0, avgLatencyMs: 0, lastSeen: 0 } });
  }

  async solicitProposals(snapshot) {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.stats.totalBatches++;
    const batch = { id: batchId, startTime: Date.now(), snapshot, proposals: [], status: 'COLLECTING' };
    this.pendingBatch = batch;
    const chunks = this.partitionWork(snapshot);
    const promises = [];
    for (const [analystId, chunk] of chunks) promises.push(this.solicitFromAnalyst(analystId, chunk, batch));
    await Promise.allSettled(promises);
    batch.status = 'COLLECTED'; batch.endTime = Date.now(); batch.latencyMs = batch.endTime - batch.startTime; this.stats.totalProposals += batch.proposals.length; return batch;
  }

  partitionWork(snapshot) {
    const chunks = new Map();
    const analystIds = [...this.analysts.keys()];
    if (analystIds.length === 0) return chunks;
    const pools = snapshot.pools || [];
    const startTokens = snapshot.startTokens || ['WETH', 'USDC', 'DAI', 'WBTC', 'USDT'];
    let idx = 0;
    for (const token of startTokens) {
      const analystId = analystIds[idx % analystIds.length];
      if (!chunks.has(analystId)) chunks.set(analystId, { startTokens: [], poolSubset: [] });
      chunks.get(analystId).startTokens.push(token);
      idx++;
    }
    const chunkSize = Math.ceil(pools.length / analystIds.length);
    idx = 0;
    for (const [analystId, chunk] of chunks) { chunk.poolSubset = pools.slice(idx * chunkSize, (idx + 1) * chunkSize); idx++; }
    return chunks;
  }

  async solicitFromAnalyst(analystId, chunk, batch) {
    const analyst = this.analysts.get(analystId);
    if (!analyst) return;
    analyst.status = 'EVALUATING';
    const startTime = Date.now();
    try {
      const proposal = await this.callAnalyst(analystId, chunk, batch.snapshot);
      const latencyMs = Date.now() - startTime;
      analyst.stats.avgLatencyMs = (analyst.stats.avgLatencyMs * analyst.stats.proposalsSubmitted + latencyMs) / (analyst.stats.proposalsSubmitted + 1);
      analyst.stats.proposalsSubmitted++; analyst.stats.lastSeen = Date.now();
      if (proposal && proposal.opportunities?.length > 0) batch.proposals.push({ analystId, timestamp: Date.now(), latencyMs, opportunities: proposal.opportunities, metadata: proposal.metadata || {} });
      analyst.status = 'IDLE';
    } catch (err) { analyst.status = 'ERROR'; this.emit('analystError', { analystId, error: err.message }); }
  }

  async callAnalyst(analystId, chunk, snapshot) {
    return new Promise((resolve) => { setTimeout(() => { resolve({ opportunities: [], metadata: {} }); }, Math.random() * 100); });
  }

  aggregate(batch) {
    const allOpportunities = [];
    for (const proposal of batch.proposals) for (const opp of proposal.opportunities) allOpportunities.push({ ...opp, _sourceAnalyst: proposal.analystId, _proposalLatency: proposal.latencyMs });
    const deduped = this.deduplicate(allOpportunities);
    this.stats.totalDuplicatesRemoved += allOpportunities.length - deduped.length;
    deduped.sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = deduped.slice(0, this.config.maxProposalsToEvaluate);
    this.stats.totalProposalsPromoted += top.length;
    const result = { batchId: batch.id, totalProposals: batch.proposals.length, totalOpportunities: allOpportunities.length, afterDedup: deduped.length, promoted: top.length, latencyMs: batch.latencyMs, opportunities: top, analystHealth: this.getAnalystHealth() };
    this.emit('aggregated', result);
    return result;
  }

  deduplicate(opportunities) {
    const seen = new Map();
    for (const opp of opportunities) {
      const key = opp.pathSignature || this.computePathSignature(opp);
      if (!seen.has(key)) seen.set(key, opp); else {
        const existing = seen.get(key);
        if ((opp.expectedProfit || 0n) > (existing.expectedProfit || 0n)) seen.set(key, opp);
        else if (opp.expectedProfit === existing.expectedProfit && opp._proposalLatency < existing._proposalLatency) seen.set(key, opp);
      }
    }
    const recentKeys = new Set(this.recentProposals.map(p => p.key));
    const fresh = [...seen.values()].filter(opp => { const key = opp.pathSignature || this.computePathSignature(opp); return !recentKeys.has(key); });
    const now = Date.now();
    this.recentProposals = this.recentProposals.filter(p => now - p.timestamp < this.config.dedupWindowMs);
    for (const opp of fresh) this.recentProposals.push({ key: opp.pathSignature || this.computePathSignature(opp), timestamp: now });
    return fresh;
  }

  computePathSignature(opp) { if (opp.tokens && opp.tokens.length > 0) return [...new Set(opp.tokens)].sort().join('-'); return JSON.stringify(opp.path || opp.pools || 'unknown'); }

  async executiveReview(aggregated, scorer, contentionTracker) {
    const decisions = [];
    for (const opp of aggregated.opportunities) {
      const scoring = scorer.score(opp);
      const contention = contentionTracker?.getPathContention(opp.pathSignature) || { level: 'SOLO' };
      let finalAction = scoring.recommendation;
      if (contention.level === 'CROWDED_HOSTILE') finalAction = 'SKIP';
      else if (contention.level === 'CROWDED' && scoring.score < 700) finalAction = 'SKIP';
      else if (contention.level === 'CONTESTED' && finalAction === 'EXECUTE') finalAction = 'EXECUTE_BUNDLE';
      decisions.push({ opportunity: opp, scoring, contention, finalAction, gasMultiplier: contention.recommendation?.gasMultiplier || 1.0, reason: contention.recommendation?.note || scoring.recommendation });
    }
    const actionable = decisions.filter(d => d.finalAction === 'EXECUTE' || d.finalAction === 'EXECUTE_BUNDLE');
    actionable.sort((a, b) => { const aEV = a.scoring.score * (a.contention.level === 'SOLO' ? 1.0 : 0.7); const bEV = b.scoring.score * (b.contention.level === 'SOLO' ? 1.0 : 0.7); return bEV - aEV; });
    const result = { totalReviewed: decisions.length, actionable: actionable.length, skipped: decisions.length - actionable.length, topDecision: actionable[0] || null, allDecisions: decisions };
    this.emit('executiveDecision', result);
    return result;
  }

  getAnalystHealth() { const health = {}; for (const [id, analyst] of this.analysts) health[id] = { status: analyst.status, proposalsSubmitted: analyst.stats.proposalsSubmitted, avgLatencyMs: Math.round(analyst.stats.avgLatencyMs), lastSeenAgo: analyst.stats.lastSeen ? Date.now() - analyst.stats.lastSeen : null }; return health; }

  async runPipeline(snapshot, scorer, contentionTracker) { const batch = await this.solicitProposals(snapshot); const aggregated = this.aggregate(batch); const decision = await this.executiveReview(aggregated, scorer, contentionTracker); return { batch, aggregated, decision, stats: this.stats }; }
}

export default ProposalAggregator;

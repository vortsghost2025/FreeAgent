/**
 * PROVIDER SCORER - Dynamic Provider Scoring System
 * Part of Autonomous Agent Orchestration layer.
 */
class ProviderScoreTracker {
constructor(options = {}) {
this.maxWindowSize = options.maxWindowSize || 100;
this.decayFactor = options.decayFactor || 0.95;
this.defaultScore = options.defaultScore || 0.5;
this.baselineLatency = options.baselineLatency || 100;
this.baselineCost = options.baselineCost || 1;
this.weights = {latency: options.latencyWeight || 0.4, success: options.successWeight || 0.3, cost: options.costWeight || 0.2, freshness: options.freshnessWeight || 0.1};
this.providers = new Map();
ProviderScoreTracker._instance = this;
console.log("ProviderScoreTracker initialized");
}
static getInstance(options) {
if (!ProviderScoreTracker._instance) { ProviderScoreTracker._instance = new ProviderScoreTracker(options); }
return ProviderScoreTracker._instance;
}
_ensureProvider(providerId) {
if (!this.providers.has(providerId)) { this.providers.set(providerId, {id: providerId, calls: [], lastCallTime: null, totalSuccesses: 0, totalFailures: 0, totalLatency: 0, totalCost: 0}); }
return this.providers.get(providerId);
}
recordSuccess(providerId, latency, cost = 0) {
const provider = this._ensureProvider(providerId);
const now = Date.now();
provider.calls.push({timestamp: now, success: true, latency: latency, cost: cost, weight: 1.0});
provider.totalSuccesses++;
provider.totalLatency += latency;
provider.totalCost += cost;
provider.lastCallTime = now;
this._applyDecayAndTrim(provider);
}
recordFailure(providerId) {
const provider = this._ensureProvider(providerId);
const now = Date.now();
provider.calls.push({timestamp: now, success: false, latency: 0, cost: 0, weight: 1.0});
provider.totalFailures++;
provider.lastCallTime = now;
this._applyDecayAndTrim(provider);
}
_applyDecayAndTrim(provider) {
for (const call of provider.calls) { call.weight *= this.decayFactor; }
provider.calls.sort((a, b) => b.weight - a.weight);
if (provider.calls.length > this.maxWindowSize) { provider.calls = provider.calls.slice(0, this.maxWindowSize); }
}
_calculateLatencyScore(provider) {
if (!provider.calls || provider.calls.length === 0) return this.defaultScore;
const successfulCalls = provider.calls.filter(c => c.success && c.latency > 0);
if (successfulCalls.length === 0) return this.defaultScore;
let totalWeight = 0, weightedLatency = 0;
for (const call of successfulCalls) { weightedLatency += call.latency * call.weight; totalWeight += call.weight; }
const avgLatency = totalWeight > 0 ? weightedLatency / totalWeight : this.baselineLatency;
return Math.max(0, Math.min(1, Math.exp(-avgLatency / this.baselineLatency)));
}
_calculateSuccessScore(provider) {
if (!provider.calls || provider.calls.length === 0) return this.defaultScore;
let totalWeight = 0, successWeight = 0;
for (const call of provider.calls) { totalWeight += call.weight; if (call.success) successWeight += call.weight; }
return Math.max(0, Math.min(1, totalWeight > 0 ? successWeight / totalWeight : 0));
}
_calculateCostScore(provider) {
if (!provider.calls || provider.calls.length === 0) return this.defaultScore;
const successfulCalls = provider.calls.filter(c => c.success && c.cost > 0);
if (successfulCalls.length === 0) return this.defaultScore;
let totalWeight = 0, weightedCost = 0;
for (const call of successfulCalls) { weightedCost += call.cost * call.weight; totalWeight += call.weight; }
const avgCost = totalWeight > 0 ? weightedCost / totalWeight : 0;
return Math.max(0, Math.min(1, Math.exp(-avgCost / this.baselineCost)));
}
_calculateFreshnessScore(provider) {
if (!provider.lastCallTime) return this.defaultScore;
const timeSinceLastCall = Date.now() - provider.lastCallTime;
return Math.max(0, Math.min(1, Math.exp(-timeSinceLastCall / 3600000)));
}
getScore(providerId) {
const provider = this.providers.get(providerId);
if (!provider) return this.defaultScore;
const latencyScore = this._calculateLatencyScore(provider);
const successScore = this._calculateSuccessScore(provider);
const costScore = this._calculateCostScore(provider);
const freshnessScore = this._calculateFreshnessScore(provider);
const score = (this.weights.latency * latencyScore) + (this.weights.success * successScore) + (this.weights.cost * costScore) + (this.weights.freshness * freshnessScore);
return Math.max(0, Math.min(1, score));
}
getScoreDetails(providerId) {
const provider = this.providers.get(providerId);
if (!provider) { return {providerId, score: this.defaultScore, hasHistory: false, components: {latencyScore: this.defaultScore, successScore: this.defaultScore, costScore: this.defaultScore, freshnessScore: this.defaultScore}, metadata: {totalCalls: 0, totalSuccesses: 0, totalFailures: 0, lastCallTime: null}}; }
const latencyScore = this._calculateLatencyScore(provider);
const successScore = this._calculateSuccessScore(provider);
const costScore = this._calculateCostScore(provider);
const freshnessScore = this._calculateFreshnessScore(provider);
const score = (this.weights.latency * latencyScore) + (this.weights.success * successScore) + (this.weights.cost * costScore) + (this.weights.freshness * freshnessScore);
return {providerId, score: Math.max(0, Math.min(1, score)), hasHistory: true, components: {latencyScore, successScore, costScore, freshnessScore}, metadata: {totalCalls: provider.calls.length, totalSuccesses: provider.totalSuccesses, totalFailures: provider.totalFailures, lastCallTime: provider.lastCallTime}};
}
getBestProvider(availableProviders) {
if (!availableProviders || availableProviders.length === 0) return null;
let bestProvider = null, bestScore = -1;
for (const providerId of availableProviders) { const score = this.getScore(providerId); if (score > bestScore) { bestScore = score; bestProvider = providerId; } }
return bestProvider;
}
getAllScores() {
const scores = new Map();
for (const [providerId] of this.providers) { scores.set(providerId, this.getScore(providerId)); }
return scores;
}
getAllScoreDetails() {
const details = {};
for (const [providerId] of this.providers) { details[providerId] = this.getScoreDetails(providerId); }
return details;
}
resetProvider(providerId) {
if (this.providers.has(providerId)) { this.providers.delete(providerId); }
}
resetAll() { this.providers.clear(); }
getProviderStats(providerId) {
const provider = this.providers.get(providerId);
if (!provider) return null;
return {providerId, totalCalls: provider.calls.length, totalSuccesses: provider.totalSuccesses, totalFailures: provider.totalFailures, successRate: provider.totalSuccesses + provider.totalFailures > 0 ? provider.totalSuccesses / (provider.totalSuccesses + provider.totalFailures) : 0, avgLatency: provider.totalSuccesses > 0 ? provider.totalLatency / provider.totalSuccesses : 0, totalCost: provider.totalCost, lastCallTime: provider.lastCallTime};
}
}
const providerScorer = ProviderScoreTracker.getInstance();
export { ProviderScoreTracker, providerScorer };
export default providerScorer;

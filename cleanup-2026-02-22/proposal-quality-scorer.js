/**
 * Phase 8.X: Proposal Quality Scoring Engine
 * Quality metrics, lineage tracking, quality-weighted selection, historical performance
 */

export class ProposalQualityScorer {
  constructor(options = {}) {
    this.minImpact = options.minImpact || 1;  // Minimum improvement %
    this.complexityWeightFactor = options.complexityWeightFactor || 0.1;
    this.reversibilityBonus = options.reversibilityBonus || 0.15;
    this.riskPenalty = options.riskPenalty || 0.5;
    this.proposalHistory = [];
    this.lineage = new Map();  // Track which subsystem generated the best proposals
    this.maxHistorySize = options.maxHistorySize || 1000;
  }

  /**
   * Score a proposal for quality
   * Returns { score, rating, factors }
   */
  scoreProposal(proposal = {}) {
    let score = 0;
    const factors = {};

    // Impact factor (0-40 points)
    const impact = Math.min(40, (proposal.expectedImprovementPct || 0) * 2);
    factors.impact = impact;
    score += impact;

    // Reversibility factor (0-20 points)
    const reversibility = (proposal.reversible === true) ? 20 : 0;
    factors.reversibility = reversibility;
    score += reversibility;

    // Complexity penalty (0-20 points, but can be negative)
    const complexityDelta = proposal.complexityDeltaPct || 0;
    const complexityScore = Math.max(-20, 20 - (complexityDelta * this.complexityWeightFactor));
    factors.complexity = complexityScore;
    score += complexityScore;

    // Risk penalty (0-20 points)
    const riskScore = Math.max(0, 20 - ((proposal.riskScore || 0) * this.riskPenalty * 20));
    factors.risk = riskScore;
    score += riskScore;

    // Audit trail bonus (0-10 points)
    const auditBonus = (proposal.auditRef && proposal.auditRef.length > 0) ? 10 : 0;
    factors.auditability = auditBonus;
    score += auditBonus;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Rating
    const rating = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'POOR';

    return {
      proposalId: proposal.proposalId || 'unknown',
      score: Number(score.toFixed(1)),
      rating,
      factors,
      shouldSelect: score >= 40
    };
  }

  /**
   * Record proposal outcome: did it actually deliver quality?
   */
  recordProposalOutcome(proposalId = '', changeId = '', actualImprovement = 0, succeeded = true, subsystem = '') {
    const record = {
      proposalId,
      changeId,
      timestamp: Date.now(),
      actualImprovement: Number(actualImprovement),
      declared_vs_actual_ratio: actualImprovement > 0 ? actualImprovement / Math.max(1, actualImprovement) : 0,
      succeeded,
      subsystem: subsystem || 'unknown'
    };

    this.proposalHistory.push(record);
    if (this.proposalHistory.length > this.maxHistorySize) {
      this.proposalHistory.shift();
    }

    // Update lineage
    if (!this.lineage.has(subsystem)) {
      this.lineage.set(subsystem, {
        totalProposals: 0,
        successfulProposals: 0,
        totalImprovement: 0,
        avgQuality: 0
      });
    }
    const lineageEntry = this.lineage.get(subsystem);
    lineageEntry.totalProposals += 1;
    if (succeeded) {
      lineageEntry.successfulProposals += 1;
      lineageEntry.totalImprovement += actualImprovement;
    }
    lineageEntry.avgQuality = lineageEntry.totalImprovement / Math.max(1, lineageEntry.successfulProposals);

    return record;
  }

  /**
   * Get quality-weighted proposal selection: prefer high-quality proposals
   * Returns ranked list of proposals
   */
  rankProposalsForSelection(proposals = [], options = {}) {
    const useBiasedSelection = options.biased === true;  // Weight toward high-quality subsystems

    const scored = proposals.map(p => {
      const score = this.scoreProposal(p);
      let finalScore = score.score;

      // If biased selection, boost proposals from high-quality subsystems
      if (useBiasedSelection && p.subsystem) {
        const lineageEntry = this.lineage.get(p.subsystem);
        if (lineageEntry && lineageEntry.avgQuality > 5) {
          finalScore = finalScore * (1 + (lineageEntry.avgQuality / 100) * 0.2);  // 20% boost max
        }
      }

      return {
        ...score,
        finalScore: Number(finalScore.toFixed(1)),
        subsystem: p.subsystem || 'unknown'
      };
    });

    return scored.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Get subsystem lineage (which ones generate best proposals)
   */
  getSubsystemLineage() {
    const entries = Array.from(this.lineage.entries()).map(([subsystem, stats]) => ({
      subsystem,
      ...stats,
      successRate: stats.totalProposals > 0 ? (stats.successfulProposals / stats.totalProposals).toFixed(3) : 0,
      avgImprovement: Number((stats.totalImprovement / Math.max(1, stats.successfulProposals)).toFixed(2))
    }));

    return entries.sort((a, b) => b.avgQuality - a.avgQuality);
  }

  /**
   * Comprehensive quality report
   */
  getQualityReport() {
    const recentOutcomes = this.proposalHistory.slice(-20);
    const successRate = recentOutcomes.length > 0
      ? (recentOutcomes.filter(o => o.succeeded).length / recentOutcomes.length).toFixed(3)
      : 0;

    return {
      totalProposalsTracked: this.proposalHistory.length,
      recentSuccessRate: Number(successRate),
      subsystemLineage: this.getSubsystemLineage(),
      topPerformers: recentOutcomes
        .filter(o => o.succeeded)
        .sort((a, b) => b.actualImprovement - a.actualImprovement)
        .slice(0, 5),
      recentFailures: recentOutcomes
        .filter(o => !o.succeeded)
        .slice(0, 3)
    };
  }

  reset() {
    this.proposalHistory = [];
    this.lineage.clear();
  }
}

export default {
  ProposalQualityScorer
};

export class CompetitionScorer {
  constructor(config = {}) {
    this.config = {
      weights: {
        rawProfit: 0.20,
        gasEfficiency: 0.15,
        competitorRisk: 0.20,
        poolStaleness: 0.15,
        bundleLandRate: 0.15,
        routeComplexity: 0.05,
        liquidityDepth: 0.10,
        ...config.weights,
      },
      knownCompetitors: config.knownCompetitors || [],
      ...config,
    };

    this.executionHistory = [];
    this.bundleLandRates = new Map();
    this.strategyPerf = config.strategyPerf || null;
  }

  score(opportunity) {
    if (opportunity.expectedProfitWei <= 0n) {
      return {
        score: 0,
        factors: {},
        recommendation: 'SKIP',
        gasStrategy: 'OBSERVE',
        timestamp: Date.now(),
        composite: 0,
      };
    }

    const factors = {
      rawProfit: this.scoreRawProfit(opportunity.expectedProfitWei),
      gasEfficiency: this.scoreGasEfficiency(opportunity.expectedProfitWei, opportunity.gasEstimate),
      competitorRisk: this.scoreCompetitorRisk(opportunity),
      poolStaleness: this.scorePoolStaleness(opportunity),
      bundleLandRate: this.scoreBundleLandRate(opportunity.gasTier),
      routeComplexity: this.scoreRouteComplexity(opportunity.path),
      liquidityDepth: this.scoreLiquidityDepth(opportunity.pools),
    };

    let composite = 0;
     for (const key of Object.keys(factors)) {
       composite += (factors[key] || 0) * (this.config.weights[key] || 0);
     }

     // Minimum profit floor
     const minProfitThreshold = 1000000000000000n; // 0.001 ETH in wei
     if (opportunity.expectedProfitWei < minProfitThreshold) {
       composite *= 0.2;
     }

     // Profit dominance check: if rawProfit is very high, floor the score
     // to prevent other factors from killing a clear winner
     if (factors.rawProfit > 0.8) {
       composite = Math.max(composite, 0.6);
     }

    composite *= this.getTimeMultiplier();
    composite *= this.getCompetitionMultiplier(opportunity);

    // Apply adaptive strategy weight if available
    try {
      const contentionLevel = opportunity.contentionLevel || opportunity.contention?.level || 'SOLO';
      const strat = contentionLevel === 'SOLO' ? 'solo' : (contentionLevel === 'CONTESTED' || contentionLevel === 'CONTESTED_LIGHT' ? 'contested' : 'crowded');
      const weight = this.strategyPerf && typeof this.strategyPerf.getWeightFor === 'function' ? this.strategyPerf.getWeightFor(strat) : 1.0;
      composite *= weight;
    } catch (e) {
      // ignore
    }

    const score = Math.round(composite * 1000);
    // Add DELAY option: for borderline composite and contested contention, prefer delaying
    let recommendation = 'SKIP';
    if (composite > 0.6) recommendation = 'EXECUTE';
    else if (composite > 0.35) {
      const contentionLevel = opportunity.contentionLevel || opportunity.contention?.level || 'SOLO';
      if (contentionLevel === 'CONTESTED' || contentionLevel === 'CROWDED') recommendation = 'DELAY';
      else recommendation = 'MONITOR';
    }

    return {
      score,
      factors,
      recommendation,
      gasStrategy: this.selectGasStrategy(composite, opportunity),
      timestamp: Date.now(),
      composite,
    };
  }

  scoreRawProfit(profit) {
    if (!profit || profit <= 0n) return 0;
    const eth = Number(profit) / 1e18;
    // Linear below threshold, log above
    if (eth < 0.001) return Math.max(0, eth / 0.001); // 0.0001 ETH = 0.1
    return Math.min(1, (Math.log10(eth) + 3) / 3);    // 0.001 = 0.0, 1.0 = 1.0
  }

  scoreGasEfficiency(expectedProfitWei, gasEstimate) {
    if (typeof expectedProfitWei !== 'bigint' || expectedProfitWei <= 0n || !gasEstimate) return 0;
    const efficiency = (Number(expectedProfitWei) / Number(gasEstimate)) * 100_000;
    return Math.min(1, efficiency / 0.001);
  }

  scoreCompetitorRisk(opportunity) {
    const competitorCount = this.estimateCompetitors(opportunity);
    if (competitorCount === 0) return 1.0;
    if (competitorCount <= 2) return 0.7;
    if (competitorCount <= 5) return 0.4;
    return 0.1;
  }

  estimateCompetitors(opportunity) {
    let count = 0;
    if (this.isCommonPair(opportunity)) count += 3;
    if (opportunity.pools?.some(p => p.version === 'V3')) count += 2;
    if (Number(opportunity.expectedProfitWei || 0n) / 1e18 > 0.05) count += 2;
    count += this.matchKnownCompetitors(opportunity);
    return count;
  }

  scorePoolStaleness(opportunity) {
    const now = Date.now();
    const oldest = Math.min(...(opportunity.pools || []).map(p => (now - (p.lastUpdate || now))));
    if (oldest < 5000) return 1.0;
    if (oldest < 15000) return 0.7;
    if (oldest < 30000) return 0.4;
    return 0.1;
  }

  scoreBundleLandRate(gasTier) {
    return this.bundleLandRates.get(gasTier) || 0.5;
  }

  scoreRouteComplexity(path) {
    const hops = Array.isArray(path) ? path.length : 3;
    if (hops <= 2) return 1.0;
    if (hops === 3) return 0.8;
    if (hops === 4) return 0.5;
    return 0.2;
  }

  scoreLiquidityDepth(pools) {
    const depths = (pools || []).map(p => {
      const reserve0 = Number(p.reserve0 || 0) / 1e18;
      const reserve1 = Number(p.reserve1 || 0) / 1e18;
      return Math.min(reserve0, reserve1);
    });
    const minDepth = depths.length ? Math.min(...depths) : 0;
    return Math.min(1, minDepth / 100);
  }

  getTimeMultiplier() {
    const hour = new Date().getUTCHours();
    if (hour >= 14 && hour <= 17) return 1.3;
    if (hour >= 2 && hour <= 6) return 1.1;
    if (hour >= 21 || hour <= 1) return 0.7;
    return 1.0;
  }

  getCompetitionMultiplier(opportunity) {
    let multiplier = opportunity.recentlyArbed ? 0.2 : 1.0;

    // Conservative rule: skip crowded paths unless score is very high
    if (this.estimateCompetitors(opportunity) > 3) {
      multiplier *= 0.3; // Significant penalty for crowded paths
    }

    return multiplier;
  }

  isCommonPair(opportunity) {
    const common = ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC'];
    const tokens = opportunity.tokens || [];
    return tokens.filter(t => common.includes(t)).length >= 2;
  }

  matchKnownCompetitors(opportunity) {
    if (!this.config.knownCompetitors || this.config.knownCompetitors.length === 0) return 0;
    let matches = 0;
    const pools = opportunity.pools || [];
    for (const p of pools) {
      const addr = (p.address || '').toLowerCase();
      for (const k of this.config.knownCompetitors) {
        if (!k) continue;
        const kk = k.toLowerCase();
        if (addr.includes(kk) || kk.includes(addr)) {
          matches++;
        }
      }
    }
    return matches;
  }

  selectGasStrategy(composite) {
    if (composite > 0.8) return 'AGGRESSIVE';
    if (composite > 0.6) return 'STANDARD';
    if (composite > 0.4) return 'CONSERVATIVE';
    return 'OBSERVE';
  }

  recordOutcome(opportunity, scoreResult, landed, gasUsed) {
    this.executionHistory.push({ path: opportunity.path, score: scoreResult.score, landed, gasUsed, timestamp: Date.now()});
    if (opportunity.gasTier) {
      const existing = this.bundleLandRates.get(opportunity.gasTier) || { wins: 0, total: 0 };
      existing.total++;
      if (landed) existing.wins++;
      this.bundleLandRates.set(opportunity.gasTier, existing.wins / existing.total);
    }
    if (this.executionHistory.length > 10000) {
      this.executionHistory = this.executionHistory.slice(-5000);
    }
  }
}

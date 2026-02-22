/**
 * WE4FREE Platform - Climate Workflow Orchestrator
 *
 * Orchestrates complex climate modeling workflows:
 * - Regional emissions inventory
 * - Climate scenario projections
 * - Impact assessment across sectors
 * - Mitigation strategy comparison
 */

// ============================================================================
// NOAA REAL DATA BRIDGE
// Fetches live observations from api.weather.gov (no API key required)
// Falls back to synthetic data if API is unavailable
// ============================================================================

const NOAA_STATIONS = [
  { id: 'KORD', name: 'Chicago O\'Hare',    lat: 41.98, lon: -87.90, region: 'Great Lakes' },
  { id: 'KLAX', name: 'Los Angeles',         lat: 33.94, lon: -118.40, region: 'West Coast' },
  { id: 'KJFK', name: 'New York JFK',        lat: 40.63, lon: -73.78, region: 'Northeast' },
  { id: 'KIAH', name: 'Houston Intercontinental', lat: 29.98, lon: -95.34, region: 'Gulf Coast' },
  { id: 'KSEA', name: 'Seattle-Tacoma',      lat: 47.44, lon: -122.31, region: 'Pacific Northwest' },
  { id: 'KDEN', name: 'Denver',              lat: 39.86, lon: -104.67, region: 'Rocky Mountain' },
  { id: 'KMIA', name: 'Miami',               lat: 25.79, lon: -80.32, region: 'Southeast' },
  { id: 'KBOS', name: 'Boston Logan',        lat: 42.36, lon: -71.01, region: 'New England' },
];

async function fetchNOAAObservation(stationId) {
  try {
    const r = await fetch(
      `https://api.weather.gov/stations/${stationId}/observations/latest`,
      { headers: { 'User-Agent': 'WE4FREE-ClimateSwarm/1.0' } }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const p = d.properties;
    return {
      stationId,
      temperature: p.temperature?.value,          // °C
      dewpoint:    p.dewpoint?.value,
      windSpeed:   p.windSpeed?.value,             // m/s
      windDir:     p.windDirection?.value,         // degrees
      pressure:    p.seaLevelPressure?.value,      // Pa
      humidity:    p.relativeHumidity?.value,      // %
      visibility:  p.visibility?.value,            // m
      timestamp:   p.timestamp,
      description: p.textDescription || '',
      source:      'NOAA_LIVE',
    };
  } catch (e) {
    console.warn(`[NOAA] ${stationId} fetch failed: ${e.message} — using synthetic fallback`);
    return null;
  }
}

// Cache observations to avoid hammering NOAA (30min TTL)
const _noaaCache = { data: null, ts: 0 };

async function fetchAllNOAAObservations() {
  const now = Date.now();
  if (_noaaCache.data && (now - _noaaCache.ts) < 30 * 60 * 1000) {
    console.log('[NOAA] Using cached observations (TTL 30min)');
    return _noaaCache.data;
  }

  console.log('[NOAA] Fetching live observations from api.weather.gov...');
  const results = await Promise.allSettled(
    NOAA_STATIONS.map(s => fetchNOAAObservation(s.id))
  );

  const observations = {};
  results.forEach((r, i) => {
    const station = NOAA_STATIONS[i];
    const obs = r.status === 'fulfilled' ? r.value : null;
    observations[station.id] = {
      ...station,
      ...(obs || { temperature: 15 + (i * 3 % 20), windSpeed: 5, humidity: 60, source: 'SYNTHETIC' }),
    };
  });

  const liveCount = Object.values(observations).filter(o => o.source === 'NOAA_LIVE').length;
  console.log(`[NOAA] Got ${liveCount}/${NOAA_STATIONS.length} live observations`);

  _noaaCache.data = observations;
  _noaaCache.ts = now;
  return observations;
}

class ClimateWorkflowOrchestrator {
  constructor(taskQueue, distributedCompute, swarmCoordinator) {
    this.taskQueue = taskQueue;
    this.distributedCompute = distributedCompute;
    this.swarmCoordinator = swarmCoordinator;
    this.workflows = new Map();
    this.results = new Map();
    this.noaaObservations = null; // Populated on first workflow run

    console.log('🌍 Climate Workflow Orchestrator initialized (NOAA real-data bridge active)');
  }

  // Fetch and cache NOAA data for use across all workflows
  async ensureNOAAData() {
    if (!this.noaaObservations) {
      this.noaaObservations = await fetchAllNOAAObservations();
    }
    return this.noaaObservations;
  }

  // Get real temperature baseline for a region (falls back to synthetic)
  getRealBaseline(region) {
    const obs = this.noaaObservations || {};
    const station = NOAA_STATIONS.find(s => s.region === region);
    if (station && obs[station.id]?.temperature != null) {
      return obs[station.id].temperature; // real °C from NOAA
    }
    return 12 + Math.random() * 10; // synthetic fallback
  }

  // ============================================================================
  // WORKFLOW 1: REGIONAL EMISSIONS INVENTORY
  // ============================================================================

  async runEmissionsInventory(regions, year, sectors) {
    const workflowId = `emissions-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'emissions-inventory',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`🏭 Starting Emissions Inventory: ${workflowId}`);
    console.log(`  ${regions.length} regions, year ${year}`);

    try {
      // Use map/reduce to calculate emissions across regions
      const regionData = regions.map(region => ({
        region: region.name,
        year,
        sectors
      }));

      // Map function: Calculate emissions per region
      const mapFn = (data) => {
        const emissionsBySector = {};
        let totalEmissions = 0;

        for (const sector of data.sectors) {
          const emissions = Math.random() * 500 + 100; // Mock emissions
          emissionsBySector[sector] = emissions;
          totalEmissions += emissions;
        }

        return {
          region: data.region,
          year: data.year,
          totalEmissions,
          emissionsBySector
        };
      };

      // Reduce function: Aggregate global emissions
      const reduceFn = (regionalResults) => {
        const globalBySector = {};
        let globalTotal = 0;

        for (const result of regionalResults) {
          globalTotal += result.totalEmissions;

          for (const [sector, emissions] of Object.entries(result.emissionsBySector)) {
            if (!globalBySector[sector]) {
              globalBySector[sector] = 0;
            }
            globalBySector[sector] += emissions;
          }
        }

        const topEmitters = regionalResults
          .sort((a, b) => b.totalEmissions - a.totalEmissions)
          .slice(0, 10)
          .map(r => ({ region: r.region, emissions: r.totalEmissions }));

        return {
          globalTotal,
          globalBySector,
          topEmitters,
          regions: regionalResults.length
        };
      };

      const emissionsResult = await this.distributedCompute.mapReduce(
        regionData,
        mapFn.toString(),
        reduceFn.toString()
      );

      const finalResult = {
        workflowId,
        year,
        regions: regions.length,
        sectors,
        globalTotal: emissionsResult.result?.globalTotal || emissionsResult.globalTotal,
        globalBySector: emissionsResult.result?.globalBySector || emissionsResult.globalBySector,
        topEmitters: emissionsResult.result?.topEmitters || emissionsResult.topEmitters,
        unit: 'MtCO2e',
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Emissions Inventory completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Emissions Inventory failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW 2: CLIMATE SCENARIO PROJECTION
  // ============================================================================

  async runClimateProjection(scenarios, regions, startYear, endYear) {
    const workflowId = `projection-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'climate-projection',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`🌡️ Starting Climate Projection: ${workflowId}`);
    console.log(`  ${scenarios.length} scenarios, ${regions.length} regions (${startYear}-${endYear})`);

    try {
      // Fetch real NOAA baselines before running map/reduce
      await this.ensureNOAAData();

      // Build real baselines per region from NOAA observations
      const regionBaselines = {};
      for (const region of regions) {
        regionBaselines[region] = this.getRealBaseline(region);
      }

      // Create scenario-region combinations with real baselines embedded
      const combinations = [];
      for (const scenario of scenarios) {
        for (const region of regions) {
          combinations.push({ scenario, region, startYear, endYear,
            realBaseline: regionBaselines[region] });
        }
      }

      // Map function: Project climate for each scenario-region pair
      const mapFn = (data) => {
        // Use real NOAA baseline if available, otherwise synthetic
        const baseline = (data.realBaseline != null) ? data.realBaseline
          : 15 + (Math.random() - 0.5) * 10; // 10-20°C
        const warming = {
          'RCP2.6': 1.5,
          'RCP4.5': 2.5,
          'RCP6.0': 3.0,
          'RCP8.5': 4.5
        }[data.scenario] || 2.0;

        return {
          scenario: data.scenario,
          region: data.region,
          baseline,
          projectedWarming: warming,
          projectedTemperature: baseline + warming,
          precipitationChange: Math.random() * 0.4 - 0.2 // -20% to +20%
        };
      };

      // Reduce function: Summarize projections
      const reduceFn = (projections) => {
        const byScenario = {};

        for (const proj of projections) {
          if (!byScenario[proj.scenario]) {
            byScenario[proj.scenario] = {
              scenario: proj.scenario,
              regions: 0,
              avgWarming: 0,
              avgTemp: 0,
              regionalData: []
            };
          }

          byScenario[proj.scenario].regions++;
          byScenario[proj.scenario].avgWarming += proj.projectedWarming;
          byScenario[proj.scenario].avgTemp += proj.projectedTemperature;
          byScenario[proj.scenario].regionalData.push({
            region: proj.region,
            warming: proj.projectedWarming,
            temp: proj.projectedTemperature
          });
        }

        // Calculate averages
        for (const scenario of Object.values(byScenario)) {
          scenario.avgWarming /= scenario.regions;
          scenario.avgTemp /= scenario.regions;
        }

        return {
          scenarios: Object.values(byScenario),
          totalProjections: projections.length
        };
      };

      const projectionResult = await this.distributedCompute.mapReduce(
        combinations,
        mapFn.toString(),
        reduceFn.toString()
      );

      const finalResult = {
        workflowId,
        startYear,
        endYear,
        scenarios: projectionResult.result?.scenarios || projectionResult.scenarios,
        regions: regions.length,
        totalProjections: projectionResult.result?.totalProjections || projectionResult.totalProjections,
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Climate Projection completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Climate Projection failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW 3: MULTI-SECTOR IMPACT ASSESSMENT
  // ============================================================================

  async runImpactAssessment(regions, scenario, sectors) {
    const workflowId = `impact-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'impact-assessment',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`📊 Starting Impact Assessment: ${workflowId}`);
    console.log(`  ${regions.length} regions, scenario ${scenario}`);

    try {
      // Create region-sector combinations
      const assessments = [];
      for (const region of regions) {
        assessments.push({ region, scenario, sectors });
      }

      // Map function: Assess impacts per region
      const mapFn = (data) => {
        const impactsBySector = {};
        let totalRisk = 0;

        for (const sector of data.sectors) {
          const severity = Math.random();
          impactsBySector[sector] = {
            severity,
            level: severity < 0.3 ? 'low' : severity < 0.6 ? 'moderate' : 'high'
          };
          totalRisk += severity;
        }

        return {
          region: data.region,
          scenario: data.scenario,
          impactsBySector,
          overallRisk: totalRisk / data.sectors.length,
          vulnerabilityScore: Math.random() * 0.5 + 0.3
        };
      };

      // Reduce function: Aggregate impact statistics
      const reduceFn = (regionalImpacts) => {
        const sectorAggregates = {};
        let totalVulnerability = 0;

        for (const impact of regionalImpacts) {
          totalVulnerability += impact.vulnerabilityScore;

          for (const [sector, data] of Object.entries(impact.impactsBySector)) {
            if (!sectorAggregates[sector]) {
              sectorAggregates[sector] = {
                totalSeverity: 0,
                count: 0,
                highRiskRegions: []
              };
            }

            sectorAggregates[sector].totalSeverity += data.severity;
            sectorAggregates[sector].count++;

            if (data.level === 'high') {
              sectorAggregates[sector].highRiskRegions.push(impact.region);
            }
          }
        }

        // Calculate averages
        for (const sector of Object.values(sectorAggregates)) {
          sector.avgSeverity = sector.totalSeverity / sector.count;
        }

        const mostVulnerableRegions = regionalImpacts
          .sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore)
          .slice(0, 10)
          .map(r => ({ region: r.region, vulnerability: r.vulnerabilityScore }));

        return {
          sectorAggregates,
          avgVulnerability: totalVulnerability / regionalImpacts.length,
          mostVulnerableRegions,
          totalRegions: regionalImpacts.length
        };
      };

      const impactResult = await this.distributedCompute.mapReduce(
        assessments,
        mapFn.toString(),
        reduceFn.toString()
      );

      const finalResult = {
        workflowId,
        scenario,
        regions: regions.length,
        sectors,
        sectorAggregates: impactResult.result?.sectorAggregates || impactResult.sectorAggregates,
        avgVulnerability: impactResult.result?.avgVulnerability || impactResult.avgVulnerability,
        mostVulnerableRegions: impactResult.result?.mostVulnerableRegions || impactResult.mostVulnerableRegions,
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Impact Assessment completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Impact Assessment failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW 4: MITIGATION STRATEGY COMPARISON
  // ============================================================================

  async runMitigationComparison(strategies, regions, targetYear) {
    const workflowId = `mitigation-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'mitigation-comparison',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`🎯 Starting Mitigation Comparison: ${workflowId}`);
    console.log(`  ${strategies.length} strategies, ${regions.length} regions`);

    try {
      // Create strategy-region combinations
      const combinations = [];
      for (const strategy of strategies) {
        for (const region of regions) {
          combinations.push({ strategy, region, targetYear });
        }
      }

      // Map function: Evaluate each strategy in each region
      const mapFn = (data) => {
        const reduction = Math.random() * 30 + 10; // 10-40%
        const cost = Math.random() * 100 + 20; // 20-120 billion USD
        const feasibility = Math.random();

        return {
          strategy: data.strategy,
          region: data.region,
          emissionsReduction: reduction,
          cost,
          costEffectiveness: reduction / cost,
          feasibility,
          timeframe: Math.round(Math.random() * 10 + 5)
        };
      };

      // Reduce function: Compare strategies globally
      const reduceFn = (evaluations) => {
        const strategyComparison = {};

        for (const eval of evaluations) {
          if (!strategyComparison[eval.strategy]) {
            strategyComparison[eval.strategy] = {
              strategy: eval.strategy,
              totalReduction: 0,
              totalCost: 0,
              avgFeasibility: 0,
              regionsAnalyzed: 0,
              regionalData: []
            };
          }

          const strat = strategyComparison[eval.strategy];
          strat.totalReduction += eval.emissionsReduction;
          strat.totalCost += eval.cost;
          strat.avgFeasibility += eval.feasibility;
          strat.regionsAnalyzed++;
          strat.regionalData.push({
            region: eval.region,
            reduction: eval.emissionsReduction,
            cost: eval.cost
          });
        }

        // Calculate averages and rankings
        const strategies = Object.values(strategyComparison);
        for (const strat of strategies) {
          strat.avgFeasibility /= strat.regionsAnalyzed;
          strat.costEffectiveness = strat.totalReduction / strat.totalCost;
        }

        strategies.sort((a, b) => b.costEffectiveness - a.costEffectiveness);

        return {
          strategies,
          recommendedStrategy: strategies[0].strategy,
          totalEvaluations: evaluations.length
        };
      };

      const mitigationResult = await this.distributedCompute.mapReduce(
        combinations,
        mapFn.toString(),
        reduceFn.toString()
      );

      const finalResult = {
        workflowId,
        targetYear,
        strategiesEvaluated: strategies.length,
        regions: regions.length,
        strategies: mitigationResult.result?.strategies || mitigationResult.strategies,
        recommendedStrategy: mitigationResult.result?.recommendedStrategy || mitigationResult.recommendedStrategy,
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Mitigation Comparison completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Mitigation Comparison failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  async waitForTask(taskId, timeout = 30000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.taskQueue.completedTasks.has(taskId)) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
        }
      }, 100);
    });
  }

  getWorkflowStatus(workflowId) {
    return this.workflows.get(workflowId);
  }

  getWorkflowResult(workflowId) {
    return this.results.get(workflowId);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ClimateWorkflowOrchestrator };
}

console.log('✅ Climate Workflows loaded');

/**
 * WE4FREE Platform - Evolution Workflow Orchestrator
 *
 * Orchestrates complex evolutionary biology workflows:
 * - Phylogenetic analysis with bootstrap support
 * - Population structure analysis (FST, admixture)
 * - Selection scan across genomic regions
 * - Molecular clock dating
 */

class EvolutionWorkflowOrchestrator {
  constructor(taskQueue, distributedCompute, swarmCoordinator) {
    this.taskQueue = taskQueue;
    this.distributedCompute = distributedCompute;
    this.swarmCoordinator = swarmCoordinator;
    this.workflows = new Map();
    this.results = new Map();

    console.log('🧬 Evolution Workflow Orchestrator initialized');
  }

  // ============================================================================
  // WORKFLOW 1: PHYLOGENETIC ANALYSIS WITH BOOTSTRAP
  // ============================================================================

  async runPhylogeneticAnalysis(sequences, options = {}) {
    const workflowId = `phylo-${Date.now()}`;
    const {
      method = 'neighbor-joining',
      bootstrapReplicates = 100
    } = options;

    const workflow = {
      id: workflowId,
      type: 'phylogenetic-analysis',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`🌳 Starting Phylogenetic Analysis: ${workflowId} (${sequences.length} sequences, ${bootstrapReplicates} replicates)`);

    try {
      // Step 1: Build main phylogenetic tree
      console.log(`  Building main ${method} tree...`);
      const mainTreeTask = {
        id: `${workflowId}-main-tree`,
        type: EvolutionTaskType.TREE_CONSTRUCTION,
        priority: 1,
        status: 'pending',
        data: {
          sequences,
          method,
          bootstrap: 0
        }
      };

      this.taskQueue.addTask(mainTreeTask);
      await this.waitForTask(mainTreeTask.id);
      const mainTreeResult = this.taskQueue.completedTasks.get(mainTreeTask.id);

      // Step 2: Generate bootstrap replicates using map/reduce
      if (bootstrapReplicates > 0) {
        console.log(`  Generating ${bootstrapReplicates} bootstrap replicates...`);

        // Create bootstrap datasets
        const bootstrapData = Array(bootstrapReplicates).fill(0).map((_, i) => ({
          replicateId: i,
          sequences: this.resampleSequences(sequences)
        }));

        // Map function: Build tree from bootstrap sample
        const mapFn = (sample) => {
          const taxa = sample.sequences.map(s => s.id);
          // Simple bootstrap tree (simplified for demo)
          return {
            replicateId: sample.replicateId,
            splits: this.generateSplits(taxa)
          };
        };

        // Reduce function: Calculate bootstrap support values
        const reduceFn = (bootstrapResults) => {
          const allSplits = {};

          // Count occurrences of each split
          for (const result of bootstrapResults) {
            for (const split of result.splits) {
              if (!allSplits[split]) {
                allSplits[split] = 0;
              }
              allSplits[split]++;
            }
          }

          // Calculate support percentages
          const totalReplicates = bootstrapResults.length;
          const support = {};
          for (const [split, count] of Object.entries(allSplits)) {
            support[split] = Math.round((count / totalReplicates) * 100);
          }

          return {
            totalReplicates,
            splits: Object.keys(allSplits).length,
            support
          };
        };

        const bootstrapResult = await this.distributedCompute.mapReduce(
          bootstrapData,
          mapFn.toString(),
          reduceFn.toString()
        );

        // Combine main tree with bootstrap support
        const finalResult = {
          workflowId,
          method,
          sequences: sequences.length,
          mainTree: mainTreeResult.result?.tree || mainTreeResult.tree,
          bootstrapReplicates,
          bootstrapSupport: bootstrapResult.result?.support || bootstrapResult.support,
          duration: null
        };

        workflow.status = 'completed';
        workflow.endTime = Date.now();
        workflow.duration = workflow.endTime - workflow.startTime;
        finalResult.duration = workflow.duration;

        this.results.set(workflowId, finalResult);

        console.log(`✅ Phylogenetic Analysis completed: ${workflowId} (${workflow.duration}ms)`);
        return finalResult;

      } else {
        // No bootstrap
        const finalResult = {
          workflowId,
          method,
          sequences: sequences.length,
          mainTree: mainTreeResult.result?.tree || mainTreeResult.tree,
          bootstrapReplicates: 0,
          duration: null
        };

        workflow.status = 'completed';
        workflow.endTime = Date.now();
        workflow.duration = workflow.endTime - workflow.startTime;
        finalResult.duration = workflow.duration;

        this.results.set(workflowId, finalResult);

        console.log(`✅ Phylogenetic Analysis completed: ${workflowId} (${workflow.duration}ms)`);
        return finalResult;
      }

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Phylogenetic Analysis failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW 2: POPULATION STRUCTURE ANALYSIS
  // ============================================================================

  async runPopulationStructureAnalysis(populations, individuals, loci) {
    const workflowId = `popstruct-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'population-structure',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`🧬 Starting Population Structure Analysis: ${workflowId}`);
    console.log(`  ${populations.length} populations, ${individuals} individuals, ${loci} loci`);

    try {
      // Step 1: Overall population structure
      const structureTask = {
        id: `${workflowId}-structure`,
        type: EvolutionTaskType.POPULATION_STRUCTURE,
        priority: 1,
        status: 'pending',
        data: { populations, individuals, loci }
      };

      this.taskQueue.addTask(structureTask);
      await this.waitForTask(structureTask.id);
      const structureResult = this.taskQueue.completedTasks.get(structureTask.id);

      // Step 2: Pairwise FST calculations using map/reduce
      console.log(`  Calculating pairwise FST for all population pairs...`);

      const pairs = [];
      for (let i = 0; i < populations.length; i++) {
        for (let j = i + 1; j < populations.length; j++) {
          pairs.push({
            pop1: populations[i],
            pop2: populations[j],
            loci
          });
        }
      }

      // Map function: Calculate FST for each pair
      const mapFn = (pair) => {
        const fst = Math.random() * 0.3; // Mock FST
        return {
          pop1: pair.pop1.id,
          pop2: pair.pop2.id,
          fst
        };
      };

      // Reduce function: Compile FST matrix
      const reduceFn = (fstResults) => {
        const matrix = {};
        let sum = 0;

        for (const result of fstResults) {
          const key = `${result.pop1}_${result.pop2}`;
          matrix[key] = result.fst;
          sum += result.fst;
        }

        return {
          fstMatrix: matrix,
          meanFst: sum / fstResults.length,
          pairs: fstResults.length
        };
      };

      const fstResult = await this.distributedCompute.mapReduce(
        pairs,
        mapFn.toString(),
        reduceFn.toString()
      );

      // Compile final results
      const finalResult = {
        workflowId,
        populations: populations.length,
        individuals,
        loci,
        fstMatrix: fstResult.result?.fstMatrix || fstResult.fstMatrix,
        meanFst: fstResult.result?.meanFst || fstResult.meanFst,
        admixture: structureResult.result?.admixture || structureResult.admixture,
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Population Structure Analysis completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Population Structure Analysis failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW 3: SELECTION SCAN
  // ============================================================================

  async runSelectionScan(sequences, windowSize = 1000) {
    const workflowId = `selection-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'selection-scan',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`🔍 Starting Selection Scan: ${workflowId}`);
    console.log(`  ${sequences.length} sequences, window size: ${windowSize}bp`);

    try {
      // Create sliding windows
      const sequenceLength = sequences[0].length;
      const windows = [];

      for (let i = 0; i < sequenceLength; i += windowSize) {
        windows.push({
          start: i,
          end: Math.min(i + windowSize, sequenceLength),
          sequences: sequences.map(s => ({
            id: s.id,
            sequence: s.sequence.slice(i, i + windowSize)
          }))
        });
      }

      console.log(`  Analyzing ${windows.length} windows using map/reduce...`);

      // Map function: Analyze selection in each window
      const mapFn = (window) => {
        // Calculate dN/dS ratio (mock)
        const dnds = Math.random() * 3;
        const pValue = Math.random() * 0.1;

        return {
          start: window.start,
          end: window.end,
          dnds,
          pValue,
          type: dnds > 1 ? 'positive' : dnds < 0.3 ? 'purifying' : 'neutral',
          significant: pValue < 0.05
        };
      };

      // Reduce function: Aggregate selection signals
      const reduceFn = (windowResults) => {
        const significantWindows = windowResults.filter(w => w.significant);
        const positiveSelection = significantWindows.filter(w => w.type === 'positive');
        const purifyingSelection = significantWindows.filter(w => w.type === 'purifying');

        return {
          totalWindows: windowResults.length,
          significantWindows: significantWindows.length,
          positiveSelection: positiveSelection.length,
          purifyingSelection: purifyingSelection.length,
          signals: windowResults,
          hotspots: positiveSelection.map(w => ({ start: w.start, end: w.end, dnds: w.dnds }))
        };
      };

      const selectionResult = await this.distributedCompute.mapReduce(
        windows,
        mapFn.toString(),
        reduceFn.toString()
      );

      const finalResult = {
        workflowId,
        sequences: sequences.length,
        windowSize,
        totalWindows: selectionResult.result?.totalWindows || selectionResult.totalWindows,
        significantWindows: selectionResult.result?.significantWindows || selectionResult.significantWindows,
        positiveSelection: selectionResult.result?.positiveSelection || selectionResult.positiveSelection,
        purifyingSelection: selectionResult.result?.purifyingSelection || selectionResult.purifyingSelection,
        hotspots: selectionResult.result?.hotspots || selectionResult.hotspots,
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Selection Scan completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Selection Scan failed: ${workflowId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW 4: MOLECULAR CLOCK DATING
  // ============================================================================

  async runMolecularClockDating(sequences, calibrationPoints = [], mutationRate = 1e-9) {
    const workflowId = `clock-${Date.now()}`;

    const workflow = {
      id: workflowId,
      type: 'molecular-clock',
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    this.workflows.set(workflowId, workflow);

    console.log(`⏰ Starting Molecular Clock Dating: ${workflowId}`);

    try {
      const clockTask = {
        id: `${workflowId}-divergence`,
        type: EvolutionTaskType.DIVERGENCE_TIMING,
        priority: 1,
        status: 'pending',
        data: { sequences, calibrationPoints, mutationRate }
      };

      this.taskQueue.addTask(clockTask);
      await this.waitForTask(clockTask.id);
      const clockResult = this.taskQueue.completedTasks.get(clockTask.id);

      const finalResult = {
        workflowId,
        sequences: sequences.length,
        mutationRate,
        calibrationPoints: calibrationPoints.length,
        divergenceEstimates: clockResult.result?.divergenceEstimates || clockResult.divergenceEstimates,
        clockLike: clockResult.result?.clockLike || clockResult.clockLike,
        duration: null
      };

      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      finalResult.duration = workflow.duration;

      this.results.set(workflowId, finalResult);

      console.log(`✅ Molecular Clock Dating completed: ${workflowId} (${workflow.duration}ms)`);
      return finalResult;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      console.error(`❌ Molecular Clock Dating failed: ${workflowId}`, error);
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

  resampleSequences(sequences) {
    // Bootstrap resampling with replacement
    const n = sequences.length;
    const resampled = [];

    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n);
      resampled.push(sequences[randomIndex]);
    }

    return resampled;
  }

  generateSplits(taxa) {
    // Generate mock phylogenetic splits for bootstrap
    const splits = [];
    const n = taxa.length;

    for (let i = 0; i < n - 1; i++) {
      const group1 = taxa.slice(0, i + 1).sort().join(',');
      const group2 = taxa.slice(i + 1).sort().join(',');
      splits.push(`${group1}|${group2}`);
    }

    return splits;
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
  module.exports = { EvolutionWorkflowOrchestrator };
}

console.log('✅ Evolution Workflows loaded');

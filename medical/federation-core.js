/**
 * MEDICAL AI FEDERATION CORE
 *
 * Unifies three multi-agent systems:
 * 1. Medical Data Processing Pipeline (structural, 1-3ms)
 * 2. Medical Module Plugins (extensible hooks)
 * 3. Free Coding Agent Ensemble (collaborative coding, $0/mo)
 *
 * Central Cockpit provides unified control and monitoring.
 */

import { EventEmitter } from 'events';

// Federation Status
export const FederationStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
};

// System Types
export const SystemType = {
  MEDICAL_PIPELINE: 'medical_pipeline',
  PLUGINS: 'plugins',
  CODING_ENSEMBLE: 'coding_ensemble'
};

/**
 * Federation Coordinator - Central orchestration for all systems
 */
class FederationCoordinator extends EventEmitter {
  constructor() {
    super();

    this.systems = new Map();
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      requestsPerSecond: 0,
      avgLatency: 0,
      systemHealth: {}
    };

    console.log('🔗 Medical AI Federation Coordinator initialized');
  }

  /**
   * Register a system with the federation
   */
  registerSystem(systemId, systemConfig) {
    this.systems.set(systemId, {
      id: systemId,
      type: systemConfig.type,
      name: systemConfig.name,
      status: FederationStatus.HEALTHY,
      lastHealthCheck: new Date(),
      capabilities: systemConfig.capabilities || [],
      metrics: {},
      config: systemConfig.config || {}
    });

    console.log(`➕ System registered: ${systemId} (${systemConfig.type})`);

    this.emit('system:registered', { systemId, systemConfig });
  }

  /**
   * Route a task to the appropriate system
   */
  async routeTask(task) {
    const startTime = Date.now();

    try {
      // Determine which system should handle this task
      const targetSystem = this._selectSystem(task);

      if (!targetSystem) {
        throw new Error('No suitable system available for this task');
      }

      console.log(`📤 Routing task to ${targetSystem.id}:`, task.type);

      // Execute task through the system
      const result = await this._executeSystemTask(targetSystem, task);

      // Update metrics
      const latency = Date.now() - startTime;
      this._updateMetrics(task, targetSystem, result, latency);

      return result;

    } catch (error) {
      console.error(`❌ Task execution failed:`, error);
      this.metrics.totalRequests++;

      throw error;
    }
  }

  /**
   * Select the best system for a task
   */
  _selectSystem(task) {
    // Task classification logic
    const taskType = task.type || 'unknown';
    const hasMedicalData = this._hasMedicalData(task.data);

    // System selection matrix
    if (taskType === 'structural_processing' && hasMedicalData) {
      // Use Medical Pipeline (fastest for structural tasks)
      return this.systems.get(SystemType.MEDICAL_PIPELINE);
    }

    if (taskType === 'medical_analysis' || taskType === 'clinical_reasoning') {
      // Use Coding Ensemble Clinical Analysis agent
      return this.systems.get(SystemType.CODING_ENSEMBLE);
    }

    if (taskType === 'code_generation' || taskType === 'coding_assistance') {
      // Use Coding Ensemble Code Generation agent
      return this.systems.get(SystemType.CODING_ENSEMBLE);
    }

    if (taskType === 'data_processing' || taskType === 'validation') {
      // Use Plugins system if available
      return this.systems.get(SystemType.PLUGINS);
    }

    // Default: try Coding Ensemble
    return this.systems.get(SystemType.CODING_ENSEMBLE);
  }

  /**
   * Check if task contains medical data
   */
  _hasMedicalData(data) {
    if (!data) return false;

    const dataStr = JSON.stringify(data).toLowerCase();

    // Medical keywords from the pipeline
    const medicalKeywords = [
      'symptom', 'patient', 'diagnosis', 'treatment', 'medication',
      'lab', 'test', 'imaging', 'vital', 'clinical', 'health',
      'disease', 'condition', 'therapy', 'procedure', 'surgery',
      'pharmacy', 'prescription', 'medical', 'hospital', 'clinic'
    ];

    return medicalKeywords.some(keyword => dataStr.includes(keyword));
  }

  /**
   * Execute task on a specific system
   */
  async _executeSystemTask(system, task) {
    // Import system-specific executor
    switch (system.type) {
      case SystemType.MEDICAL_PIPELINE:
        return await this._executePipelineTask(system, task);

      case SystemType.CODING_ENSEMBLE:
        return await this._executeEnsembleTask(system, task);

      case SystemType.PLUGINS:
        return await this._executePluginTask(system, task);

      default:
        throw new Error(`Unknown system type: ${system.type}`);
    }
  }

  /**
   * Execute task on Medical Pipeline
   */
  async _executePipelineTask(system, task) {
    // Import and execute pipeline
    const { createMedicalOrchestrator } = await import('./medical-workflows.js');

    const orchestrator = createMedicalOrchestrator();

    const result = await orchestrator.executePipeline(task.data);

    return {
      systemId: system.id,
      systemType: system.type,
      success: true,
      result: result,
      executionTime: result.processingTime || 0
    };
  }

  /**
   * Execute task on Coding Ensemble
   */
  async _executeEnsembleTask(system, task) {
    try {
      // Import the REAL SimpleEnsemble (not EnsembleCoordinator)
      const { getEnsemble } = await import('./free-coding-agent/src/simple-ensemble.js');

      // Get ensemble instance
      const ensemble = getEnsemble();

      // Extract message and selected agents from task data
      const message = task.data.message || JSON.stringify(task.data);
      const selectedAgents = task.data.agents || [];

      // Execute through real ensemble with Ollama
      const startTime = Date.now();
      const ensembleResult = await ensemble.execute(message, selectedAgents);
      const executionTime = Date.now() - startTime;

      // Format results for federation response
      const agentNames = ensembleResult.results?.map(r => r.agent) || [];
      const allResponses = ensembleResult.results?.map(r => r.response).join('\n\n---\n\n');

      const result = {
        mode: task.data.mode || 'parallel',
        agents: agentNames,
        summary: `Task processed by ${agentNames.length} agent(s): ${agentNames.join(', ')}`,
        details: allResponses || ensembleResult.error || 'No response'
      };

      return {
        systemId: system.id,
        systemType: system.type,
        success: true,
        result: result,
        executionTime: executionTime
      };
    } catch (error) {
      console.error('Ensemble task execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute task via Plugins
   */
  async _executePluginTask(system, task) {
    // Import plugin manager
    const { createPluginManager } = await import('./plugins/utils/plugin-manager.js');

    const pluginManager = createPluginManager({ verbose: true });

    // Execute pre-ingestion hook
    let data = await pluginManager.executeHook('pre-ingestion', task.data);

    // Execute through pipeline hooks
    data = await pluginManager.executeHook('pre-triage', data);
    data = await pluginManager.executeHook('post-triage', data);

    return {
      systemId: system.id,
      systemType: system.type,
      success: true,
      result: data,
      executionTime: 0 // Plugin system doesn't track timing
    };
  }

  /**
   * Determine which ensemble agents to use
   */
  _determineAgentRoles(task) {
    const taskType = task.type || 'general';
    const taskMessage = (task.data.message || JSON.stringify(task.data)).toLowerCase();

    // Default: Code Gen + Data Engineering
    let agents = ['code_generation', 'data_engineering'];

    // Add Clinical Analysis for medical tasks
    if (this._hasMedicalData(task.data)) {
      agents.push('clinical_analysis');
    }

    // Allow task to override
    if (task.data.agents) {
      agents = task.data.agents;
    }

    return agents;
  }

  /**
   * Update federation metrics
   */
  _updateMetrics(task, system, result, latency) {
    this.metrics.totalRequests++;

    // Update system metrics
    const sys = this.systems.get(system.id);
    if (sys) {
      sys.metrics.requests = (sys.metrics.requests || 0) + 1;

      // Calculate system-specific metrics
      if (sys.metrics.requests === 1) {
        sys.metrics.avgLatency = latency;
      } else {
        sys.metrics.avgLatency = ((sys.metrics.avgLatency * (sys.metrics.requests - 1)) + latency) / sys.metrics.requests;
      }

      // Check system health
      if (latency > 5000) { // 5 seconds is slow
        sys.status = FederationStatus.DEGRADED;
      } else {
        sys.status = FederationStatus.HEALTHY;
      }
    }

    // Update overall metrics
    const elapsed = (Date.now() - this.metrics.startTime) / 1000; // seconds
    this.metrics.requestsPerSecond = this.metrics.totalRequests / elapsed;

    if (this.metrics.totalRequests % 10 === 0) { // Every 10 requests
      console.log(`📊 Federation Metrics: ${this.metrics.requestsPerSecond.toFixed(2)} req/s, ${this.metrics.avgLatency.toFixed(0)}ms avg latency`);
    }
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const systems = Array.from(this.systems.entries()).map(([id, sys]) => ({
      id,
      type: sys.type,
      name: sys.name,
      status: sys.status,
      capabilities: sys.capabilities,
      metrics: sys.metrics
    }));

    return {
      coordinator: {
        uptime: Date.now() - this.metrics.startTime,
        totalRequests: this.metrics.totalRequests,
        requestsPerSecond: this.metrics.requestsPerSecond,
        avgLatency: this.metrics.avgLatency,
        systemHealth: this.metrics.systemHealth
      },
      systems,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check all systems
   */
  async healthCheck() {
    for (const [id, system] of this.systems) {
      const isHealthy = await this._checkSystemHealth(system);

      system.status = isHealthy ? FederationStatus.HEALTHY : FederationStatus.UNHEALTHY;
      system.lastHealthCheck = new Date();

      this.emit('system:health:changed', { systemId: id, status: system.status });
    }

    return this.getSystemStatus();
  }

  /**
   * Check health of a specific system
   */
  async _checkSystemHealth(system) {
    // In production, ping system endpoints
    // For now, assume healthy
    return true;
  }
}

// Singleton instance
let federationInstance = null;

/**
 * Get federation coordinator singleton
 */
export function getFederationCoordinator() {
  if (!federationInstance) {
    federationInstance = new FederationCoordinator();
  }
  return federationInstance;
}

export { FederationCoordinator };

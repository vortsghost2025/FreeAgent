/**
 * Distributed Ensemble Coordinator
 *
 * The main orchestrator for the FREE 8-Agent Multi-AI Ensemble.
 * Coordinates all components:
 * - Provider Pool (local + cloud free tiers)
 * - VPS Connector (remote Ollama instances)
 * - Agent Discovery
 * - Health Monitor
 * - Load Balancer
 * - P2P Mesh Network
 * - Dashboard Server
 * - Cost Tracker
 *
 * Total Cost: $0/month
 */

import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";

// Import all components
import {
  ProviderPool,
  LOAD_BALANCE_STRATEGY,
} from "./providers/provider-pool.js";
import { VPSConnector } from "./distributed/vps-connector.js";
import {
  AgentDiscovery,
  AGENT_CAPABILITY,
} from "./distributed/agent-discovery.js";
import {
  HealthMonitor,
  createOllamaHealthCheck,
} from "./distributed/health-monitor.js";
import {
  LoadBalancer,
  STRATEGY,
  LOCATION,
} from "./distributed/load-balancer.js";
import { P2PMesh } from "./distributed/p2p-mesh.js";
import { DashboardServer } from "./cockpit/dashboard-server.js";
import { CostTracker } from "./cockpit/cost-tracker.js";

// Agent role definitions
export const AGENT_ROLES = {
  AG1: {
    id: "AG1",
    name: "CodeGeneration",
    capability: AGENT_CAPABILITY.CODE_GENERATION,
  },
  AG2: {
    id: "AG2",
    name: "DataEngineering",
    capability: AGENT_CAPABILITY.DATA_ENGINEERING,
  },
  AG3: {
    id: "AG3",
    name: "ClinicalAnalysis",
    capability: AGENT_CAPABILITY.CLINICAL_ANALYSIS,
  },
  AG4: { id: "AG4", name: "Testing", capability: AGENT_CAPABILITY.TESTING },
  AG5: { id: "AG5", name: "Security", capability: AGENT_CAPABILITY.SECURITY },
  AG6: {
    id: "AG6",
    name: "APIIntegration",
    capability: AGENT_CAPABILITY.API_INTEGRATION,
  },
  AG7: { id: "AG7", name: "Database", capability: AGENT_CAPABILITY.DATABASE },
  AG8: { id: "AG8", name: "DevOps", capability: AGENT_CAPABILITY.DEVOPS },
};

export class DistributedEnsemble extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.initialized = false;

    // Core components
    this.providerPool = null;
    this.vpsConnector = null;
    this.agentDiscovery = null;
    this.healthMonitor = null;
    this.loadBalancer = null;
    this.p2pMesh = null;
    this.dashboardServer = null;
    this.costTracker = null;

    // Task management
    this.activeTasks = new Map();
    this.taskHistory = [];
    this.maxTaskHistory = 1000;

    // Agent assignments
    this.agentAssignments = new Map();

    console.log("🎮 Distributed Ensemble Coordinator created");
  }

  /**
   * Initialize all components
   */
  async initialize() {
    console.log("🚀 Initializing FREE Distributed AI Ensemble...");
    console.log("================================================");

    try {
      // 1. Initialize Cost Tracker (always $0!)
      console.log("💰 Initializing Cost Tracker...");
      this.costTracker = new CostTracker();

      // 2. Initialize Provider Pool
      console.log("🎱 Initializing Provider Pool...");
      this.providerPool = new ProviderPool({
        strategy: LOAD_BALANCE_STRATEGY.LOCAL_FIRST,
        remoteOllama: this.config.vps || [],
      });
      await this.providerPool.initialize();

      // 3. Initialize VPS Connector
      console.log("🌐 Initializing VPS Connector...");
      this.vpsConnector = new VPSConnector({
        vps: this.config.vps || [],
      });
      await this.vpsConnector.initialize();

      // 4. Initialize Agent Discovery
      console.log("🔍 Initializing Agent Discovery...");
      this.agentDiscovery = new AgentDiscovery();
      await this.agentDiscovery.initialize();

      // 5. Initialize Health Monitor
      console.log("🏥 Initializing Health Monitor...");
      this.healthMonitor = new HealthMonitor();
      await this.setupHealthMonitoring();

      // 6. Initialize Load Balancer
      console.log("⚖️ Initializing Load Balancer...");
      this.loadBalancer = new LoadBalancer({
        strategy: STRATEGY.LOCAL_FIRST,
      });
      await this.setupLoadBalancer();

      // 7. Initialize P2P Mesh (optional)
      if (this.config.enableP2P !== false) {
        console.log("🌐 Initializing P2P Mesh Network...");
        this.p2pMesh = new P2PMesh({
          port: this.config.p2pPort || 9876,
          knownPeers: this.config.knownPeers || [],
        });
        await this.p2pMesh.initialize();
      }

      // 8. Initialize Dashboard Server
      console.log("📊 Initializing Dashboard Server...");
      this.dashboardServer = new DashboardServer({
        httpPort: this.config.httpPort || 3000,
        wsPort: this.config.wsPort || 3001,
        healthMonitor: this.healthMonitor,
        loadBalancer: this.loadBalancer,
        providerPool: this.providerPool,
        costTracker: this.costTracker,
      });
      await this.dashboardServer.initialize();

      // Setup event handlers
      this.setupEventHandlers();

      // Assign agents to providers
      await this.assignAgents();

      this.initialized = true;

      console.log("================================================");
      console.log("🎉 FREE Distributed AI Ensemble Ready!");
      console.log(
        `📊 Dashboard: http://localhost:${this.config.httpPort || 3000}/cockpit`,
      );
      console.log("💰 Total Cost: $0.00 (All FREE!)");
      console.log("================================================");

      this.emit("initialized", this.getStatus());
    } catch (error) {
      console.error("❌ Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Setup health monitoring for all providers
   */
  async setupHealthMonitoring() {
    const entities = [];

    // Local Ollama
    entities.push({
      id: "ollama-local",
      name: "Local Ollama",
      type: "local",
      checkFn: createOllamaHealthCheck("http://localhost:11434"),
    });

    // VPS instances
    for (const vps of this.config.vps || []) {
      entities.push({
        id: `vps-${vps.id || vps.name}`,
        name: vps.name || vps.host,
        type: "vps",
        checkFn: createOllamaHealthCheck(vps.url || `http://${vps.host}:11434`),
      });
    }

    await this.healthMonitor.initialize(entities);
  }

  /**
   * Setup load balancer with all providers
   */
  async setupLoadBalancer() {
    // Register local providers
    this.loadBalancer.registerProvider({
      id: "ollama-local",
      location: LOCATION.LOCAL,
      capabilities: [
        AGENT_CAPABILITY.CODE_GENERATION,
        AGENT_CAPABILITY.TESTING,
        AGENT_CAPABILITY.DATABASE,
      ],
      weight: 10, // High priority for local
    });

    // Register VPS providers
    for (const vps of this.config.vps || []) {
      this.loadBalancer.registerProvider({
        id: `vps-${vps.id || vps.name}`,
        location: LOCATION.VPS,
        capabilities: vps.capabilities || [],
        weight: 5,
      });
    }

    // Register cloud API providers
    this.loadBalancer.registerProvider({
      id: "groq-free",
      location: LOCATION.CLOUD_API,
      capabilities: Object.values(AGENT_CAPABILITY),
      weight: 3,
    });

    this.loadBalancer.registerProvider({
      id: "openrouter-free",
      location: LOCATION.CLOUD_API,
      capabilities: Object.values(AGENT_CAPABILITY),
      weight: 2,
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Provider pool events
    this.providerPool.on("failover", (data) => {
      this.dashboardServer.broadcastLog(
        "warning",
        `Failover: ${data.from} → next provider`,
      );
      this.costTracker.recordUsage(data.from, 0);
    });

    // Health monitor events
    this.healthMonitor.on("alert", (alert) => {
      this.dashboardServer.broadcastAlert(
        alert.severity,
        alert.message,
        alert.entityId,
      );
    });

    // VPS connector events
    this.vpsConnector.on("connected", (data) => {
      this.dashboardServer.broadcastLog("success", `VPS connected: ${data.id}`);
    });

    this.vpsConnector.on("disconnected", (data) => {
      this.dashboardServer.broadcastLog(
        "warning",
        `VPS disconnected: ${data.id}`,
      );
    });

    // Dashboard events
    this.dashboardServer.on("task_submitted", (data) => {
      this.executeTask(data.task, data.capability);
    });

    // P2P events
    if (this.p2pMesh) {
      this.p2pMesh.on("peer_connected", (data) => {
        this.dashboardServer.broadcastLog(
          "info",
          `P2P peer connected: ${data.nodeName}`,
        );
      });

      this.p2pMesh.on("task_received", (data) => {
        this.executeTask(data.task, data.capability);
      });
    }
  }

  /**
   * Assign agents to providers
   */
  async assignAgents() {
    // Default agent assignments
    const assignments = {
      AG1: { provider: "ollama-local", model: "llama3.2:8b" },
      AG2: { provider: "vps-oracle", model: "mistral:7b" },
      AG3: { provider: "vps-hostinger", model: "meditron:7b" },
      AG4: { provider: "ollama-local", model: "phi3:3.8b" },
      AG5: { provider: "vps-alibaba", model: "codellama:7b" },
      AG6: { provider: "groq-free", model: "llama-3.3-70b-versatile" },
      AG7: { provider: "ollama-local", model: "deepseek-coder:6.7b" },
      AG8: { provider: "vps-oracle", model: "llama3.2:8b" },
    };

    for (const [agentId, assignment] of Object.entries(assignments)) {
      this.agentAssignments.set(agentId, {
        ...AGENT_ROLES[agentId],
        ...assignment,
        status: "ready",
      });
    }

    console.log(
      `✅ Assigned ${this.agentAssignments.size} agents to providers`,
    );
  }

  /**
   * Execute a task with the ensemble
   */
  async executeTask(task, capability = null, options = {}) {
    const taskId = uuidv4();
    const startTime = Date.now();

    console.log(`📋 Executing task ${taskId}: "${task.substring(0, 50)}..."`);

    // Create task record
    const taskRecord = {
      id: taskId,
      task,
      capability,
      status: "running",
      startTime,
      agents: [],
      results: [],
    };

    this.activeTasks.set(taskId, taskRecord);
    this.dashboardServer.broadcastTaskUpdate(taskId, "running");

    try {
      // Select agents based on capability
      const agents = capability
        ? this.getAgentsByCapability(capability)
        : Array.from(this.agentAssignments.values());

      // Execute with selected agents
      const results = await Promise.all(
        agents.map((agent) => this.executeWithAgent(agent, task, taskId)),
      );

      // Aggregate results
      taskRecord.results = results;
      taskRecord.status = "completed";
      taskRecord.endTime = Date.now();
      taskRecord.duration = taskRecord.endTime - startTime;

      // Record usage (always $0)
      this.costTracker.recordUsage("ensemble", 0);

      // Move to history
      this.activeTasks.delete(taskId);
      this.taskHistory.unshift(taskRecord);
      if (this.taskHistory.length > this.maxTaskHistory) {
        this.taskHistory.pop();
      }

      this.dashboardServer.broadcastTaskUpdate(taskId, "completed", results);
      this.dashboardServer.broadcastLog(
        "success",
        `Task ${taskId} completed in ${taskRecord.duration}ms`,
      );

      return {
        taskId,
        status: "completed",
        duration: taskRecord.duration,
        results,
      };
    } catch (error) {
      taskRecord.status = "failed";
      taskRecord.error = error.message;

      this.dashboardServer.broadcastTaskUpdate(taskId, "failed", null);
      this.dashboardServer.broadcastLog(
        "error",
        `Task ${taskId} failed: ${error.message}`,
      );

      throw error;
    }
  }

  /**
   * Execute task with a specific agent
   */
  async executeWithAgent(agent, task, taskId) {
    const startTime = Date.now();

    try {
      // Get provider for this agent
      let response = "";

      for await (const chunk of this.providerPool.chat(task, {
        capability: agent.capability,
      })) {
        response += chunk;
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        response,
        duration: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        agentId: agent.id,
        agentName: agent.name,
        error: error.message,
        duration: Date.now() - startTime,
        success: false,
      };
    }
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability) {
    const agents = [];

    for (const agent of this.agentAssignments.values()) {
      if (agent.capability === capability) {
        agents.push(agent);
      }
    }

    return agents.length > 0
      ? agents
      : Array.from(this.agentAssignments.values());
  }

  /**
   * Get ensemble status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      agents: Object.fromEntries(this.agentAssignments),
      activeTasks: this.activeTasks.size,
      completedTasks: this.taskHistory.length,
      providers: this.providerPool?.getStats() || {},
      health: this.healthMonitor?.getDashboardData() || {},
      cost: this.costTracker?.getCostSummary() || { totalCost: 0 },
      p2p: this.p2pMesh?.getStatus() || null,
    };
  }

  /**
   * Shutdown ensemble
   */
  async shutdown() {
    console.log("🛑 Shutting down Distributed Ensemble...");

    if (this.dashboardServer) this.dashboardServer.shutdown();
    if (this.p2pMesh) this.p2pMesh.shutdown();
    if (this.healthMonitor) this.healthMonitor.shutdown();
    if (this.loadBalancer) this.loadBalancer.shutdown();
    if (this.vpsConnector) this.vpsConnector.shutdown();
    if (this.agentDiscovery) this.agentDiscovery.shutdown();

    this.initialized = false;
    console.log("✅ Distributed Ensemble shutdown complete");
  }
}

// Export for CLI usage
export default DistributedEnsemble;

// Quick start function
export async function startEnsemble(config = {}) {
  const ensemble = new DistributedEnsemble(config);
  await ensemble.initialize();
  return ensemble;
}

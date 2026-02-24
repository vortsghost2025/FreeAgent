/**
 * Agent Discovery - Auto-discover Available Agents
 *
 * Discovers and tracks all available agents across:
 * - Local machine (Ollama, LM Studio)
 * - Remote VPS instances
 * - P2P mesh network
 *
 * Features:
 * - mDNS/Bonjour discovery
 * - Manual registration
 * - Capability detection
 * - Network topology mapping
 * - Real-time status updates
 */

import { EventEmitter } from "events";

// Agent types
export const AGENT_TYPE = {
  LOCAL_OLLAMA: "local_ollama",
  LOCAL_LMSTUDIO: "local_lmstudio",
  REMOTE_VPS: "remote_vps",
  CLOUD_API: "cloud_api",
  P2P_PEER: "p2p_peer",
};

// Agent capabilities
export const AGENT_CAPABILITY = {
  CODE_GENERATION: "code_generation",
  DATA_ENGINEERING: "data_engineering",
  CLINICAL_ANALYSIS: "clinical_analysis",
  TESTING: "testing",
  SECURITY: "security",
  API_INTEGRATION: "api_integration",
  DATABASE: "database",
  DEVOPS: "devops",
};

export class AgentDiscovery extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.agents = new Map();
    this.discoveryInterval = config.discoveryInterval || 60000; // 1 minute
    this.discoveryTimer = null;

    // Discovery sources
    this.localEndpoints = config.localEndpoints || [
      { type: AGENT_TYPE.LOCAL_OLLAMA, url: "http://localhost:11434" },
      { type: AGENT_TYPE.LOCAL_LMSTUDIO, url: "http://localhost:1234/v1" },
    ];

    console.log("🔍 Agent Discovery initialized");
  }

  /**
   * Initialize discovery
   */
  async initialize() {
    console.log("🔧 Starting agent discovery...");

    // Discover local agents
    await this.discoverLocalAgents();

    // Start periodic discovery
    this.startPeriodicDiscovery();

    console.log(`✅ Agent Discovery ready with ${this.agents.size} agents`);
    this.emit("initialized", { agentCount: this.agents.size });
  }

  /**
   * Discover local agents (Ollama, LM Studio)
   */
  async discoverLocalAgents() {
    for (const endpoint of this.localEndpoints) {
      try {
        const agent = await this.probeEndpoint(endpoint);
        if (agent) {
          this.registerAgent(agent);
        }
      } catch (error) {
        console.warn(
          `⚠️ Failed to discover ${endpoint.type}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Probe an endpoint to discover agent capabilities
   */
  async probeEndpoint(endpoint) {
    const { type, url } = endpoint;

    try {
      let response;
      let models = [];

      if (type === AGENT_TYPE.LOCAL_OLLAMA || type === AGENT_TYPE.REMOTE_VPS) {
        // Ollama API
        response = await fetch(`${url}/api/tags`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          models = data.models?.map((m) => m.name) || [];
        }
      } else if (type === AGENT_TYPE.LOCAL_LMSTUDIO) {
        // LM Studio (OpenAI-compatible)
        response = await fetch(`${url}/models`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          models = data.data?.map((m) => m.id) || [];
        }
      }

      if (!response?.ok) {
        return null;
      }

      // Determine capabilities based on models
      const capabilities = this.detectCapabilities(models);

      return {
        id: `${type}-${url.replace(/[^a-z0-9]/gi, "-")}`,
        type,
        url,
        models,
        capabilities,
        status: "available",
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect agent capabilities based on loaded models
   */
  detectCapabilities(models) {
    const capabilities = new Set();

    for (const model of models) {
      const modelLower = model.toLowerCase();

      // Code-focused models
      if (
        modelLower.includes("code") ||
        modelLower.includes("deepseek") ||
        modelLower.includes("starcoder")
      ) {
        capabilities.add(AGENT_CAPABILITY.CODE_GENERATION);
        capabilities.add(AGENT_CAPABILITY.DATABASE);
      }

      // General purpose models
      if (
        modelLower.includes("llama") ||
        modelLower.includes("mistral") ||
        modelLower.includes("phi")
      ) {
        capabilities.add(AGENT_CAPABILITY.CODE_GENERATION);
        capabilities.add(AGENT_CAPABILITY.DATA_ENGINEERING);
        capabilities.add(AGENT_CAPABILITY.TESTING);
        capabilities.add(AGENT_CAPABILITY.API_INTEGRATION);
      }

      // Medical models
      if (
        modelLower.includes("meditron") ||
        modelLower.includes("medical") ||
        modelLower.includes("clinical")
      ) {
        capabilities.add(AGENT_CAPABILITY.CLINICAL_ANALYSIS);
      }

      // Security-focused
      if (modelLower.includes("security") || modelLower.includes("audit")) {
        capabilities.add(AGENT_CAPABILITY.SECURITY);
      }

      // DevOps
      if (
        modelLower.includes("devops") ||
        modelLower.includes("docker") ||
        modelLower.includes("kubernetes")
      ) {
        capabilities.add(AGENT_CAPABILITY.DEVOPS);
      }
    }

    // Default capabilities for general models
    if (capabilities.size === 0 && models.length > 0) {
      capabilities.add(AGENT_CAPABILITY.CODE_GENERATION);
      capabilities.add(AGENT_CAPABILITY.DATA_ENGINEERING);
    }

    return Array.from(capabilities);
  }

  /**
   * Register an agent
   */
  registerAgent(agent) {
    const existing = this.agents.get(agent.id);

    if (existing) {
      // Update existing agent
      existing.lastSeen = Date.now();
      existing.status = agent.status;
      existing.models = agent.models;
      existing.capabilities = agent.capabilities;

      this.emit("agent_updated", existing);
    } else {
      // New agent
      this.agents.set(agent.id, agent);
      console.log(
        `✅ Discovered agent: ${agent.id} (${agent.capabilities.join(", ")})`,
      );
      this.emit("agent_discovered", agent);
    }
  }

  /**
   * Manually register an agent
   */
  manualRegister(agentConfig) {
    const agent = {
      id: agentConfig.id || `manual-${Date.now()}`,
      type: agentConfig.type || AGENT_TYPE.REMOTE_VPS,
      url: agentConfig.url,
      models: agentConfig.models || [],
      capabilities: agentConfig.capabilities || [],
      status: "registered",
      discoveredAt: Date.now(),
      lastSeen: Date.now(),
      manual: true,
    };

    this.registerAgent(agent);
    return agent;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.emit("agent_removed", agent);
    }
  }

  /**
   * Start periodic discovery
   */
  startPeriodicDiscovery() {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
    }

    this.discoveryTimer = setInterval(() => {
      this.runDiscovery();
    }, this.discoveryInterval);
  }

  /**
   * Stop periodic discovery
   */
  stopPeriodicDiscovery() {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
  }

  /**
   * Run a discovery cycle
   */
  async runDiscovery() {
    console.log("🔍 Running agent discovery...");

    // Discover local agents
    await this.discoverLocalAgents();

    // Check existing agents
    for (const [id, agent] of this.agents) {
      try {
        const probed = await this.probeEndpoint({
          type: agent.type,
          url: agent.url,
        });

        if (probed) {
          agent.lastSeen = Date.now();
          agent.status = "available";
          agent.models = probed.models;
          agent.capabilities = probed.capabilities;
        } else {
          agent.status = "unavailable";
        }
      } catch {
        agent.status = "unavailable";
      }
    }

    // Remove stale agents (not seen in 5 minutes, unless manual)
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    for (const [id, agent] of this.agents) {
      if (!agent.manual && agent.lastSeen < staleThreshold) {
        this.unregisterAgent(id);
      }
    }

    this.emit("discovery_complete", { agentCount: this.agents.size });
  }

  /**
   * Get all discovered agents
   */
  getAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability) {
    return this.getAgents().filter(
      (agent) =>
        agent.capabilities.includes(capability) && agent.status === "available",
    );
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type) {
    return this.getAgents().filter((agent) => agent.type === type);
  }

  /**
   * Get available agents
   */
  getAvailableAgents() {
    return this.getAgents().filter((agent) => agent.status === "available");
  }

  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.agents.get(id);
  }

  /**
   * Get network topology
   */
  getTopology() {
    const topology = {
      local: [],
      remote: [],
      cloud: [],
      p2p: [],
    };

    for (const agent of this.agents.values()) {
      switch (agent.type) {
        case AGENT_TYPE.LOCAL_OLLAMA:
        case AGENT_TYPE.LOCAL_LMSTUDIO:
          topology.local.push(agent);
          break;
        case AGENT_TYPE.REMOTE_VPS:
          topology.remote.push(agent);
          break;
        case AGENT_TYPE.CLOUD_API:
          topology.cloud.push(agent);
          break;
        case AGENT_TYPE.P2P_PEER:
          topology.p2p.push(agent);
          break;
      }
    }

    return topology;
  }

  /**
   * Get discovery statistics
   */
  getStats() {
    const agents = this.getAgents();
    const available = agents.filter((a) => a.status === "available");

    const byType = {};
    const byCapability = {};

    for (const agent of agents) {
      byType[agent.type] = (byType[agent.type] || 0) + 1;

      for (const cap of agent.capabilities) {
        byCapability[cap] = (byCapability[cap] || 0) + 1;
      }
    }

    return {
      totalAgents: agents.length,
      availableAgents: available.length,
      byType,
      byCapability,
      topology: this.getTopology(),
    };
  }

  /**
   * Shutdown discovery
   */
  shutdown() {
    this.stopPeriodicDiscovery();
    this.agents.clear();
    console.log("🔍 Agent Discovery shutdown complete");
  }
}

export default AgentDiscovery;

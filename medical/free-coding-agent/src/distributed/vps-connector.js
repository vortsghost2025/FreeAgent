/**
 * VPS Connector - Connect to Remote Ollama Instances
 *
 * Manages connections to Ollama instances running on VPS:
 * - Oracle Cloud Free Tier
 * - Hostinger VPS
 * - Alibaba ECS
 *
 * Features:
 * - SSH tunnel support
 * - Direct HTTP connection
 * - Health checking
 * - Automatic reconnection
 * - Load distribution
 */

import { EventEmitter } from "events";
import { OllamaProvider } from "../providers/ollama.js";

// Connection states
export const CONNECTION_STATE = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
  RECONNECTING: "reconnecting",
};

export class VPSConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.connections = new Map();
    this.healthCheckInterval = config.healthCheckInterval || 30000; // 30 seconds
    this.reconnectDelay = config.reconnectDelay || 5000; // 5 seconds
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;

    // VPS configurations
    this.vpsConfigs = config.vps || [];

    // Health check timer
    this.healthTimer = null;

    console.log("🌐 VPS Connector initialized");
  }

  /**
   * Initialize connections to all configured VPS instances
   */
  async initialize() {
    console.log("🔧 Initializing VPS connections...");

    for (const vps of this.vpsConfigs) {
      await this.connect(vps);
    }

    // Start health check loop
    this.startHealthCheck();

    console.log(
      `✅ VPS Connector ready with ${this.getConnectedCount()} connections`,
    );
    this.emit("initialized", { connections: this.getConnectedCount() });
  }

  /**
   * Connect to a VPS instance
   */
  async connect(vpsConfig) {
    const id = vpsConfig.id || vpsConfig.name || vpsConfig.host;

    console.log(`🔌 Connecting to VPS: ${id}...`);

    const connection = {
      id,
      config: vpsConfig,
      state: CONNECTION_STATE.CONNECTING,
      provider: null,
      lastCheck: null,
      latency: null,
      reconnectAttempts: 0,
      error: null,
    };

    this.connections.set(id, connection);

    try {
      // Create Ollama provider for this VPS
      const provider = new OllamaProvider({
        baseUrl:
          vpsConfig.url ||
          `http://${vpsConfig.host}:${vpsConfig.port || 11434}`,
        model: vpsConfig.model || "llama3.2:8b",
      });

      // Test connection
      const startTime = Date.now();
      const available = await provider.isAvailable();
      const latency = Date.now() - startTime;

      if (available) {
        connection.provider = provider;
        connection.state = CONNECTION_STATE.CONNECTED;
        connection.latency = latency;
        connection.lastCheck = Date.now();
        connection.reconnectAttempts = 0;

        console.log(`✅ Connected to VPS: ${id} (latency: ${latency}ms)`);
        this.emit("connected", { id, latency });
      } else {
        throw new Error("VPS Ollama not responding");
      }
    } catch (error) {
      connection.state = CONNECTION_STATE.ERROR;
      connection.error = error.message;
      connection.lastCheck = Date.now();

      console.error(`❌ Failed to connect to VPS ${id}: ${error.message}`);
      this.emit("connection_error", { id, error: error.message });

      // Schedule reconnection
      this.scheduleReconnect(id);
    }

    return connection;
  }

  /**
   * Disconnect from a VPS instance
   */
  disconnect(id) {
    const connection = this.connections.get(id);
    if (!connection) return;

    connection.state = CONNECTION_STATE.DISCONNECTED;
    connection.provider = null;

    console.log(`🔌 Disconnected from VPS: ${id}`);
    this.emit("disconnected", { id });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(id) {
    const connection = this.connections.get(id);
    if (!connection) return;

    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts reached for VPS: ${id}`);
      this.emit("max_reconnects", { id });
      return;
    }

    connection.state = CONNECTION_STATE.RECONNECTING;
    connection.reconnectAttempts++;

    const delay = this.reconnectDelay * connection.reconnectAttempts;

    console.log(
      `🔄 Scheduling reconnect for VPS ${id} in ${delay}ms (attempt ${connection.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect(connection.config);
    }, delay);
  }

  /**
   * Start health check loop
   */
  startHealthCheck() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
    }

    this.healthTimer = setInterval(() => {
      this.checkAllHealth();
    }, this.healthCheckInterval);
  }

  /**
   * Stop health check loop
   */
  stopHealthCheck() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  /**
   * Check health of all connections
   */
  async checkAllHealth() {
    const results = {};

    for (const [id, connection] of this.connections) {
      results[id] = await this.checkHealth(id);
    }

    this.emit("health_check_complete", results);
    return results;
  }

  /**
   * Check health of a specific connection
   */
  async checkHealth(id) {
    const connection = this.connections.get(id);
    if (!connection) return null;

    if (!connection.provider) {
      return {
        id,
        healthy: false,
        state: connection.state,
        error: connection.error,
      };
    }

    try {
      const startTime = Date.now();
      const available = await connection.provider.isAvailable();
      const latency = Date.now() - startTime;

      connection.lastCheck = Date.now();
      connection.latency = latency;

      if (available) {
        connection.state = CONNECTION_STATE.CONNECTED;
        connection.error = null;

        return {
          id,
          healthy: true,
          state: CONNECTION_STATE.CONNECTED,
          latency,
        };
      } else {
        throw new Error("Health check failed");
      }
    } catch (error) {
      connection.state = CONNECTION_STATE.ERROR;
      connection.error = error.message;

      // Schedule reconnection
      this.scheduleReconnect(id);

      return {
        id,
        healthy: false,
        state: CONNECTION_STATE.ERROR,
        error: error.message,
      };
    }
  }

  /**
   * Get a connected provider by ID
   */
  getProvider(id) {
    const connection = this.connections.get(id);
    if (!connection || connection.state !== CONNECTION_STATE.CONNECTED) {
      return null;
    }
    return connection.provider;
  }

  /**
   * Get all connected providers
   */
  getConnectedProviders() {
    const providers = [];

    for (const [id, connection] of this.connections) {
      if (
        connection.state === CONNECTION_STATE.CONNECTED &&
        connection.provider
      ) {
        providers.push({
          id,
          provider: connection.provider,
          latency: connection.latency,
        });
      }
    }

    return providers;
  }

  /**
   * Get count of connected VPS instances
   */
  getConnectedCount() {
    let count = 0;
    for (const connection of this.connections.values()) {
      if (connection.state === CONNECTION_STATE.CONNECTED) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get connection status for all VPS
   */
  getStatus() {
    const status = {};

    for (const [id, connection] of this.connections) {
      status[id] = {
        state: connection.state,
        latency: connection.latency,
        lastCheck: connection.lastCheck,
        reconnectAttempts: connection.reconnectAttempts,
        error: connection.error,
        config: {
          host: connection.config.host,
          model: connection.config.model,
        },
      };
    }

    return status;
  }

  /**
   * Execute chat on best available VPS
   */
  async *chat(message, options = {}) {
    const providers = this.getConnectedProviders();

    if (providers.length === 0) {
      throw new Error("No VPS connections available");
    }

    // Sort by latency
    providers.sort((a, b) => (a.latency || 9999) - (b.latency || 9999));

    let lastError = null;

    for (const { id, provider } of providers) {
      try {
        for await (const chunk of provider.chat(message, options)) {
          yield chunk;
        }
        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ VPS ${id} failed: ${error.message}`);

        // Mark as unhealthy
        const connection = this.connections.get(id);
        if (connection) {
          connection.state = CONNECTION_STATE.ERROR;
          connection.error = error.message;
        }
      }
    }

    throw lastError || new Error("All VPS connections failed");
  }

  /**
   * Add a new VPS configuration
   */
  async addVPS(vpsConfig) {
    this.vpsConfigs.push(vpsConfig);
    return await this.connect(vpsConfig);
  }

  /**
   * Remove a VPS configuration
   */
  removeVPS(id) {
    this.disconnect(id);
    this.connections.delete(id);
    this.vpsConfigs = this.vpsConfigs.filter(
      (v) => (v.id || v.name || v.host) !== id,
    );
  }

  /**
   * Shutdown all connections
   */
  shutdown() {
    this.stopHealthCheck();

    for (const id of this.connections.keys()) {
      this.disconnect(id);
    }

    this.connections.clear();
    console.log("🔌 VPS Connector shutdown complete");
  }
}

// Default VPS configurations for common providers
export const DEFAULT_VPS_CONFIGS = {
  oracle: {
    id: "oracle-vps",
    name: "Oracle Cloud",
    host: "oracle-vps.example.com",
    port: 11434,
    model: "llama3.2:8b",
    description: "Oracle Cloud Free Tier ARM instance",
  },
  hostinger: {
    id: "hostinger-vps",
    name: "Hostinger VPS",
    host: "hostinger-vps.example.com",
    port: 11434,
    model: "mistral:7b",
    description: "Hostinger VPS instance",
  },
  alibaba: {
    id: "alibaba-ecs",
    name: "Alibaba ECS",
    host: "alibaba-ecs.example.com",
    port: 11434,
    model: "codellama:7b",
    description: "Alibaba Cloud ECS instance",
  },
};

export default VPSConnector;

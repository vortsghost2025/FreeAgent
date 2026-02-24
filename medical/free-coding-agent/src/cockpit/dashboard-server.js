/**
 * Dashboard Server - WebSocket Server for Cockpit UI
 *
 * Provides real-time updates to the cockpit dashboard:
 * - Agent status updates
 * - Task queue updates
 * - Metrics streaming
 * - Log streaming
 * - Alert notifications
 */

import { EventEmitter } from "events";
import { WebSocketServer } from "ws";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Message types for WebSocket communication
export const WS_MESSAGE_TYPE = {
  // Server -> Client
  AGENT_STATUS: "agent_status",
  TASK_UPDATE: "task_update",
  METRICS_UPDATE: "metrics_update",
  LOG_ENTRY: "log_entry",
  ALERT: "alert",
  SYSTEM_STATUS: "system_status",
  COST_UPDATE: "cost_update",

  // Client -> Server
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  SUBMIT_TASK: "submit_task",
  CANCEL_TASK: "cancel_task",
  AGENT_COMMAND: "agent_command",
  GET_STATUS: "get_status",
};

export class DashboardServer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;

    // HTTP server
    this.app = express();
    this.httpServer = null;
    this.httpPort = config.httpPort || 3000;

    // WebSocket server
    this.wss = null;
    this.wsPort = config.wsPort || 3001;

    // Connected clients
    this.clients = new Map();

    // Data sources
    this.healthMonitor = config.healthMonitor;
    this.loadBalancer = config.loadBalancer;
    this.providerPool = config.providerPool;
    this.agentDiscovery = config.agentDiscovery;
    this.costTracker = config.costTracker;

    // Log buffer
    this.logBuffer = [];
    this.maxLogBuffer = 1000;

    // Update intervals
    this.metricsInterval = config.metricsInterval || 5000;
    this.metricsTimer = null;

    console.log("📊 Dashboard Server initialized");
  }

  /**
   * Initialize dashboard server
   */
  async initialize() {
    console.log("🔧 Starting dashboard server...");

    // Setup Express routes
    this.setupRoutes();

    // Start HTTP server
    await this.startHttpServer();

    // Start WebSocket server
    await this.startWebSocketServer();

    // Start metrics broadcasting
    this.startMetricsBroadcast();

    console.log(
      `✅ Dashboard server ready at http://localhost:${this.httpPort}`,
    );
    this.emit("initialized", { httpPort: this.httpPort, wsPort: this.wsPort });
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, "../../public")));

    // JSON body parser
    this.app.use(express.json());

    // API routes
    this.app.get("/api/status", (req, res) => {
      res.json(this.getSystemStatus());
    });

    this.app.get("/api/agents", (req, res) => {
      res.json(this.getAgentStatus());
    });

    this.app.get("/api/metrics", (req, res) => {
      res.json(this.getMetrics());
    });

    this.app.get("/api/logs", (req, res) => {
      const limit = parseInt(req.query.limit) || 100;
      res.json(this.logBuffer.slice(-limit));
    });

    this.app.get("/api/cost", (req, res) => {
      res.json(this.getCostData());
    });

    this.app.post("/api/task", (req, res) => {
      const { task, capability, priority } = req.body;
      this.emit("task_submitted", { task, capability, priority });
      res.json({ success: true, message: "Task submitted" });
    });

    // Serve cockpit UI
    this.app.get("/cockpit", (req, res) => {
      res.sendFile(path.join(__dirname, "../../public/cockpit.html"));
    });

    // Default route
    this.app.get("/", (req, res) => {
      res.redirect("/cockpit");
    });
  }

  /**
   * Start HTTP server
   */
  async startHttpServer() {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(this.httpPort, () => {
        console.log(`🌐 HTTP server listening on port ${this.httpPort}`);
        resolve();
      });

      this.httpServer.on("error", reject);
    });
  }

  /**
   * Start WebSocket server
   */
  async startWebSocketServer() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.wsPort });

        this.wss.on("connection", (ws, req) => {
          this.handleClientConnection(ws, req);
        });

        this.wss.on("listening", () => {
          console.log(`📡 WebSocket server listening on port ${this.wsPort}`);
          resolve();
        });

        this.wss.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle new client connection
   */
  handleClientConnection(ws, req) {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`📥 Dashboard client connected: ${clientId}`);

    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(["all"]),
      connectedAt: Date.now(),
    });

    // Send initial status
    this.sendToClient(clientId, {
      type: WS_MESSAGE_TYPE.SYSTEM_STATUS,
      data: this.getSystemStatus(),
    });

    // Handle messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error("❌ Invalid message from client:", error.message);
      }
    });

    // Handle disconnect
    ws.on("close", () => {
      console.log(`📤 Dashboard client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    ws.on("error", (error) => {
      console.error(`❌ Client error: ${error.message}`);
    });
  }

  /**
   * Handle message from client
   */
  handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case WS_MESSAGE_TYPE.SUBSCRIBE:
        client.subscriptions.add(message.channel);
        break;

      case WS_MESSAGE_TYPE.UNSUBSCRIBE:
        client.subscriptions.delete(message.channel);
        break;

      case WS_MESSAGE_TYPE.SUBMIT_TASK:
        this.emit("task_submitted", message.data);
        break;

      case WS_MESSAGE_TYPE.CANCEL_TASK:
        this.emit("task_cancelled", message.data);
        break;

      case WS_MESSAGE_TYPE.AGENT_COMMAND:
        this.emit("agent_command", message.data);
        break;

      case WS_MESSAGE_TYPE.GET_STATUS:
        this.sendToClient(clientId, {
          type: WS_MESSAGE_TYPE.SYSTEM_STATUS,
          data: this.getSystemStatus(),
        });
        break;
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message, channel = "all") {
    for (const [clientId, client] of this.clients) {
      if (
        client.subscriptions.has(channel) ||
        client.subscriptions.has("all")
      ) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * Start metrics broadcast
   */
  startMetricsBroadcast() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    this.metricsTimer = setInterval(() => {
      this.broadcast(
        {
          type: WS_MESSAGE_TYPE.METRICS_UPDATE,
          data: this.getMetrics(),
        },
        "metrics",
      );

      this.broadcast(
        {
          type: WS_MESSAGE_TYPE.COST_UPDATE,
          data: this.getCostData(),
        },
        "cost",
      );
    }, this.metricsInterval);
  }

  /**
   * Broadcast agent status update
   */
  broadcastAgentStatus(agentId, status) {
    this.broadcast(
      {
        type: WS_MESSAGE_TYPE.AGENT_STATUS,
        data: { agentId, status, timestamp: Date.now() },
      },
      "agents",
    );
  }

  /**
   * Broadcast task update
   */
  broadcastTaskUpdate(taskId, status, result = null) {
    this.broadcast(
      {
        type: WS_MESSAGE_TYPE.TASK_UPDATE,
        data: { taskId, status, result, timestamp: Date.now() },
      },
      "tasks",
    );
  }

  /**
   * Broadcast log entry
   */
  broadcastLog(level, message, source = "system") {
    const entry = {
      level,
      message,
      source,
      timestamp: Date.now(),
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer.shift();
    }

    this.broadcast(
      {
        type: WS_MESSAGE_TYPE.LOG_ENTRY,
        data: entry,
      },
      "logs",
    );
  }

  /**
   * Broadcast alert
   */
  broadcastAlert(severity, message, source = "system") {
    this.broadcast(
      {
        type: WS_MESSAGE_TYPE.ALERT,
        data: {
          severity,
          message,
          source,
          timestamp: Date.now(),
        },
      },
      "alerts",
    );
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      status: "operational",
      uptime: process.uptime(),
      connectedClients: this.clients.size,
      agents: this.getAgentStatus(),
      metrics: this.getMetrics(),
      cost: this.getCostData(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get agent status
   */
  getAgentStatus() {
    if (this.healthMonitor) {
      return this.healthMonitor.getAllHealth();
    }

    if (this.agentDiscovery) {
      return this.agentDiscovery.getAgents();
    }

    return {};
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const metrics = {
      timestamp: Date.now(),
    };

    if (this.loadBalancer) {
      metrics.loadBalancer = this.loadBalancer.getMetrics();
    }

    if (this.providerPool) {
      metrics.providers = this.providerPool.getStats();
    }

    if (this.healthMonitor) {
      metrics.health = this.healthMonitor.getMetrics();
    }

    return metrics;
  }

  /**
   * Get cost data
   */
  getCostData() {
    if (this.costTracker) {
      return this.costTracker.getCostSummary();
    }

    // Default: always $0
    return {
      totalCost: 0,
      dailyCost: 0,
      weeklyCost: 0,
      monthlyCost: 0,
      currency: "USD",
      message: "All providers are FREE! 🎉",
      breakdown: {
        ollama: 0,
        groq: 0,
        openrouter: 0,
        huggingface: 0,
        cloudflare: 0,
      },
    };
  }

  /**
   * Shutdown server
   */
  shutdown() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
    }

    console.log("📊 Dashboard Server shutdown complete");
  }
}

export default DashboardServer;

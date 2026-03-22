/**
 * Real-time Cockpit Visualization Dashboard
 * Provides live monitoring of multi-agent activities and system status
 */

const WebSocket = require('ws');
const { getCoordinator } = require('./agent-coordinator');

class RealTimeDashboard {
  constructor(options = {}) {
    this.port = options.port || 3847;
    this.httpServer = options.server || null;
    this.wss = null;
    this.clients = new Map();
    this.coordinator = getCoordinator();
    this.agentStates = new Map();
    this.systemMetrics = {
      activeAgents: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeOperations: 0
    };
    this.updateInterval = null;
    this.alertThresholds = {
      highActivity: 10, // operations per second
      criticalErrors: 5,    // errors per minute
      memoryUsage: 80,     // percentage
    };
  }

  /**
   * Start dashboard server
   */
  async start() {
    // Use existing HTTP server if provided, otherwise create standalone server
    if (this.httpServer) {
      this.wss = new WebSocket.Server({ server: this.httpServer, path: '/dashboard-ws' });
    } else {
      this.wss = new WebSocket.Server({ port: this.port, path: '/dashboard-ws' });
    }

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      console.error('[Dashboard] WebSocket error:', error);
    });

    this.startMetricsCollection();

    console.log(`[RealTimeDashboard] Started on ${this.httpServer ? 'existing server' : 'port ' + this.port}`);
    return { success: true };
  }

  /**
   * Handle new connection
   */
  handleConnection(ws) {
    const clientId = this.generateClientId();

    this.clients.set(clientId, {
      socket: ws,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      agent: null
    });

    ws.send(JSON.stringify({
      type: 'dashboard_connected',
      clientId,
      timestamp: Date.now()
    }));

    // Start sending updates
    this.startSendingUpdates(clientId);

    console.log(`[Dashboard] Client connected: ${clientId}`);
  }

  /**
   * Start sending periodic updates to a client
   */
  startSendingUpdates(clientId) {
    // Send updates every 100ms
    this.updateInterval = setInterval(() => {
      this.sendDashboardUpdate(clientId);
    }, 100);

    console.log(`[Dashboard] Started sending updates to client: ${clientId}`);
  }

  /**
   * Stop sending updates
   */
  stopSendingUpdates(clientId) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Send dashboard update
   */
  async sendDashboardUpdate(clientId) {
    const client = this.clients.get(clientId);
    if (!client || !client.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const update = {
      type: 'dashboard_update',
      timestamp: Date.now(),
      dashboard: await this.generateDashboardState()
    };

    client.socket.send(JSON.stringify(update));
  }

  /**
   * Generate dashboard state
   */
  async generateDashboardState() {
    const coordinatorInfo = this.coordinator.getDashboardInfo();

    return {
      system: {
        uptime: this.getSystemUptime(),
        agents: coordinatorInfo.active_agents?.length || 0,
        tasks: {
          total: this.systemMetrics.totalTasks,
          completed: this.systemMetrics.completedTasks,
          in_progress: await this.getTasksInProgress()
        },
        coordination: {
          active_agents: coordinatorInfo.active_agents?.length || 0,
          recent_activity: await this.getRecentActivity()
        },
        system_health: this.getSystemHealth()
      }
    };
  }

  async getTasksInProgress() {
    // Get tasks with status 'in_progress'
    const tasks = await this.coordinator.getTasks({ status: 'in_progress' });

    return tasks.slice(0, 10); // Last 10
  }

  async getRecentActivity() {
    // Get recent coordination log entries
    const log = await this.coordinator.getCoordinationLog();
    const recent = log.slice(-10); // Last 10 entries

    return recent.map(entry => ({
      type: entry.type,
      agent: entry.agent,
      timestamp: entry.timestamp,
      summary: this.summarizeLogEntry(entry)
    }));
  }

  getSystemHealth() {
    // System health metrics
    const health = {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: this.getSystemUptime()
    };

    return health;
  }

  getSystemUptime() {
    return process.uptime();
  }

  summarizeLogEntry(entry) {
    // Create brief summary of log entry
    switch (entry.type) {
      case 'task_created':
        return `Task "${entry.task_id.substring(0, 8)}: ${entry.title?.substring(0, 30)}`;
      case 'task_claimed':
        return `Task claimed by ${entry.agent}`;
      case 'task_completed':
        return `Task completed by ${entry.agent}`;
      case 'agent_message':
        return `Message: ${entry.from_agent} → ${entry.to_agent}`;
      case 'file_change':
        return `File changed: ${entry.file} by ${entry.changed_by}`;
      case 'context_update':
        return `Context updated by ${entry.agent}`;
      default:
        return `Activity: ${entry.type}`;
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);

    // Update agent state
    const agentData = client.agent;
    if (agentData) {
      this.agentStates.delete(agentData.agent);
    }

    this.systemMetrics.activeAgents--;

    console.log(`[Dashboard] Client disconnected: ${clientId}`);
  }

  /**
   * Broadcast message to all clients
   */
  async broadcast(message) {
    const update = {
      type: 'broadcast',
      message,
      timestamp: Date.now()
    };

    for (const [clientId, client] of this.clients.entries()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(update));
      }
    }

    // Log message to coordinator (broadcastMessage not available)
    this.coordinator.updateSharedContext('claude_code', { last_broadcast: message });
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect system metrics every 5 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 5000);

    console.log('[RealTimeDashboard] Started metrics collection');
  }

  async collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      system: this.getSystemHealth(),
      dashboard: await this.generateDashboardState(),
      agent_states: this.getAgentStates()
    };

    // Update coordination context
    await this.coordinator.updateSharedContext('claude_code', {
      current_operation: 'metrics_collection',
      system_metrics: metrics
    });

    // Store metrics (in real implementation, this would save to database)
    console.log('[Dashboard] Metrics collected:', JSON.stringify(metrics, null, 2));

    return metrics;
  }

  getAgentStates() {
    const states = [];
    for (const [agentId, agentData] of this.agentStates.entries()) {
      states.push({
        agent_id: agentId,
        status: agentData.status,
        current_task: agentData.currentTask,
        tasks_completed: agentData.tasksCompleted || 0
      });
    }

    return states;
  }

  /**
   * Send alert to dashboard
   */
  async sendAlert(type, message, severity = 'info') {
    const update = {
      type: 'alert',
      alert_type: type,
      message,
      severity,
      timestamp: Date.now()
    };

    // Broadcast to all connected clients
    for (const [clientId, client] of this.clients.entries()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(update));
      }
    }

    console.log(`[Dashboard] Alert sent: ${type} - ${message}`);
  }

  /**
   * Get dashboard status
   */
  getStatus() {
    return {
      running: this.wss !== null,
      clients_connected: this.clients.size,
      agents_tracked: this.agentStates.size,
      metrics: this.systemMetrics,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown dashboard
   */
  async shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.wss) {
      this.wss.close();
      console.log('[RealTimeDashboard] Stopped');
    }

    return { success: true };
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { 
  RealTimeDashboard, 
  getDashboard: (options) => {
    if (typeof options === 'number') {
      return new RealTimeDashboard({ port: options });
    }
    return new RealTimeDashboard(options || {});
  } 
};
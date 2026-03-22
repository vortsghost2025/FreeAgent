/**
 * Agent Coordinator Service
 * Enables seamless collaboration between Kilo and Claude Code
 * Both agents have full autonomy and can work in parallel
 */

const fs = require('fs');
const path = require('path');

class AgentCoordinator {
  constructor() {
    this.config = this.loadConfig();
    this.coordinationLog = [];
    this.taskBoard = [];
    this.sharedContext = {};
    this.activeAgents = new Set();
    this.fileLocks = new Map(); // Soft locks for awareness, not restrictions
    this.initialize();
  }

  initialize() {
    this.loadCoordinationLog();
    this.loadTaskBoard();
    this.loadSharedContext();
    this.startHeartbeat();
    console.log('[AgentCoordinator] Initialized for collaborative autonomous mode');
  }

  loadConfig() {
    const configPath = path.join(__dirname, '../config/agent-coordination.json');
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('[AgentCoordinator] Configuration loaded');
      return config;
    } catch (e) {
      console.log('[AgentCoordinator] Using default configuration');
      return {
        coordination_protocol: {
          mode: 'collaborative_autonomous',
          collaboration_rules: {
            shared_awareness: true,
            conflict_resolution: 'last_write_wins_with_logging',
            parallel_execution: true
          }
        }
      };
    }
  }

  // Agent Registration and Heartbeat
  registerAgent(agentId, agentInfo) {
    this.activeAgents.add(agentId);
    this.logEvent({
      type: 'agent_register',
      agent: agentId,
      info: agentInfo,
      timestamp: Date.now()
    });
    console.log(`[AgentCoordinator] ${agentId} registered and active`);
    return this.getActiveAgents();
  }

  heartbeat(agentId, status) {
    this.activeAgents.add(agentId);
    this.sharedContext[`${agentId}_status`] = {
      ...status,
      lastSeen: Date.now()
    };
    this.saveSharedContext();
  }

  getActiveAgents() {
    return Array.from(this.activeAgents);
  }

  // Task Management
  createTask(task) {
    const taskWithMeta = {
      id: this.generateId(),
      ...task,
      status: 'pending',
      created_by: task.created_by || 'unknown',
      created_at: Date.now(),
      collaborators: [],
      history: []
    };
    this.taskBoard.push(taskWithMeta);
    this.saveTaskBoard();
    this.logEvent({
      type: 'task_created',
      task: taskWithMeta,
      timestamp: Date.now()
    });
    console.log(`[AgentCoordinator] Task created: ${taskWithMeta.id} - ${taskWithMeta.title}`);
    return taskWithMeta;
  }

  claimTask(taskId, agentId) {
    const task = this.taskBoard.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'in_progress';
    task.claimed_by = agentId;
    task.claimed_at = Date.now();
    if (!task.collaborators.includes(agentId)) {
      task.collaborators.push(agentId);
    }
    task.history.push({
      action: 'claimed',
      agent: agentId,
      timestamp: Date.now()
    });

    this.saveTaskBoard();
    this.logEvent({
      type: 'task_claimed',
      task_id: taskId,
      agent: agentId,
      timestamp: Date.now()
    });
    console.log(`[AgentCoordinator] Task ${taskId} claimed by ${agentId}`);
    return task;
  }

  collaborateOnTask(taskId, agentId, action, data) {
    const task = this.taskBoard.find(t => t.id === taskId);
    if (!task) return null;

    if (!task.collaborators.includes(agentId)) {
      task.collaborators.push(agentId);
    }

    task.history.push({
      action,
      agent: agentId,
      data,
      timestamp: Date.now()
    });

    this.saveTaskBoard();
    this.logEvent({
      type: 'task_collaboration',
      task_id: taskId,
      agent: agentId,
      action,
      timestamp: Date.now()
    });
    console.log(`[AgentCoordinator] ${agentId} collaborated on task ${taskId}: ${action}`);
    return task;
  }

  completeTask(taskId, agentId, result) {
    const task = this.taskBoard.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completed_by = agentId;
    task.completed_at = Date.now();
    task.result = result;

    task.history.push({
      action: 'completed',
      agent: agentId,
      result,
      timestamp: Date.now()
    });

    this.saveTaskBoard();
    this.logEvent({
      type: 'task_completed',
      task_id: taskId,
      agent: agentId,
      result,
      timestamp: Date.now()
    });
    console.log(`[AgentCoordinator] Task ${taskId} completed by ${agentId}`);
    return task;
  }

  getTasks(filter = {}) {
    let tasks = [...this.taskBoard];

    if (filter.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    if (filter.agent) {
      tasks = tasks.filter(t =>
        t.claimed_by === filter.agent ||
        t.collaborators.includes(filter.agent) ||
        t.created_by === filter.agent
      );
    }
    if (filter.priority) {
      tasks = tasks.filter(t => t.priority === filter.priority);
    }

    return tasks.sort((a, b) => b.created_at - a.created_at);
  }

  // File Coordination (Awareness, Not Restrictions)
  registerFileInterest(agentId, filePath, purpose) {
    const key = this.normalizePath(filePath);
    if (!this.fileLocks.has(key)) {
      this.fileLocks.set(key, new Set());
    }
    this.fileLocks.get(key).add(agentId);

    this.logEvent({
      type: 'file_interest',
      agent: agentId,
      file: filePath,
      purpose,
      timestamp: Date.now()
    });
  }

  getFileInterests(filePath) {
    const key = this.normalizePath(filePath);
    const interests = this.fileLocks.get(key);
    return interests ? Array.from(interests) : [];
  }

  notifyFileChange(agentId, filePath, change) {
    const interests = this.getFileInterests(filePath);
    const notification = {
      type: 'file_change',
      changed_by: agentId,
      file: filePath,
      change,
      interested_agents: interests,
      timestamp: Date.now()
    };

    this.logEvent(notification);
    console.log(`[AgentCoordinator] File change notification: ${filePath} by ${agentId}`);
    return notification;
  }

  // Shared Context
  updateSharedContext(agentId, context) {
    this.sharedContext[`${agentId}_context`] = {
      ...context,
      updated_at: Date.now()
    };
    this.saveSharedContext();
    this.logEvent({
      type: 'context_update',
      agent: agentId,
      timestamp: Date.now()
    });
  }

  getSharedContext() {
    return this.sharedContext;
  }

  // Coordination Log
  logEvent(event) {
    this.coordinationLog.push(event);
    if (this.coordinationLog.length > 1000) {
      this.coordinationLog = this.coordinationLog.slice(-500);
    }
    this.saveCoordinationLog();
  }

  getCoordinationLog(filter = {}) {
    let log = [...this.coordinationLog];

    if (filter.agent) {
      log = log.filter(e => e.agent === filter.agent || e.changed_by === filter.agent);
    }
    if (filter.type) {
      log = log.filter(e => e.type === filter.type);
    }
    if (filter.since) {
      log = log.filter(e => e.timestamp > filter.since);
    }

    return log.reverse();
  }

  // Agent Communication
  sendMessage(fromAgent, toAgent, message) {
    const msg = {
      id: this.generateId(),
      from: fromAgent,
      to: toAgent,
      message,
      timestamp: Date.now(),
      status: 'delivered'
    };

    this.logEvent({
      type: 'agent_message',
      ...msg
    });
    console.log(`[AgentCoordinator] Message from ${fromAgent} to ${toAgent}`);
    return msg;
  }

  getMessages(agentId) {
    return this.coordinationLog.filter(e =>
      e.type === 'agent_message' &&
      (e.to === agentId || e.from === agentId)
    );
  }

  // Utilities
  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  normalizePath(filePath) {
    return path.normalize(filePath).toLowerCase();
  }

  // Persistence
  saveCoordinationLog() {
    const dir = path.join(__dirname, '../data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'coordination_log.json'),
      JSON.stringify(this.coordinationLog, null, 2)
    );
  }

  loadCoordinationLog() {
    try {
      const logPath = path.join(__dirname, '../data/coordination_log.json');
      if (fs.existsSync(logPath)) {
        this.coordinationLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
    } catch (e) {
      console.log('[AgentCoordinator] No existing coordination log found');
    }
  }

  saveTaskBoard() {
    const dir = path.join(__dirname, '../data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'task_board.json'),
      JSON.stringify(this.taskBoard, null, 2)
    );
  }

  loadTaskBoard() {
    try {
      const boardPath = path.join(__dirname, '../data/task_board.json');
      if (fs.existsSync(boardPath)) {
        this.taskBoard = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
      }
    } catch (e) {
      console.log('[AgentCoordinator] No existing task board found');
    }
  }

  saveSharedContext() {
    const dir = path.join(__dirname, '../data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'shared_context.json'),
      JSON.stringify(this.sharedContext, null, 2)
    );
  }

  loadSharedContext() {
    try {
      const contextPath = path.join(__dirname, '../data/shared_context.json');
      if (fs.existsSync(contextPath)) {
        this.sharedContext = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      }
    } catch (e) {
      console.log('[AgentCoordinator] No existing shared context found');
    }
  }

  startHeartbeat() {
    // Clean up inactive agents every 30 seconds
    setInterval(() => {
      const now = Date.now();
      const threshold = 60000; // 1 minute

      Object.keys(this.sharedContext).forEach(key => {
        if (key.endsWith('_status')) {
          const status = this.sharedContext[key];
          if (status.lastSeen && (now - status.lastSeen) > threshold) {
            const agentId = key.replace('_status', '');
            this.activeAgents.delete(agentId);
            console.log(`[AgentCoordinator] Agent ${agentId} marked inactive`);
          }
        }
      });
    }, 30000);
  }

  // Dashboard Info
  getDashboardInfo() {
    return {
      active_agents: this.getActiveAgents(),
      task_summary: {
        total: this.taskBoard.length,
        pending: this.taskBoard.filter(t => t.status === 'pending').length,
        in_progress: this.taskBoard.filter(t => t.status === 'in_progress').length,
        completed: this.taskBoard.filter(t => t.status === 'completed').length
      },
      recent_activity: this.coordinationLog.slice(-10).reverse(),
      shared_context: Object.keys(this.sharedContext).length,
      collaboration_mode: this.config.coordination_protocol.mode
    };
  }
}

// Singleton instance
let coordinator = null;

function getCoordinator() {
  if (!coordinator) {
    coordinator = new AgentCoordinator();
  }
  return coordinator;
}

module.exports = { AgentCoordinator, getCoordinator };
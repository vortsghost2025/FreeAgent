/**
 * Agent Integration Helper
 * Provides easy integration for both Kilo and Claude Code to use the coordination system
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class AgentIntegration {
  constructor(agentId, agentConfig = {}) {
    this.agentId = agentId;
    this.config = agentConfig;
    this.coordinatorUrl = process.env.COORDINATOR_URL || 'http://localhost:3847/api/coordination';
    this.registered = false;
  }

  // Initialize and register agent
  async initialize() {
    try {
      await this.register();
      console.log(`[AgentIntegration] ${this.agentId} initialized and registered`);
      return true;
    } catch (error) {
      console.error(`[AgentIntegration] Failed to initialize ${this.agentId}:`, error.message);
      return false;
    }
  }

  // Register with coordination service
  async register() {
    const agentInfo = {
      role: this.config.role || 'agent',
      capabilities: this.config.capabilities || [],
      permissions: this.config.permissions || ['standard'],
      primary_focus: this.config.primaryFocus || [],
      version: this.config.version || '1.0.0'
    };

    const response = await this.postRequest('/register', {
      agent_id: this.agentId,
      agent_info: agentInfo
    });

    if (response.success) {
      this.registered = true;
      return response.data;
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  }

  // Send heartbeat
  async heartbeat(status = {}) {
    if (!this.registered) {
      await this.initialize();
    }

    const defaultStatus = {
      status: 'active',
      current_task: null,
      cpu_usage: process.cpuUsage(),
      memory_usage: process.memoryUsage(),
      timestamp: Date.now()
    };

    return await this.postRequest('/heartbeat', {
      agent_id: this.agentId,
      status: { ...defaultStatus, ...status }
    });
  }

  // Task Management
  async createTask(taskData) {
    const task = {
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority || 'medium',
      tags: taskData.tags || [],
      created_by: this.agentId,
      ...taskData
    };

    const response = await this.postRequest('/tasks', task);
    return response.success ? response.data : null;
  }

  async claimTask(taskId) {
    const response = await this.postRequest(`/tasks/${taskId}/claim`, {
      agent_id: this.agentId
    });
    return response.success ? response.data : null;
  }

  async collaborateOnTask(taskId, action, data = {}) {
    const response = await this.postRequest(`/tasks/${taskId}/collaborate`, {
      agent_id: this.agentId,
      action,
      data
    });
    return response.success ? response.data : null;
  }

  async completeTask(taskId, result) {
    const response = await this.postRequest(`/tasks/${taskId}/complete`, {
      agent_id: this.agentId,
      result
    });
    return response.success ? response.data : null;
  }

  async getTasks(filter = {}) {
    const queryString = Object.entries(filter)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const response = await this.getRequest(`/tasks${queryString ? '?' + queryString : ''}`);
    return response.success ? response.data : [];
  }

  // File Coordination
  async registerFileInterest(filePath, purpose) {
    return await this.postRequest('/files/interest', {
      agent_id: this.agentId,
      file_path: filePath,
      purpose
    });
  }

  async getFileInterests(filePath) {
    const response = await this.getRequest(`/files/${encodeURIComponent(filePath)}/interests`);
    return response.success ? response.data : [];
  }

  async notifyFileChange(filePath, change) {
    return await this.postRequest('/files/change', {
      agent_id: this.agentId,
      file_path: filePath,
      change
    });
  }

  // Agent Communication
  async sendMessage(toAgent, message) {
    const response = await this.postRequest('/messages', {
      from_agent: this.agentId,
      to_agent,
      message
    });
    return response.success ? response.data : null;
  }

  async getMessages() {
    const response = await this.getRequest(`/messages/${this.agentId}`);
    return response.success ? response.data : [];
  }

  // Shared Context
  async updateContext(context) {
    return await this.postRequest('/context', {
      agent_id: this.agentId,
      context
    });
  }

  async getSharedContext() {
    const response = await this.getRequest('/context');
    return response.success ? response.data : {};
  }

  // Dashboard and Monitoring
  async getDashboard() {
    const response = await this.getRequest('/dashboard');
    return response.success ? response.data : null;
  }

  async getCoordinationLog(filter = {}) {
    const queryString = Object.entries(filter)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const response = await this.getRequest(`/log${queryString ? '?' + queryString : ''}`);
    return response.success ? response.data : [];
  }

  // HTTP Helper Methods
  async getRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.coordinatorUrl);

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  async postRequest(endpoint, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.coordinatorUrl);
      const postData = JSON.stringify(data);

      const options = {
        hostname: url.hostname,
        port: url.port || 3847,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  // Convenience Methods for Common Workflows
  async startWorkingOnTask(taskTitle, description) {
    // Create task
    const task = await this.createTask({
      title: taskTitle,
      description: description
    });

    if (!task) {
      throw new Error('Failed to create task');
    }

    // Claim it
    await this.claimTask(task.id);

    // Register current context
    await this.updateContext({
      current_task: task.id,
      current_focus: taskTitle,
      started_at: Date.now()
    });

    return task;
  }

  async coordinateFileWork(filePath, purpose, workDescription) {
    // Register interest
    await this.registerFileInterest(filePath, purpose);

    // Check who else is interested
    const interests = await this.getFileInterests(filePath);
    const otherAgents = interests.filter(id => id !== this.agentId);

    if (otherAgents.length > 0) {
      console.log(`[AgentIntegration] Other agents interested in ${filePath}:`, otherAgents);
      // Optionally send message to other agents
      for (const otherAgent of otherAgents) {
        await this.sendMessage(otherAgent, `I'm working on ${filePath}: ${workDescription}`);
      }
    }

    return { filePath, otherAgents, interests };
  }

  async completeWork(taskId, result, changedFiles = []) {
    // Notify file changes
    for (const filePath of changedFiles) {
      await this.notifyFileChange(filePath, {
        type: 'work_completed',
        task_id: taskId,
        description: `Completed work as part of task ${taskId}`
      });
    }

    // Complete the task
    await this.completeTask(taskId, result);

    // Clear current context
    await this.updateContext({
      current_task: null,
      current_focus: null,
      last_completed: taskId,
      completed_at: Date.now()
    });
  }

  // Auto-heartbeat management
  startAutoHeartbeat(interval = 30000) {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.heartbeat();
      } catch (error) {
        console.error(`[AgentIntegration] Heartbeat failed for ${this.agentId}:`, error.message);
      }
    }, interval);
  }

  stopAutoHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Cleanup
  async cleanup() {
    this.stopAutoHeartbeat();
    // Optionally update status to inactive
    try {
      await this.heartbeat({ status: 'inactive' });
    } catch (error) {
      console.error(`[AgentIntegration] Cleanup failed for ${this.agentId}:`, error.message);
    }
  }
}

// Factory function for easy agent creation
function createAgent(agentId, config = {}) {
  return new AgentIntegration(agentId, config);
}

// Pre-configured agents
function createKilo() {
  return createAgent('kilo', {
    role: 'orchestrator_runtime',
    capabilities: ['routing', 'memory_management', 'tool_coordination', 'system_health'],
    permissions: ['full_access', 'yolo', 'bypass_restrictions'],
    primaryFocus: ['runtime_optimization', 'agent_coordination', 'system_stability'],
    version: '2.0.0'
  });
}

function createClaudeCode() {
  return createAgent('claude_code', {
    role: 'development_assistant',
    capabilities: ['code_implementation', 'debugging', 'architecture_improvements', 'documentation'],
    permissions: ['full_access', 'yolo', 'bypass_restrictions'],
    primaryFocus: ['feature_implementation', 'bug_fixes', 'code_quality'],
    version: '1.0.0'
  });
}

module.exports = {
  AgentIntegration,
  createAgent,
  createKilo,
  createClaudeCode
};
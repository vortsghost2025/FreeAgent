/**
 * Multi-Agent Orchestrator
 * Manages multiple agents running in different modes (local, background, cloud)
 * Coordinates swarm behavior and federated learning
 */

import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { agentsConfig } from './config/agents-config.js';
import { PersistentMemory } from './persistent-memory.js';

class AgentOrchestrator {
  constructor(options = {}) {
    this.agents = new Map();
    this.config = { ...agentsConfig, ...options };
    this.persistentMemory = new PersistentMemory({ 
      storagePath: './orchestrator-memory.json',
      maxRetries: 5,
      retryDelay: 2000
    });
    this.websocketServer = null;
    this.isRunning = false;
    this.heartbeatTimer = null;
    this.coordinationTimer = null;
    this.syncTimer = null;
    this.portMap = new Map(); // Track which ports are in use
    
    // Add connection tracking for better management
    this.connectionTracker = new Map();
    
    // Add graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  setupGracefulShutdown() {
    process.on('SIGTERM', async () => {
      console.log('[Orchestrator] Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
    });
    
    process.on('SIGINT', async () => {
      console.log('[Orchestrator] Received SIGINT, shutting down gracefully...');
      await this.shutdown();
    });
  }

  async initialize() {
    try {
      await this.persistentMemory.load();
      console.log('[Orchestrator] Persistent memory loaded');
    } catch (error) {
      console.error('[Orchestrator] Failed to load persistent memory:', error);
      // Don't fail initialization if memory load fails, but log the error
    }
    
    // Initialize WebSocket server for inter-agent communication
    // Port conflict resolution
    const net = await import('net');
    let port = this.config.orchestration.masterAgent.port || 3101;
    let found = false;
    for (let i = 0; i < 10; i++) {
      const portAvailable = await new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
          server.close(() => resolve(true));
        });
        server.listen(port);
      });
      
      if (portAvailable) {
        found = true;
        break;
      } else {
        port++;
      }
    }
    
    if (!found) {
      console.error('[Orchestrator] Could not find an available port, using default 3101');
      port = 3101; // Default fallback
    }
    
    this.websocketServer = new WebSocketServer({ port });
    this.websocketServer.on('connection', (ws) => {
      console.log('[Orchestrator] New WebSocket connection established');
      
      // Track connection
      const connectionId = Date.now() + Math.random();
      this.connectionTracker.set(connectionId, ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message, ws);
        } catch (error) {
          console.error('[Orchestrator] Error parsing WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('[Orchestrator] WebSocket connection closed');
        this.connectionTracker.delete(connectionId);
      });
      
      ws.on('error', (error) => {
        console.error('[Orchestrator] WebSocket error:', error);
      });
    });
    
    console.log(`[Orchestrator] WebSocket server listening on port ${port}`);
    
    this.isRunning = true;
    
    // Start timers with error handling
    this.startTimers();
    
    // Load any previously running agents from persistent memory
    await this.loadAgentState();
  }

  startTimers() {
    // Heartbeat timer
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('[Orchestrator] Error in heartbeat:', error);
      }
    }, 30000); // 30 seconds
    
    // Coordination timer
    this.coordinationTimer = setInterval(async () => {
      try {
        await this.performCoordination();
      } catch (error) {
        console.error('[Orchestrator] Error in coordination:', error);
      }
    }, 60000); // 1 minute
    
    // Sync timer
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncAgentStates();
      } catch (error) {
        console.error('[Orchestrator] Error in sync:', error);
      }
    }, 120000); // 2 minutes
  }

  async handleWebSocketMessage(message, ws) {
    switch (message.type) {
      case 'agent-status':
        await this.handleAgentStatus(message);
        break;
      case 'swarm-command':
        await this.handleSwarmCommand(message);
        break;
      case 'federation-event':
        await this.handleFederationEvent(message);
        break;
      default:
        console.log(`[Orchestrator] Unknown message type: ${message.type}`);
    }
  }

  async handleAgentStatus(message) {
    const { agentId, status, details } = message;
    console.log(`[Orchestrator] Agent ${agentId} status: ${status}`);
    
    // Update agent status in persistent memory
    try {
      const agentStates = await this.persistentMemory.get('agentStates', {});
      agentStates[agentId] = {
        status,
        details,
        lastUpdate: Date.now()
      };
      await this.persistentMemory.set('agentStates', agentStates);
    } catch (error) {
      console.error('[Orchestrator] Error updating agent status:', error);
    }
  }

  async handleSwarmCommand(message) {
    const { command, targets, params } = message;
    console.log(`[Orchestrator] Executing swarm command: ${command}`);
    
    // Forward command to targeted agents
    for (const agentId of targets) {
      const agentProcess = this.agents.get(agentId);
      if (agentProcess) {
        try {
          agentProcess.send({ type: 'swarm-command', command, params });
        } catch (error) {
          console.error(`[Orchestrator] Error sending command to agent ${agentId}:`, error);
        }
      }
    }
  }

  async handleFederationEvent(message) {
    const { eventType, eventData } = message;
    console.log(`[Orchestrator] Federation event: ${eventType}`);
    
    // Process federation event
    try {
      // Store federation events for later analysis
      const federationEvents = await this.persistentMemory.get('federationEvents', []);
      federationEvents.push({
        eventType,
        eventData,
        timestamp: Date.now()
      });
      
      // Limit federation events to prevent unbounded growth
      const maxEvents = 500;
      if (federationEvents.length > maxEvents) {
        federationEvents.splice(0, federationEvents.length - maxEvents);
      }
      
      await this.persistentMemory.set('federationEvents', federationEvents);
    } catch (error) {
      console.error('[Orchestrator] Error handling federation event:', error);
    }
  }

  async sendHeartbeat() {
    if (!this.websocketServer) return;
    
    const heartbeatMessage = JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now()
    });
    
    this.websocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocketServer.OPEN) {
        try {
          client.send(heartbeatMessage);
        } catch (error) {
          console.error('[Orchestrator] Error sending heartbeat:', error);
        }
      }
    });
  }

  async performCoordination() {
    // Perform coordination tasks
    console.log('[Orchestrator] Performing coordination tasks...');
    
    // Check agent statuses and restart failed agents if needed
    await this.checkAgentHealth();
    
    // Coordinate federation activities
    await this.coordinateFederation();
  }

  async checkAgentHealth() {
    // Check if any agents have failed and need restarting
    for (const [agentId, agentProcess] of this.agents.entries()) {
      if (agentProcess.killed) {
        console.log(`[Orchestrator] Agent ${agentId} appears to have died, attempting restart...`);
        await this.restartAgent(agentId);
      }
    }
  }

  async restartAgent(agentId) {
    const agentConfig = this.config.agents[agentId];
    if (!agentConfig) {
      console.error(`[Orchestrator] No config found for agent ${agentId}, cannot restart`);
      return;
    }
    
    try {
      await this.startAgent(agentId, agentConfig);
      console.log(`[Orchestrator] Successfully restarted agent ${agentId}`);
    } catch (error) {
      console.error(`[Orchestrator] Failed to restart agent ${agentId}:`, error);
    }
  }

  async coordinateFederation() {
    // Coordinate federation activities between agents
    console.log('[Orchestrator] Coordinating federation activities...');
    
    // Example: Distribute learned patterns between agents
    await this.distributeLearnings();
  }

  async distributeLearnings() {
    try {
      // Get learned patterns from persistent memory
      const patterns = await this.persistentMemory.getLearnedPatterns();
      if (patterns.length > 0) {
        // Distribute the latest patterns to all agents
        const latestPattern = patterns[patterns.length - 1];
        
        this.websocketServer.clients.forEach((client) => {
          if (client.readyState === WebSocketServer.OPEN) {
            try {
              client.send(JSON.stringify({
                type: 'federation-update',
                subtype: 'new-pattern',
                pattern: latestPattern
              }));
            } catch (error) {
              console.error('[Orchestrator] Error distributing pattern:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('[Orchestrator] Error distributing learnings:', error);
    }
  }

  async syncAgentStates() {
    // Synchronize agent states with persistent memory
    console.log('[Orchestrator] Syncing agent states...');
    
    // Update agent states periodically
    for (const [agentId, agentProcess] of this.agents.entries()) {
      if (!agentProcess.killed) {
        try {
          // Request status from agent
          agentProcess.send({ type: 'request-status' });
        } catch (error) {
          console.error(`[Orchestrator] Error requesting status from agent ${agentId}:`, error);
        }
      }
    }
  }

  async startAgent(agentId, config) {
    if (this.agents.has(agentId)) {
      console.log(`[Orchestrator] Agent ${agentId} is already running`);
      return;
    }
    
    try {
      const agentProcess = spawn('node', [config.script], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, ...config.env }
      });
      
      agentProcess.on('message', (message) => {
        // Handle messages from the agent
        this.handleAgentMessage(agentId, message);
      });
      
      agentProcess.on('error', (error) => {
        console.error(`[Orchestrator] Error with agent ${agentId}:`, error);
      });
      
      agentProcess.on('exit', (code, signal) => {
        console.log(`[Orchestrator] Agent ${agentId} exited with code ${code} and signal ${signal}`);
        this.agents.delete(agentId);
        
        // Mark agent as stopped in persistent memory
        this.markAgentStopped(agentId);
      });
      
      // Capture stdout/stderr for logging
      agentProcess.stdout.on('data', (data) => {
        console.log(`[Agent-${agentId}] ${data.toString()}`);
      });
      
      agentProcess.stderr.on('data', (data) => {
        console.error(`[Agent-${agentId}] ${data.toString()}`);
      });
      
      this.agents.set(agentId, agentProcess);
      console.log(`[Orchestrator] Started agent ${agentId}`);
      
      // Mark agent as started in persistent memory
      await this.markAgentStarted(agentId, config);
      
      return agentProcess;
    } catch (error) {
      console.error(`[Orchestrator] Failed to start agent ${agentId}:`, error);
      throw error;
    }
  }

  async handleAgentMessage(agentId, message) {
    switch (message.type) {
      case 'status-update':
        await this.handleAgentStatus({
          agentId,
          status: message.status,
          details: message.details
        });
        break;
      case 'learning-update':
        await this.handleLearningUpdate(message.learning);
        break;
      case 'optimization-result':
        await this.handleOptimizationResult(message.result);
        break;
      default:
        console.log(`[Orchestrator] Unknown message from agent ${agentId}: ${message.type}`);
    }
  }

  async handleLearningUpdate(learning) {
    try {
      // Store the learning in persistent memory
      await this.persistentMemory.storeLearnedPattern(learning);
      console.log(`[Orchestrator] Stored new learning pattern`);
    } catch (error) {
      console.error('[Orchestrator] Error storing learning:', error);
    }
  }

  async handleOptimizationResult(result) {
    try {
      // Add to optimization history
      await this.persistentMemory.addToOptimizationHistory(result);
      console.log(`[Orchestrator] Stored optimization result`);
    } catch (error) {
      console.error('[Orchestrator] Error storing optimization result:', error);
    }
  }

  async markAgentStarted(agentId, config) {
    try {
      const agentStates = await this.persistentMemory.get('agentStates', {});
      agentStates[agentId] = {
        status: 'running',
        config,
        startTime: Date.now(),
        lastUpdate: Date.now()
      };
      await this.persistentMemory.set('agentStates', agentStates);
    } catch (error) {
      console.error(`[Orchestrator] Error marking agent ${agentId} as started:`, error);
    }
  }

  async markAgentStopped(agentId) {
    try {
      const agentStates = await this.persistentMemory.get('agentStates', {});
      if (agentStates[agentId]) {
        agentStates[agentId].status = 'stopped';
        agentStates[agentId].stopTime = Date.now();
        agentStates[agentId].lastUpdate = Date.now();
        await this.persistentMemory.set('agentStates', agentStates);
      }
    } catch (error) {
      console.error(`[Orchestrator] Error marking agent ${agentId} as stopped:`, error);
    }
  }

  async loadAgentState() {
    try {
      const agentStates = await this.persistentMemory.get('agentStates', {});
      for (const [agentId, state] of Object.entries(agentStates)) {
        if (state.status === 'running') {
          console.log(`[Orchestrator] Found previously running agent ${agentId}, restarting...`);
          const config = this.config.agents[agentId];
          if (config) {
            await this.startAgent(agentId, config);
          }
        }
      }
    } catch (error) {
      console.error('[Orchestrator] Error loading agent state:', error);
    }
  }

  async shutdown() {
    console.log('[Orchestrator] Shutting down agents and servers...');
    
    // Stop all timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.coordinationTimer) {
      clearInterval(this.coordinationTimer);
      this.coordinationTimer = null;
    }
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Stop WebSocket server
    if (this.websocketServer) {
      this.websocketServer.close(() => {
        console.log('[Orchestrator] WebSocket server closed');
      });
    }
    
    // Terminate all agent processes
    for (const [agentId, agentProcess] of this.agents.entries()) {
      console.log(`[Orchestrator] Terminating agent ${agentId}...`);
      try {
        agentProcess.kill();
      } catch (error) {
        console.error(`[Orchestrator] Error terminating agent ${agentId}:`, error);
      }
    }
    
    // Clear connection tracker
    this.connectionTracker.clear();
    
    this.isRunning = false;
    console.log('[Orchestrator] Shutdown complete');
  }

  async startAllAgents() {
    if (!this.config.agents) {
      console.error('[Orchestrator] No agents configured in config');
      return;
    }
    
    for (const [agentId, agentConfig] of Object.entries(this.config.agents)) {
      if (agentConfig.enabled !== false) {  // Only start if not explicitly disabled
        try {
          await this.startAgent(agentId, agentConfig);
        } catch (error) {
          console.error(`[Orchestrator] Failed to start agent ${agentId}:`, error);
        }
      }
    }
  }
}

export default AgentOrchestrator;
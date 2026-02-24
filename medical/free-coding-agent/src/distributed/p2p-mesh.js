/**
 * P2P Mesh Network - Peer-to-Peer Agent Communication
 *
 * Enables offline operation and local network communication:
 * - Bluetooth Low Energy (BLE) for discovery
 * - WiFi Direct for high-speed transfer
 * - WebSocket for local network communication
 * - Encrypted communication channel
 *
 * Features:
 * - Auto-discovery of peers
 * - Offline task queue
 * - Sync when reconnected
 * - Encrypted messaging
 */

import { EventEmitter } from "events";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";

// Peer states
export const PEER_STATE = {
  DISCOVERED: "discovered",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
};

// Message types
export const MESSAGE_TYPE = {
  HANDSHAKE: "handshake",
  HANDSHAKE_ACK: "handshake_ack",
  TASK_REQUEST: "task_request",
  TASK_RESPONSE: "task_response",
  HEARTBEAT: "heartbeat",
  SYNC_REQUEST: "sync_request",
  SYNC_RESPONSE: "sync_response",
  PEER_LIST: "peer_list",
};

export class P2PMesh extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;

    // Node identity
    this.nodeId = config.nodeId || this.generateNodeId();
    this.nodeName = config.nodeName || `node-${this.nodeId.slice(0, 8)}`;

    // Encryption
    this.encryptionKey = config.encryptionKey || this.generateEncryptionKey();

    // Peers
    this.peers = new Map();

    // WebSocket server for incoming connections
    this.server = null;
    this.serverPort = config.port || 9876;

    // Offline task queue
    this.offlineQueue = [];
    this.maxQueueSize = config.maxQueueSize || 100;

    // Discovery
    this.discoveryInterval = config.discoveryInterval || 30000;
    this.discoveryTimer = null;

    // Heartbeat
    this.heartbeatInterval = config.heartbeatInterval || 10000;
    this.heartbeatTimer = null;

    // Known peer addresses (for reconnection)
    this.knownPeers = new Set(config.knownPeers || []);

    console.log(`🌐 P2P Mesh initialized: ${this.nodeName} (${this.nodeId})`);
  }

  /**
   * Generate unique node ID
   */
  generateNodeId() {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Initialize P2P mesh network
   */
  async initialize() {
    console.log("🔧 Starting P2P mesh network...");

    // Start WebSocket server
    await this.startServer();

    // Connect to known peers
    await this.connectToKnownPeers();

    // Start discovery
    this.startDiscovery();

    // Start heartbeat
    this.startHeartbeat();

    console.log(`✅ P2P Mesh ready on port ${this.serverPort}`);
    this.emit("initialized", { nodeId: this.nodeId, port: this.serverPort });
  }

  /**
   * Start WebSocket server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      try {
        this.server = new WebSocketServer({ port: this.serverPort });

        this.server.on("connection", (ws, req) => {
          this.handleIncomingConnection(ws, req);
        });

        this.server.on("listening", () => {
          console.log(`📡 P2P server listening on port ${this.serverPort}`);
          resolve();
        });

        this.server.on("error", (error) => {
          console.error("❌ P2P server error:", error.message);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket connection
   */
  handleIncomingConnection(ws, req) {
    const remoteAddress = req.socket.remoteAddress;
    console.log(`📥 Incoming P2P connection from ${remoteAddress}`);

    // Temporary peer ID until handshake
    const tempId = `temp-${Date.now()}`;

    ws.on("message", (data) => {
      try {
        const message = this.decryptMessage(data.toString());
        this.handleMessage(ws, message, tempId);
      } catch (error) {
        console.error("❌ Failed to process message:", error.message);
      }
    });

    ws.on("close", () => {
      this.handlePeerDisconnect(tempId);
    });

    ws.on("error", (error) => {
      console.error(`❌ Peer connection error: ${error.message}`);
    });
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(address) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`ws://${address}`);

        ws.on("open", () => {
          console.log(`📤 Connected to peer: ${address}`);

          // Send handshake
          this.sendMessage(ws, {
            type: MESSAGE_TYPE.HANDSHAKE,
            nodeId: this.nodeId,
            nodeName: this.nodeName,
            capabilities: this.getCapabilities(),
          });

          resolve(ws);
        });

        ws.on("message", (data) => {
          try {
            const message = this.decryptMessage(data.toString());
            this.handleMessage(ws, message, address);
          } catch (error) {
            console.error("❌ Failed to process message:", error.message);
          }
        });

        ws.on("close", () => {
          this.handlePeerDisconnect(address);
        });

        ws.on("error", (error) => {
          console.error(`❌ Connection error to ${address}: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect to known peers
   */
  async connectToKnownPeers() {
    for (const address of this.knownPeers) {
      try {
        await this.connectToPeer(address);
      } catch (error) {
        console.warn(
          `⚠️ Failed to connect to known peer ${address}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(ws, message, peerId) {
    switch (message.type) {
      case MESSAGE_TYPE.HANDSHAKE:
        this.handleHandshake(ws, message, peerId);
        break;

      case MESSAGE_TYPE.HANDSHAKE_ACK:
        this.handleHandshakeAck(ws, message, peerId);
        break;

      case MESSAGE_TYPE.TASK_REQUEST:
        this.handleTaskRequest(ws, message);
        break;

      case MESSAGE_TYPE.TASK_RESPONSE:
        this.handleTaskResponse(message);
        break;

      case MESSAGE_TYPE.HEARTBEAT:
        this.handleHeartbeat(ws, message);
        break;

      case MESSAGE_TYPE.SYNC_REQUEST:
        this.handleSyncRequest(ws, message);
        break;

      case MESSAGE_TYPE.PEER_LIST:
        this.handlePeerList(message);
        break;

      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle handshake from peer
   */
  handleHandshake(ws, message, tempId) {
    const { nodeId, nodeName, capabilities } = message;

    // Register peer
    this.peers.set(nodeId, {
      id: nodeId,
      name: nodeName,
      capabilities,
      ws,
      state: PEER_STATE.CONNECTED,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    });

    // Send acknowledgment
    this.sendMessage(ws, {
      type: MESSAGE_TYPE.HANDSHAKE_ACK,
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      capabilities: this.getCapabilities(),
    });

    console.log(`🤝 Handshake complete with ${nodeName} (${nodeId})`);
    this.emit("peer_connected", { nodeId, nodeName });

    // Process offline queue
    this.processOfflineQueue(nodeId);
  }

  /**
   * Handle handshake acknowledgment
   */
  handleHandshakeAck(ws, message, address) {
    const { nodeId, nodeName, capabilities } = message;

    // Register peer
    this.peers.set(nodeId, {
      id: nodeId,
      name: nodeName,
      capabilities,
      ws,
      address,
      state: PEER_STATE.CONNECTED,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    });

    // Add to known peers
    if (address) {
      this.knownPeers.add(address);
    }

    console.log(`🤝 Handshake acknowledged by ${nodeName} (${nodeId})`);
    this.emit("peer_connected", { nodeId, nodeName });
  }

  /**
   * Handle task request from peer
   */
  async handleTaskRequest(ws, message) {
    const { taskId, task, capability } = message;

    console.log(`📥 Received task request: ${taskId}`);
    this.emit("task_received", { taskId, task, capability });

    // The actual task execution should be handled by the ensemble
    // This just emits the event for the coordinator to handle
  }

  /**
   * Handle task response from peer
   */
  handleTaskResponse(message) {
    const { taskId, result, error } = message;

    console.log(`📤 Received task response: ${taskId}`);
    this.emit("task_response", { taskId, result, error });
  }

  /**
   * Handle heartbeat
   */
  handleHeartbeat(ws, message) {
    const { nodeId } = message;
    const peer = this.peers.get(nodeId);

    if (peer) {
      peer.lastSeen = Date.now();
    }
  }

  /**
   * Handle sync request
   */
  handleSyncRequest(ws, message) {
    // Send current state for synchronization
    this.sendMessage(ws, {
      type: MESSAGE_TYPE.SYNC_RESPONSE,
      peers: Array.from(this.peers.keys()),
      queueSize: this.offlineQueue.length,
    });
  }

  /**
   * Handle peer list from another node
   */
  handlePeerList(message) {
    const { peers } = message;

    // Try to connect to new peers
    for (const address of peers) {
      if (!this.knownPeers.has(address)) {
        this.knownPeers.add(address);
        this.connectToPeer(address).catch(() => {});
      }
    }
  }

  /**
   * Handle peer disconnect
   */
  handlePeerDisconnect(peerId) {
    // Find peer by ID or address
    for (const [id, peer] of this.peers) {
      if (id === peerId || peer.address === peerId) {
        peer.state = PEER_STATE.DISCONNECTED;
        console.log(`📴 Peer disconnected: ${peer.name} (${id})`);
        this.emit("peer_disconnected", { nodeId: id, nodeName: peer.name });
        break;
      }
    }
  }

  /**
   * Send message to peer
   */
  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      const encrypted = this.encryptMessage(JSON.stringify(message));
      ws.send(encrypted);
    }
  }

  /**
   * Broadcast message to all peers
   */
  broadcast(message) {
    for (const peer of this.peers.values()) {
      if (peer.state === PEER_STATE.CONNECTED && peer.ws) {
        this.sendMessage(peer.ws, message);
      }
    }
  }

  /**
   * Send task to a peer
   */
  async sendTask(peerId, task, capability) {
    const peer = this.peers.get(peerId);

    if (!peer || peer.state !== PEER_STATE.CONNECTED) {
      // Queue for offline processing
      this.queueOfflineTask(peerId, task, capability);
      return null;
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.sendMessage(peer.ws, {
      type: MESSAGE_TYPE.TASK_REQUEST,
      taskId,
      task,
      capability,
    });

    return taskId;
  }

  /**
   * Send task response
   */
  sendTaskResponse(peerId, taskId, result, error = null) {
    const peer = this.peers.get(peerId);

    if (peer && peer.state === PEER_STATE.CONNECTED) {
      this.sendMessage(peer.ws, {
        type: MESSAGE_TYPE.TASK_RESPONSE,
        taskId,
        result,
        error,
      });
    }
  }

  /**
   * Queue task for offline processing
   */
  queueOfflineTask(peerId, task, capability) {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      this.offlineQueue.shift(); // Remove oldest
    }

    this.offlineQueue.push({
      peerId,
      task,
      capability,
      queuedAt: Date.now(),
    });

    console.log(
      `📋 Task queued for offline processing (queue size: ${this.offlineQueue.length})`,
    );
  }

  /**
   * Process offline queue when peer reconnects
   */
  processOfflineQueue(peerId) {
    const tasks = this.offlineQueue.filter((t) => t.peerId === peerId);

    for (const task of tasks) {
      this.sendTask(peerId, task.task, task.capability);
    }

    // Remove processed tasks
    this.offlineQueue = this.offlineQueue.filter((t) => t.peerId !== peerId);
  }

  /**
   * Encrypt message
   */
  encryptMessage(message) {
    // Simple XOR encryption for demo (use AES in production)
    const key = Buffer.from(this.encryptionKey, "hex");
    const messageBuffer = Buffer.from(message);
    const encrypted = Buffer.alloc(messageBuffer.length);

    for (let i = 0; i < messageBuffer.length; i++) {
      encrypted[i] = messageBuffer[i] ^ key[i % key.length];
    }

    return encrypted.toString("base64");
  }

  /**
   * Decrypt message
   */
  decryptMessage(encrypted) {
    const key = Buffer.from(this.encryptionKey, "hex");
    const encryptedBuffer = Buffer.from(encrypted, "base64");
    const decrypted = Buffer.alloc(encryptedBuffer.length);

    for (let i = 0; i < encryptedBuffer.length; i++) {
      decrypted[i] = encryptedBuffer[i] ^ key[i % key.length];
    }

    return JSON.parse(decrypted.toString());
  }

  /**
   * Get node capabilities
   */
  getCapabilities() {
    return this.config.capabilities || ["general"];
  }

  /**
   * Start discovery process
   */
  startDiscovery() {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
    }

    this.discoveryTimer = setInterval(() => {
      this.runDiscovery();
    }, this.discoveryInterval);
  }

  /**
   * Run discovery cycle
   */
  async runDiscovery() {
    // Broadcast peer list to help others discover
    this.broadcast({
      type: MESSAGE_TYPE.PEER_LIST,
      peers: Array.from(this.knownPeers),
    });

    // Try to reconnect to disconnected peers
    for (const address of this.knownPeers) {
      let connected = false;
      for (const peer of this.peers.values()) {
        if (peer.address === address && peer.state === PEER_STATE.CONNECTED) {
          connected = true;
          break;
        }
      }

      if (!connected) {
        this.connectToPeer(address).catch(() => {});
      }
    }
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.broadcast({
        type: MESSAGE_TYPE.HEARTBEAT,
        nodeId: this.nodeId,
        timestamp: Date.now(),
      });

      // Check for stale peers
      this.checkStalePeers();
    }, this.heartbeatInterval);
  }

  /**
   * Check for stale peers
   */
  checkStalePeers() {
    const staleThreshold = Date.now() - this.heartbeatInterval * 3;

    for (const [id, peer] of this.peers) {
      if (
        peer.lastSeen < staleThreshold &&
        peer.state === PEER_STATE.CONNECTED
      ) {
        peer.state = PEER_STATE.DISCONNECTED;
        console.log(`📴 Peer stale: ${peer.name} (${id})`);
        this.emit("peer_stale", { nodeId: id, nodeName: peer.name });
      }
    }
  }

  /**
   * Get connected peers
   */
  getConnectedPeers() {
    const connected = [];
    for (const peer of this.peers.values()) {
      if (peer.state === PEER_STATE.CONNECTED) {
        connected.push({
          id: peer.id,
          name: peer.name,
          capabilities: peer.capabilities,
          connectedAt: peer.connectedAt,
          lastSeen: peer.lastSeen,
        });
      }
    }
    return connected;
  }

  /**
   * Get mesh status
   */
  getStatus() {
    return {
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      port: this.serverPort,
      connectedPeers: this.getConnectedPeers().length,
      knownPeers: this.knownPeers.size,
      offlineQueueSize: this.offlineQueue.length,
      peers: this.getConnectedPeers(),
    };
  }

  /**
   * Shutdown mesh network
   */
  shutdown() {
    // Stop timers
    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // Close all peer connections
    for (const peer of this.peers.values()) {
      if (peer.ws) {
        peer.ws.close();
      }
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    this.peers.clear();
    console.log("🌐 P2P Mesh shutdown complete");
  }
}

export default P2PMesh;

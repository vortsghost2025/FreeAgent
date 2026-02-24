/**
 * INTER-AGENT COMMUNICATION CHANNEL
 *
 * Enables agents to communicate within the ensemble:
 * - sendMessage(): send between agents
 * - broadcast(): announce state changes
 * - requestReview(): ask peer to review work
 *
 * Message Types:
 * - 'state_update': notify of context changes
 * - 'review_request': ask for peer review
 * - 'pattern_share': share learned patterns
 * - 'conflict': report result conflicts for resolution
 */

import { EventEmitter } from "events";

// Message Types
export const MESSAGE_TYPES = {
  STATE_UPDATE: "state_update",
  REVIEW_REQUEST: "review_request",
  PATTERN_SHARE: "pattern_share",
  CONFLICT: "conflict",
  TASK_COMPLETE: "task_complete",
  TASK_FAILED: "task_failed",
  CONTEXT_SYNC: "context_sync",
  STATUS_QUERY: "status_query",
};

/**
 * Message Envelope
 */
class MessageEnvelope {
  constructor(options = {}) {
    this.id = options.id || this._generateId();
    this.type = options.type || MESSAGE_TYPES.STATE_UPDATE;
    this.fromAgentId = options.fromAgentId;
    this.toAgentId = options.toAgentId || null; // null = broadcast
    this.toRole = options.toRole || null; // null = broadcast to all
    this.payload = options.payload || {};
    this.timestamp = options.timestamp || new Date().toISOString();
    this.priority = options.priority || "normal";
    this.replyTo = options.replyTo || null;
    this.metadata = options.metadata || {};
  }

  _generateId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      fromAgentId: this.fromAgentId,
      toAgentId: this.toAgentId,
      toRole: this.toRole,
      payload: this.payload,
      timestamp: this.timestamp,
      priority: this.priority,
      replyTo: this.replyTo,
      metadata: this.metadata,
    };
  }

  static fromObject(obj) {
    return new MessageEnvelope(obj);
  }
}

/**
 * Inter-Agent Channel
 */
export class InterAgentChannel extends EventEmitter {
  constructor(ensembleCoordinator) {
    super();

    this.ensembleCoordinator = ensembleCoordinator;
    this.messageQueue = new Map(); // messageId -> MessageEnvelope
    this.agentSubscriptions = new Map(); // agentId -> Set<messageTypes>
    this.messageHistory = [];
    this.maxHistorySize = 1000;

    this._setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  _setupEventHandlers() {
    // Listen for agent events from coordinator
    if (this.ensembleCoordinator) {
      this.ensembleCoordinator.on("agent:created", (data) => {
        this._subscribeAgentDefaults(data.agentId);
      });

      this.ensembleCoordinator.on("agent:removed", (data) => {
        this._unsubscribeAll(data.agentId);
      });
    }
  }

  /**
   * Send a message from one agent to another
   */
  async sendMessage(message) {
    // Create message envelope
    const envelope =
      message instanceof MessageEnvelope
        ? message
        : new MessageEnvelope(message);

    // Validate message
    if (!envelope.fromAgentId) {
      throw new Error("Message must have fromAgentId");
    }

    // Store message
    this.messageQueue.set(envelope.id, envelope);
    this._addToHistory(envelope);

    // Determine recipients
    const recipients = this._getRecipients(envelope);

    if (recipients.length === 0) {
      console.warn(`⚠️  No recipients for message ${envelope.id}`);
      return { sent: false, recipients: [] };
    }

    // Deliver to recipients
    const deliveryResults = [];

    for (const recipientId of recipients) {
      const result = await this._deliverToAgent(envelope, recipientId);
      deliveryResults.push({ agentId: recipientId, ...result });
    }

    // Emit message sent event
    this.emit("message:sent", {
      messageId: envelope.id,
      from: envelope.fromAgentId,
      to: recipients,
      deliveryResults: deliveryResults,
    });

    console.log(
      `📨 Message ${envelope.id} sent from ${envelope.fromAgentId} to ${recipients.length} agent(s)`,
    );

    return {
      sent: true,
      messageId: envelope.id,
      recipients: deliveryResults,
    };
  }

  /**
   * Broadcast a message to all agents or by role
   */
  async broadcast(message) {
    const envelope =
      message instanceof MessageEnvelope
        ? message
        : new MessageEnvelope(message);

    // Broadcast is sent to all matching recipients
    const result = await this.sendMessage(envelope);

    console.log(
      `📢 Broadcast ${envelope.id} to ${result.recipients.length} agent(s)`,
    );

    return result;
  }

  /**
   * Get recipients for a message
   */
  _getRecipients(envelope) {
    const recipients = [];

    // Specific agent
    if (envelope.toAgentId) {
      if (this.ensembleCoordinator.agents.has(envelope.toAgentId)) {
        recipients.push(envelope.toAgentId);
      }
    }
    // Specific role
    else if (envelope.toRole) {
      for (const [
        agentId,
        agent,
      ] of this.ensembleCoordinator.agents.entries()) {
        if (agent.role === envelope.toRole) {
          recipients.push(agentId);
        }
      }
    }
    // Broadcast to all
    else {
      for (const agentId of this.ensembleCoordinator.agents.keys()) {
        if (agentId !== envelope.fromAgentId) {
          recipients.push(agentId);
        }
      }
    }

    // Filter by subscriptions
    return recipients.filter((agentId) => {
      const subscriptions = this.agentSubscriptions.get(agentId);
      if (!subscriptions) return true; // No subscriptions = receive all
      return subscriptions.has(envelope.type);
    });
  }

  /**
   * Deliver message to a specific agent
   */
  async _deliverToAgent(envelope, agentId) {
    const agent = this.ensembleCoordinator.agents.get(agentId);

    if (!agent) {
      return { delivered: false, error: "Agent not found" };
    }

    try {
      // Emit to agent's emitter
      agent.emitter.emit("message:received", envelope.toObject());

      // Emit through channel
      this.emit("message:delivered", {
        messageId: envelope.id,
        to: agentId,
        envelope: envelope.toObject(),
      });

      return { delivered: true };
    } catch (error) {
      console.error(`❌ Failed to deliver to ${agentId}:`, error);
      return { delivered: false, error: error.message };
    }
  }

  /**
   * Subscribe agent to message types
   */
  subscribe(agentId, messageTypes) {
    const subscriptions = this.agentSubscriptions.get(agentId) || new Set();

    for (const type of Array.isArray(messageTypes)
      ? messageTypes
      : [messageTypes]) {
      subscriptions.add(type);
    }

    this.agentSubscriptions.set(agentId, subscriptions);

    console.log(
      `🔔 Agent ${agentId} subscribed to: ${Array.from(subscriptions).join(", ")}`,
    );
  }

  /**
   * Unsubscribe agent from message types
   */
  unsubscribe(agentId, messageTypes) {
    const subscriptions = this.agentSubscriptions.get(agentId);

    if (!subscriptions) {
      return;
    }

    for (const type of Array.isArray(messageTypes)
      ? messageTypes
      : [messageTypes]) {
      subscriptions.delete(type);
    }

    if (subscriptions.size === 0) {
      this.agentSubscriptions.delete(agentId);
    }
  }

  /**
   * Subscribe agent to defaults
   */
  _subscribeAgentDefaults(agentId) {
    this.subscribe(agentId, [
      MESSAGE_TYPES.TASK_COMPLETE,
      MESSAGE_TYPES.TASK_FAILED,
      MESSAGE_TYPES.STATE_UPDATE,
    ]);
  }

  /**
   * Unsubscribe agent from all
   */
  _unsubscribeAll(agentId) {
    this.agentSubscriptions.delete(agentId);
  }

  /**
   * Add message to history
   */
  _addToHistory(envelope) {
    this.messageHistory.push(envelope.toObject());

    // Trim history if needed
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  /**
   * Get message history
   */
  getMessageHistory(limit = 50, filter = {}) {
    let history = [...this.messageHistory];

    // Apply filters
    if (filter.type) {
      history = history.filter((msg) => msg.type === filter.type);
    }
    if (filter.fromAgentId) {
      history = history.filter((msg) => msg.fromAgentId === filter.fromAgentId);
    }
    if (filter.toAgentId) {
      history = history.filter((msg) => msg.toAgentId === filter.toAgentId);
    }
    if (filter.toRole) {
      history = history.filter((msg) => msg.toRole === filter.toRole);
    }

    // Return recent messages
    return history.slice(-limit).reverse();
  }

  /**
   * Send state update
   */
  async sendStateUpdate(agentId, state) {
    return await this.sendMessage({
      type: MESSAGE_TYPES.STATE_UPDATE,
      fromAgentId: agentId,
      payload: { state },
    });
  }

  /**
   * Request review from another agent
   */
  async requestReview(fromAgentId, toAgentId, work, context = {}) {
    return await this.sendMessage({
      type: MESSAGE_TYPES.REVIEW_REQUEST,
      fromAgentId,
      toAgentId,
      payload: { work, context },
    });
  }

  /**
   * Share a learned pattern
   */
  async sharePattern(agentId, pattern) {
    return await this.broadcast({
      type: MESSAGE_TYPES.PATTERN_SHARE,
      fromAgentId: agentId,
      payload: { pattern },
    });
  }

  /**
   * Report a conflict
   */
  async reportConflict(fromAgentId, conflict, details) {
    return await this.broadcast({
      type: MESSAGE_TYPES.CONFLICT,
      fromAgentId: agentId,
      payload: { conflict, details },
      priority: "high",
    });
  }

  /**
   * Sync context between agents
   */
  async syncContext(agentId, context) {
    return await this.broadcast({
      type: MESSAGE_TYPES.CONTEXT_SYNC,
      fromAgentId: agentId,
      payload: { context },
    });
  }

  /**
   * Query agent status
   */
  async queryStatus(agentId, targetAgentId = null) {
    return await this.sendMessage({
      type: MESSAGE_TYPES.STATUS_QUERY,
      fromAgentId: agentId,
      toAgentId: targetAgentId,
      payload: {},
    });
  }

  /**
   * Get channel statistics
   */
  getStatistics() {
    return {
      totalMessages: this.messageQueue.size,
      historySize: this.messageHistory.length,
      agentSubscriptions: this.agentSubscriptions.size,
      subscriptionDetails: Array.from(this.agentSubscriptions.entries()).map(
        ([agentId, types]) => ({
          agentId,
          types: Array.from(types),
        }),
      ),
    };
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messageHistory = [];
    console.log("🗑️ Message history cleared");
  }

  /**
   * Shutdown channel
   */
  shutdown() {
    this.agentSubscriptions.clear();
    this.messageQueue.clear();
    this.messageHistory = [];

    console.log("🛑 Inter-Agent Channel shut down");
  }
}

// Export convenience functions
export async function sendMessage(ensembleCoordinator, message) {
  const channel = new InterAgentChannel(ensembleCoordinator);
  return await channel.sendMessage(message);
}

export async function broadcast(ensembleCoordinator, message) {
  const channel = new InterAgentChannel(ensembleCoordinator);
  return await channel.broadcast(message);
}

export async function requestReview(
  ensembleCoordinator,
  fromAgentId,
  toAgentId,
  work,
  context,
) {
  const channel = new InterAgentChannel(ensembleCoordinator);
  return await channel.requestReview(fromAgentId, toAgentId, work, context);
}

export async function sharePattern(ensembleCoordinator, agentId, pattern) {
  const channel = new InterAgentChannel(ensembleCoordinator);
  return await channel.sharePattern(agentId, pattern);
}

export async function reportConflict(
  ensembleCoordinator,
  fromAgentId,
  conflict,
  details,
) {
  const channel = new InterAgentChannel(ensembleCoordinator);
  return await channel.reportConflict(fromAgentId, conflict, details);
}

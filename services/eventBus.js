/**
 * FreeAgent Event Bus Service
 * Uses Redis Streams for parallel agent communication
 * 
 * Channels:
 * - tasks: New tasks to be processed
 * - results: Task completion results
 * - events: System-wide events
 */

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Redis connection config
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Stream names
const STREAMS = {
  TASKS: 'freeagent:tasks',
  RESULTS: 'freeagent:results',
  EVENTS: 'freeagent:events'
};

// Consumer group for load balancing
const CONSUMER_GROUP = 'freeagent-agents';

class EventBus {
  constructor(options = {}) {
    this.redis = null;
    this.consumerName = options.consumerName || `agent-${uuidv4().slice(0, 8)}`;
    this.stream = options.stream || STREAMS.TASKS;
    this.group = options.group || CONSUMER_GROUP;
    this.handlers = new Map();
    this.running = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      this.redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100
      });

      this.redis.on('connect', () => {
        console.log(`[EventBus] Connected to Redis: ${REDIS_URL}`);
      });

      this.redis.on('error', (err) => {
        console.error('[EventBus] Redis error:', err.message);
      });

      // Create consumer group if not exists
      await this._ensureGroup();
      
      return this;
    } catch (error) {
      console.error('[EventBus] Failed to connect:', error.message);
      throw error;
    }
  }

  /**
   * Ensure consumer group exists
   */
  async _ensureGroup() {
    try {
      // Try to create group - will fail if exists, which is fine
      await this.redis.xgroup('CREATE', this.stream, this.group, '0', 'MKSTREAM');
      console.log(`[EventBus] Created consumer group: ${this.group}`);
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        // Group exists, that's fine
        console.log(`[EventBus] Consumer group exists: ${this.group}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Publish a task to the stream
   */
  async publishTask(task) {
    const taskId = task.id || uuidv4();
    const message = {
      id: taskId,
      type: task.type || 'default',
      payload: JSON.stringify(task.payload || task),
      priority: task.priority || 0,
      agentType: task.agentType || 'any',
      createdAt: new Date().toISOString()
    };

    // Add to tasks stream
    const result = await this.redis.xadd(
      STREAMS.TASKS,
      '*',
      'data', JSON.stringify(message)
    );

    console.log(`[EventBus] Published task ${taskId}: ${message.type}`);
    return { id: taskId, streamId: result };
  }

  /**
   * Publish a result
   */
  async publishResult(result) {
    const message = {
      ...result,
      completedAt: new Date().toISOString()
    };

    const resultId = await this.redis.xadd(
      STREAMS.RESULTS,
      '*',
      'data', JSON.stringify(message)
    );

    console.log(`[EventBus] Published result: ${result.taskId}`);
    return resultId;
  }

  /**
   * Publish a system event
   */
  async publishEvent(event) {
    const message = {
      ...event,
      timestamp: new Date().toISOString()
    };

    return await this.redis.xadd(
      STREAMS.EVENTS,
      '*',
      'data', JSON.stringify(message)
    );
  }

  /**
   * Subscribe to tasks and process them
   */
  async subscribe(handler) {
    this.running = true;
    console.log(`[EventBus] ${this.consumerName} starting consumer...`);

    while (this.running) {
      try {
        // Read new messages from stream
        const messages = await this.redis.xreadgroup(
          'GROUP', this.group,
          this.consumerName,
          'COUNT', 1,
          'BLOCK', 5000, // 5 second blocking read
          'STREAMS', this.stream, '>'
        );

        if (!messages || messages.length === 0) {
          continue;
        }

        for (const [stream, entries] of messages) {
          for (const [id, fields] of entries) {
            const data = fields[0][1];
            try {
              const task = JSON.parse(data);
              
              console.log(`[EventBus] ${this.consumerName} processing: ${task.type}`);
              
              // Process the task
              const result = await handler(task);
              
              // Acknowledge and publish result
              await this.redis.xack(this.stream, this.group, id);
              
              // Publish result
              await this.publishResult({
                taskId: task.id,
                consumer: this.consumerName,
                status: 'completed',
                result
              });

            } catch (error) {
              console.error(`[EventBus] Error processing message ${id}:`, error.message);
              
              // Publish error result
              await this.publishResult({
                taskId: 'unknown',
                consumer: this.consumerName,
                status: 'error',
                error: error.message
              });
              
              // Still acknowledge to prevent redelivery
              await this.redis.xack(this.stream, this.group, id);
            }
          }
        }
      } catch (error) {
        if (error.message.includes('BUSY')) {
          // Another consumer is processing, wait and retry
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.error('[EventBus] Consumer error:', error.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  /**
   * Stop consuming
   */
  stop() {
    this.running = false;
    console.log(`[EventBus] ${this.consumerName} stopping...`);
  }

  /**
   * Get stream info
   */
  async getStreamInfo(streamName = STREAMS.TASKS) {
    try {
      const info = await this.redis.xinfo('STREAM', streamName);
      return info;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get pending messages
   */
  async getPending() {
    try {
      const pending = await this.redis.xpending(
        STREAMS.TASKS,
        this.group,
        '-', '+', 10
      );
      return pending;
    } catch (error) {
      return [];
    }
  }

  /**
   * Close connection
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      console.log('[EventBus] Disconnected');
    }
  }
}

/**
 * Factory to create event bus instances
 */
function createEventBus(options) {
  return new EventBus(options).connect();
}

module.exports = {
  EventBus,
  createEventBus,
  STREAMS
};

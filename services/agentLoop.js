/**
 * Reusable Agent Loop Template
 * 
 * All agents use this same loop - just provide:
 * - agentRole: which role this agent handles
 * - handler: function(task) => result
 */

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { STREAMS, GROUPS, STATUS, createResult, getGroupForRole } = require('./eventBusConstants');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Create an agent loop for any role
 * 
 * @param {Object} config
 * @param {string} config.agentRole - Role this agent handles (e.g., 'coder', 'researcher')
 * @param {string} config.workerName - Optional custom worker name
 * @param {Function} config.handler - Async function(task) => result
 * @param {Function} config.onError - Optional error handler
 */
function createAgentLoop({ agentRole, workerName, handler, onError }) {
  
  const consumerName = workerName || `worker-${agentRole}-${uuidv4().slice(0, 6)}`;
  const groupName = getGroupForRole(agentRole);
  
  let redis = null;
  let running = false;
  
  async function connect() {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100
    });
    
    redis.on('connect', () => {
      console.log(`[${agentRole}] Connected to Redis`);
    });
    
    redis.on('error', (err) => {
      console.error(`[${agentRole}] Redis error:`, err.message);
    });
    
    // Ensure consumer group exists
    try {
      await redis.xgroup('CREATE', STREAMS.TASKS, groupName, '0', 'MKSTREAM');
      console.log(`[${agentRole}] Created group: ${groupName}`);
    } catch (e) {
      if (e.message.includes('BUSYGROUP')) {
        console.log(`[${agentRole}] Group exists: ${groupName}`);
      } else {
        throw e;
      }
    }
    
    return redis;
  }
  
  async function processTask(task) {
    const startTime = Date.now();
    
    try {
      console.log(`[${agentRole}] Processing task: ${task.task_id}`);
      
      // Parse payload if string
      const payload = typeof task.payload === 'string' 
        ? JSON.parse(task.payload) 
        : task.payload;
      
      // Call the handler
      const result = await handler({ ...task, payload });
      
      const duration = Date.now() - startTime;
      
      // Publish result
      const resultMsg = createResult({
        taskId: task.task_id,
        agentRole: agentRole,
        status: STATUS.OK,
        output: result,
        durationMs: duration
      });
      
      await redis.xadd(STREAMS.RESULTS, '*', 'data', JSON.stringify(resultMsg));
      
      console.log(`[${agentRole}] Completed task ${task.task_id} in ${duration}ms`);
      
      return resultMsg;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[${agentRole}] Error on task ${task.task_id}:`, error.message);
      
      // Publish error result
      const resultMsg = createResult({
        taskId: task.task_id,
        agentRole: agentRole,
        status: STATUS.ERROR,
        output: { error: error.message },
        logs: error.stack,
        durationMs: duration
      });
      
      await redis.xadd(STREAMS.RESULTS, '*', 'data', JSON.stringify(resultMsg));
      
      if (onError) {
        onError(error, task);
      }
      
      return resultMsg;
    }
  }
  
  async function consume() {
    running = true;
    console.log(`[${agentRole}] ${consumerName} starting consume loop...`);
    
    while (running) {
      try {
        // Blocking read from stream
        const messages = await redis.xreadgroup(
          'GROUP', groupName,
          consumerName,
          'COUNT', 1,
          'BLOCK', 5000,
          'STREAMS', STREAMS.TASKS, '>'
        );
        
        if (!messages || messages.length === 0) {
          continue; // No messages, loop again
        }
        
        for (const [stream, entries] of messages) {
          for (const [msgId, fields] of entries) {
            // Parse the task
            const data = fields[0][1];
            const task = JSON.parse(data);
            
            // Filter: only process tasks for our role
            if (task.agent_role !== agentRole) {
              // Not for us, ack anyway (or implement re-queue)
              await redis.xack(STREAMS.TASKS, groupName, msgId);
              continue;
            }
            
            // Process and ack
            await processTask(task);
            await redis.xack(STREAMS.TASKS, groupName, msgId);
          }
        }
        
      } catch (error) {
        if (error.message.includes('BUSY')) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.error(`[${agentRole}] Consume error:`, error.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  function stop() {
    running = false;
    console.log(`[${agentRole}] Stopping...`);
  }
  
  async function disconnect() {
    if (redis) {
      await redis.quit();
      console.log(`[${agentRole}] Disconnected`);
    }
  }
  
  // Return the agent API
  return {
    start: connect,
    consume,
    stop,
    disconnect,
    getConsumerName: () => consumerName,
    getGroupName: () => groupName
  };
}

/**
 * Quick start an agent with just a role and handler
 * 
 * @example
 * const agent = quickAgent('coder', async (task) => {
 *   return { code: 'console.log("hello")' };
 * });
 * agent.start().then(() => agent.consume());
 */
function quickAgent(agentRole, handler) {
  const agent = createAgentLoop({ agentRole, handler });
  return agent;
}

module.exports = {
  createAgentLoop,
  quickAgent
};

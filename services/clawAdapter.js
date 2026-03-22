/**
 * Claw Adapter - Integrates Claw agent into Event Bus
 * 
 * Usage:
 *   node services/clawAdapter.js
 */

const { quickAgent } = require('./agentLoop');
const { ROLES } = require('./eventBusConstants');
const axios = require('axios');

// Configure Claw endpoint
const CLAW_URL = process.env.CLAW_URL || "http://localhost:5000/api";

const clawAdapter = quickAgent(ROLES.CLAW, async (task) => {
  try {
    console.log(`[ClawAdapter] Forwarding task to Claw: ${CLAW_URL}`);
    
    // Forward task payload to Claw endpoint
    const response = await axios.post(CLAW_URL, task.payload, {
      timeout: 60000, // 60s timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      status: "ok",
      output: JSON.stringify(response.data),
      logs: "Claw task completed successfully"
    };
  } catch (err) {
    console.error(`[ClawAdapter] Error:`, err.message);
    
    return {
      status: "error",
      output: JSON.stringify(err.message),
      logs: "Claw task failed"
    };
  }
});

// Start the adapter
clawAdapter.start().then(() => {
  console.log('[ClawAdapter] Started - listening for tasks');
  clawAdapter.consume();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[ClawAdapter] Shutting down...');
  clawAdapter.stop();
  await clawAdapter.disconnect();
  process.exit(0);
});

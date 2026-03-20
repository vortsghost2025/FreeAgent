/**
 * Kilo Agent - Planning/Dev/Fallback Agent via Kilo API
 * 
 * Usage:
 *   node services/kiloAgent.js
 * 
 * Environment:
 *   KILO_API_KEY=your_kilo_api_key
 */

const { quickAgent } = require('./agentLoop');
const { ROLES } = require('./eventBusConstants');
const axios = require('axios');

const KILO_API = process.env.KILO_API || "https://api.kilo.ai/v1";
const KILO_KEY = process.env.KILO_API_KEY;

const kiloAgent = quickAgent(ROLES.KILO, async (task) => {
  try {
    if (!KILO_KEY) {
      throw new Error('KILO_API_KEY not set');
    }
    
    console.log(`[KiloAgent] Processing task: ${task.payload?.substring(0, 50)}...`);
    
    const response = await axios.post(`${KILO_API}/autocomplete`, {
      prompt: task.payload,
      model: "kilo-code",
      max_tokens: 500,
    }, {
      headers: { 
        'Authorization': `Bearer ${KILO_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return { 
      status: "ok", 
      output: JSON.stringify(response.data),
      logs: "Kilo task completed"
    };
  } catch (err) {
    console.error(`[KiloAgent] Error:`, err.message);
    
    return { 
      status: "error", 
      output: JSON.stringify(err.message),
      logs: "Kilo task failed"
    };
  }
});

// Start the agent
kiloAgent.start().then(() => {
  console.log('[KiloAgent] Started - listening for tasks');
  kiloAgent.consume();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[KiloAgent] Shutting down...');
  kiloAgent.stop();
  await kiloAgent.disconnect();
  process.exit(0);
});

#!/usr/bin/env node
/**
 * LM Studio MCP Server
 * Connects to LM Studio 0.4.6 at http://localhost:1234/v1
 * Provides JSON-RPC MCP protocol for VS Code integration
 * 
 * Supports:
 * - Model loading/unloading via LM Studio API
 * - Chat completions via /api/v1/chat/completions
 * - RAM monitoring with auto-unload at 85% threshold
 */

const http = require('http');
const https = require('https');

const LM_STUDIO_HOST = process.env.LM_STUDIO_HOST || '192.168.0.138';
const LM_STUDIO_PORT = process.env.LM_STUDIO_PORT || 1234;
const DEFAULT_MODEL = process.env.LM_STUDIO_MODEL || 'qwen2.5-7b-instruct-1m';
const RAM_WARNING_THRESHOLD = 0.75;
const RAM_CRITICAL_THRESHOLD = 0.85;
const RAM_EMERGENCY_THRESHOLD = 0.90;

// State
let currentModel = null;
let isProcessing = false;

console.log('🚀 LM Studio MCP Server Starting...');
console.log(`✅ LM Studio: ${LM_STUDIO_HOST}:${LM_STUDIO_PORT}`);
console.log(`✅ Default Model: ${DEFAULT_MODEL}`);
console.log(`✅ RAM Thresholds - Warning: ${RAM_WARNING_THRESHOLD * 100}%, Critical: ${RAM_CRITICAL_THRESHOLD * 100}%, Emergency: ${RAM_EMERGENCY_THRESHOLD * 100}%`);

/**
 * Make HTTP request to LM Studio API
 */
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: LM_STUDIO_HOST,
      port: LM_STUDIO_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const protocol = LM_STUDIO_PORT === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Check LM Studio health
 */
async function checkHealth() {
  try {
    const response = await makeRequest('/api/v1/models');
    return { status: 'healthy', models: response.data || [] };
  } catch (error) {
    return { status: 'unavailable', error: error.message };
  }
}

/**
 * Load a model into LM Studio
 */
async function loadModel(modelName, options = {}) {
  console.log(`[LM Studio] Loading model: ${modelName}`);
  try {
    const response = await makeRequest('/api/v1/model/load', 'POST', {
      model: modelName,
      gpu_offload: options.gpu_offload ?? 1.0,
      context_length: options.context_length ?? 4096,
      threads: options.threads ?? 8,
    });
    currentModel = modelName;
    console.log(`[LM Studio] Model loaded: ${modelName}`);
    return { success: true, model: modelName, response };
  } catch (error) {
    console.error(`[LM Studio] Failed to load model: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Unload a model from LM Studio
 */
async function unloadModel(modelName = null) {
  const targetModel = modelName || currentModel;
  console.log(`[LM Studio] Unloading model: ${targetModel}`);
  try {
    const response = await makeRequest('/api/v1/model/unload', 'POST', {
      model: targetModel,
    });
    if (currentModel === targetModel) {
      currentModel = null;
    }
    console.log(`[LM Studio] Model unloaded: ${targetModel}`);
    return { success: true, model: targetModel };
  } catch (error) {
    console.error(`[LM Studio] Failed to unload model: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get current model status
 */
async function getModelStatus() {
  try {
    const response = await makeRequest('/api/v1/model/status');
    return response;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Send chat completion request to LM Studio
 */
async function chatCompletion(messages, options = {}) {
  if (isProcessing) {
    return { error: 'Server is busy processing another request' };
  }

  isProcessing = true;
  try {
    const requestBody = {
      model: options.model || currentModel || DEFAULT_MODEL,
      messages: messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 256,
      stream: false,
    };

    const response = await makeRequest('/api/v1/chat/completions', 'POST', requestBody);
    return response;
  } catch (error) {
    console.error(`[LM Studio] Chat completion error: ${error.message}`);
    return { error: error.message };
  } finally {
    isProcessing = false;
  }
}

/**
 * Get system RAM usage
 */
function getRAMUsage() {
  const os = require('os');
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercent = usedMemory / totalMemory;
  
  return {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    percent: usagePercent,
  };
}

/**
 * Check and handle RAM thresholds
 */
async function checkRAMAndManageModels() {
  const ram = getRAMUsage();
  
  if (ram.percent >= RAM_EMERGENCY_THRESHOLD) {
    console.warn(`[RAM] EMERGENCY: RAM at ${(ram.percent * 100).toFixed(1)}% - Unloading all models`);
    await unloadModel();
    return { action: 'emergency_unload', ram: ram };
  } else if (ram.percent >= RAM_CRITICAL_THRESHOLD) {
    console.warn(`[RAM] CRITICAL: RAM at ${(ram.percent * 100).toFixed(1)}% - Unloading secondary model`);
    if (currentModel) {
      await unloadModel();
    }
    return { action: 'critical_unload', ram: ram };
  } else if (ram.percent >= RAM_WARNING_THRESHOLD) {
    console.log(`[RAM] WARNING: RAM at ${(ram.percent * 100).toFixed(1)}%`);
    return { action: 'warning', ram: ram };
  }
  
  return { action: 'ok', ram: ram };
}

// Handle MCP JSON-RPC messages from stdin
process.stdin.resume();

process.stdin.on('data', async (data) => {
  try {
    const msg = JSON.parse(data.toString());
    const method = msg.method;
    const msgId = msg.id;
    
    console.log(`[MCP] Received: ${method}`);
    
    let result = null;
    let error = null;
    
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '1.0',
          capabilities: {
            tools: true,
            resources: true,
          },
          serverInfo: {
            name: 'lmstudio-mcp-server',
            version: '1.0.0',
          },
        };
        break;
        
      case 'tools/list':
        result = {
          tools: [
            {
              name: 'load_model',
              description: 'Load a model into LM Studio',
              inputSchema: {
                type: 'object',
                properties: {
                  model: { type: 'string', description: 'Model name to load' },
                  gpu_offload: { type: 'number', description: 'GPU offload ratio (0-1)' },
                  context_length: { type: 'number', description: 'Context length' },
                  threads: { type: 'number', description: 'CPU threads' },
                },
                required: ['model'],
              },
            },
            {
              name: 'unload_model',
              description: 'Unload a model from LM Studio',
              inputSchema: {
                type: 'object',
                properties: {
                  model: { type: 'string', description: 'Model name to unload (optional)' },
                },
              },
            },
            {
              name: 'chat_complete',
              description: 'Send a chat completion request to LM Studio',
              inputSchema: {
                type: 'object',
                properties: {
                  messages: { type: 'array', description: 'Chat messages' },
                  model: { type: 'string', description: 'Model name (optional)' },
                  temperature: { type: 'number', description: 'Temperature (0-2)' },
                  max_tokens: { type: 'number', description: 'Max tokens to generate' },
                },
                required: ['messages'],
              },
            },
            {
              name: 'get_status',
              description: 'Get LM Studio and model status',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'check_ram',
              description: 'Check RAM usage and auto-manage models',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
          ],
        };
        break;
        
      case 'tools/call':
        const toolName = msg.params?.name;
        const toolArgs = msg.params?.arguments || {};
        
        switch (toolName) {
          case 'load_model':
            result = await loadModel(toolArgs.model, toolArgs);
            break;
          case 'unload_model':
            result = await unloadModel(toolArgs.model);
            break;
          case 'chat_complete':
            result = await chatCompletion(toolArgs.messages, toolArgs);
            break;
          case 'get_status':
            result = {
              health: await checkHealth(),
              currentModel: currentModel,
              modelStatus: await getModelStatus(),
              ram: getRAMUsage(),
            };
            break;
          case 'check_ram':
            result = await checkRAMAndManageModels();
            break;
          default:
            error = { code: -32601, message: `Unknown tool: ${toolName}` };
        }
        break;
        
      case 'resources/list':
        result = {
          resources: [
            {
              uri: 'ram://status',
              name: 'RAM Status',
              mimeType: 'application/json',
            },
            {
              uri: 'lmstudio://status',
              name: 'LM Studio Status',
              mimeType: 'application/json',
            },
          ],
        };
        break;
        
      case 'resources/read':
        const uri = msg.params?.uri;
        if (uri === 'ram://status') {
          result = { content: [{ text: JSON.stringify(getRAMUsage()) }] };
        } else if (uri === 'lmstudio://status') {
          result = { content: [{ text: JSON.stringify(await getModelStatus()) }] };
        }
        break;
        
      default:
        // For unknown methods, just acknowledge
        result = { acknowledged: true, method: method };
    }
    
    // Send response
    const response = {
      jsonrpc: '2.0',
      id: msgId || 1,
    };
    
    if (error) {
      response.error = error;
    } else {
      response.result = result;
    }
    
    process.stdout.write(JSON.stringify(response) + '\n');
    
  } catch (e) {
    console.error('[MCP] Error:', e.message);
  }
});

// Periodic RAM check
setInterval(async () => {
  await checkRAMAndManageModels();
}, 30000); // Every 30 seconds

// Initial status
console.log('[LM Studio] Server ready');

/**
 * LM Studio Dual-Model Manager
 * Manages Lingma Qwen and CALM models with RAM monitoring and auto-unload
 * 
 * Features:
 * - Sequential and parallel model loading
 * - RAM monitoring with 85% threshold auto-unload
 * - Q4_K_M quantization support
 * - Context length 2048-4096
 * - GPU offloading configuration
 */

import https from 'https';
import os from 'os';

// Configuration
const LM_STUDIO_HOST = process.env.LM_STUDIO_HOST || '192.168.0.138';
const LM_STUDIO_PORT = process.env.LM_STUDIO_PORT || 1234;
const RAM_WARNING_THRESHOLD = 0.75;
const RAM_CRITICAL_THRESHOLD = 0.85;
const RAM_EMERGENCY_THRESHOLD = 0.90;

// Model configurations - ACTUAL MODEL IN USE
const MODEL_CONFIGS = {
  qwen: {
    id: 'qwen2.5-7b-instruct-1m',
    name: 'Qwen 2.5 7B Instruct 1M',
    path: 'lmstudio-community/Qwen2.5-7B-Instruct-1M-GGUF/Qwen2.5-7B-Instruct-1M-Q4_K_M.gguf',
    context_length: 8192,
    gpu_offload: 1.0,
    threads: 8,
    batch_size: 512,
    priority: 1,
  },
  // Legacy configs kept for reference
  lingma: {
    id: 'lingma-qwen-7b',
    name: 'Lingma Qwen',
    path: 'models/lingma-qwen-7b-q4_k_m.gguf',
    context_length: 4096,
    gpu_offload: 1.0,
    threads: 8,
    batch_size: 512,
    priority: 1,
  },
  calm: {
    id: 'calm-7b',
    name: 'CALM Model',
    path: 'models/calm-7b-q4_k_m.gguf',
    context_length: 4096,
    gpu_offload: 1.0,
    threads: 8,
    batch_size: 512,
    prompt_cache: false,
    priority: 2,
  },
};

// State
let loadedModels = new Map();
let isParallelMode = false;
let ramMonitorInterval = null;

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

    const protocol = LM_STUDIO_PORT === 443 ? https : require('http');
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
 * Get system RAM usage
 */
export function getRAMUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercent = usedMemory / totalMemory;
  
  return {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    percent: usagePercent,
    totalGB: (totalMemory / (1024 ** 3)).toFixed(2),
    usedGB: (usedMemory / (1024 ** 3)).toFixed(2),
    freeGB: (freeMemory / (1024 ** 3)).toFixed(2),
  };
}

/**
 * Check if LM Studio is available
 */
export async function checkLMStudioStatus() {
  try {
    const models = await makeRequest('/api/v1/models');
    const status = await makeRequest('/api/v1/model/status');
    return {
      available: true,
      models: models.data || [],
      loadedModels: status.loaded || [],
      ram: getRAMUsage(),
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      ram: getRAMUsage(),
    };
  }
}

/**
 * Load a model into LM Studio
 */
export async function loadModel(modelKey) {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  console.log(`[LM Studio] Loading ${config.name}...`);
  
  try {
    const response = await makeRequest('/api/v1/model/load', 'POST', {
      model: config.path,
      gpu_offload: config.gpu_offload,
      context_length: config.context_length,
      threads: config.threads,
    });

    loadedModels.set(modelKey, {
      ...config,
      loadedAt: Date.now(),
      status: 'loaded',
    });

    console.log(`[LM Studio] ${config.name} loaded successfully`);
    return { success: true, model: modelKey, config, response };
  } catch (error) {
    console.error(`[LM Studio] Failed to load ${config.name}:`, error.message);
    return { success: false, model: modelKey, error: error.message };
  }
}

/**
 * Unload a model from LM Studio
 */
export async function unloadModel(modelKey) {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  console.log(`[LM Studio] Unloading ${config.name}...`);
  
  try {
    await makeRequest('/api/v1/model/unload', 'POST', {
      model: config.path,
    });

    loadedModels.delete(modelKey);
    console.log(`[LM Studio] ${config.name} unloaded`);
    return { success: true, model: modelKey };
  } catch (error) {
    console.error(`[LM Studio] Failed to unload ${config.name}:`, error.message);
    return { success: false, model: modelKey, error: error.message };
  }
}

/**
 * Unload all models
 */
export async function unloadAllModels() {
  const results = [];
  for (const modelKey of loadedModels.keys()) {
    results.push(await unloadModel(modelKey));
  }
  return results;
}

/**
 * Check RAM and auto-manage models
 */
export async function checkRAMAndManage() {
  const ram = getRAMUsage();
  
  console.log(`[RAM] Usage: ${ram.percent.toFixed(1)}% (${ram.usedGB}GB / ${ram.totalGB}GB)`);
  
  if (ram.percent >= RAM_EMERGENCY_THRESHOLD) {
    console.warn(`[RAM] EMERGENCY: ${(ram.percent * 100).toFixed(1)}% - Unloading ALL models`);
    await unloadAllModels();
    return { action: 'emergency_unload', ram };
  }
  
  if (ram.percent >= RAM_CRITICAL_THRESHOLD) {
    // Unload secondary model first
    const secondaryModel = loadedModels.get('calm');
    if (secondaryModel) {
      console.warn(`[RAM] CRITICAL: ${(ram.percent * 100).toFixed(1)}% - Unloading CALM`);
      await unloadModel('calm');
      return { action: 'unload_secondary', ram };
    }
    // If CALM not loaded, unload lingma
    const primaryModel = loadedModels.get('lingma');
    if (primaryModel) {
      console.warn(`[RAM] CRITICAL: ${(ram.percent * 100).toFixed(1)}% - Unloading Lingma`);
      await unloadModel('lingma');
      return { action: 'unload_primary', ram };
    }
    return { action: 'critical_no_models', ram };
  }
  
  if (ram.percent >= RAM_WARNING_THRESHOLD) {
    console.log(`[RAM] WARNING: ${(ram.percent * 100).toFixed(1)}%`);
    return { action: 'warning', ram };
  }
  
  return { action: 'ok', ram };
}

/**
 * Load models in sequential mode (one at a time)
 */
export async function loadSequential(primaryModel = 'lingma') {
  isParallelMode = false;
  
  // Unload all first
  await unloadAllModels();
  
  // Check RAM before loading
  const ram = getRAMUsage();
  if (ram.percent >= RAM_CRITICAL_THRESHOLD) {
    return { success: false, error: 'Insufficient RAM for sequential loading' };
  }
  
  // Load primary model
  const result = await loadModel(primaryModel);
  return result;
}

/**
 * Load models in parallel mode (both at once)
 */
export async function loadParallel() {
  isParallelMode = true;
  
  // Unload all first
  await unloadAllModels();
  
  // Check RAM before loading
  const ram = getRAMUsage();
  // For parallel, we need more RAM (roughly 2x model size)
  if (ram.percent >= 0.70) {
    console.warn(`[RAM] Low RAM for parallel loading: ${ram.percent.toFixed(1)}%`);
  }
  
  // Load both models
  const lingmaResult = await loadModel('lingma');
  const calmResult = await loadModel('calm');
  
  // Check final RAM status
  const finalRam = getRAMUsage();
  if (finalRam.percent >= RAM_CRITICAL_THRESHOLD) {
    console.warn('[RAM] Critical after parallel load - consider unloading CALM');
  }
  
  return {
    lingma: lingmaResult,
    calm: calmResult,
    ram: finalRam,
  };
}

/**
 * Send chat completion request
 */
export async function chatComplete(messages, modelKey = 'lingma', options = {}) {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  // Check if model is loaded
  if (!loadedModels.has(modelKey)) {
    // Try to load it
    const loadResult = await loadModel(modelKey);
    if (!loadResult.success) {
      return { error: `Model ${modelKey} not loaded and failed to load: ${loadResult.error}` };
    }
  }

  const requestBody = {
    model: config.path,
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 256,
    stream: false,
  };

  try {
    const response = await makeRequest('/api/v1/chat/completions', 'POST', requestBody);
    return response;
  } catch (error) {
    console.error(`[LM Studio] Chat completion error:`, error.message);
    return { error: error.message };
  }
}

/**
 * Start RAM monitoring
 */
export function startRAMMonitor(intervalMs = 30000) {
  if (ramMonitorInterval) {
    clearInterval(ramMonitorInterval);
  }
  
  ramMonitorInterval = setInterval(async () => {
    await checkRAMAndManage();
  }, intervalMs);
  
  console.log(`[LM Studio] RAM monitor started (interval: ${intervalMs}ms)`);
  return ramMonitorInterval;
}

/**
 * Stop RAM monitoring
 */
export function stopRAMMonitor() {
  if (ramMonitorInterval) {
    clearInterval(ramMonitorInterval);
    ramMonitorInterval = null;
    console.log('[LM Studio] RAM monitor stopped');
  }
}

/**
 * Get loaded models info
 */
export function getLoadedModels() {
  return Array.from(loadedModels.entries()).map(([key, value]) => ({
    key,
    ...value,
  }));
}

/**
 * Get model configuration
 */
export function getModelConfig(modelKey) {
  return MODEL_CONFIGS[modelKey] || null;
}

/**
 * Get all model configs
 */
export function getAllModelConfigs() {
  return MODEL_CONFIGS;
}

// Default instance for easy importing
export default {
  getRAMUsage,
  checkLMStudioStatus,
  loadModel,
  unloadModel,
  unloadAllModels,
  checkRAMAndManage,
  loadSequential,
  loadParallel,
  chatComplete,
  startRAMMonitor,
  stopRAMMonitor,
  getLoadedModels,
  getModelConfig,
  getAllModelConfigs,
  MODEL_CONFIGS,
};

/*
  File: agent-registry.js
  Description: Registers all 8 agents using StandardAgent.
  Dynamic model resolution with priority-based fallback and caching.
*/

import { CodeAgent } from "./agents/code-agent.js";
import { DataAgent } from "./agents/data-agent.js";
import { ClinicalAgent } from "./agents/clinical-agent.js";
import { TestAgent } from "./agents/test-agent.js";
import { SecurityAgent } from "./agents/security-agent.js";
import { ApiAgent } from "./agents/api-agent.js";
import { DbAgent } from "./agents/db-agent.js";
import { DevOpsAgent } from "./agents/devops-agent.js";
import { KiloAgent, kiloAgent } from "./agents/kilo-agent.js";

/**
 * Model priority list - higher priority = preferred first
 * Supports version patterns like "llama3.*" to match any llama3 version
 */
const MODEL_PRIORITIES = [
  'llama3.2',      // newest llama3
  'llama3.1',
  'llama3',
  'deepseek-coder',  // good for coding
  'llama',
];

/**
 * Cached resolved model to avoid repeated Ollama queries
 */
let cachedModel = null;

/**
 * Extract version number from model name for sorting
 * e.g., "llama3.1:8b" -> 3.1
 */
function extractVersion(modelName) {
  const match = modelName.match(/(\d+)\.(\d+)/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return 0;
}

/**
 * Check if model matches a priority pattern
 * Supports wildcards: "llama3.*" matches "llama3.1", "llama3.2", etc.
 */
function matchesPattern(modelName, pattern) {
  if (pattern.includes('*')) {
    const regexPattern = pattern.replace('*', '.*');
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(modelName);
  }
  return modelName === pattern || modelName.startsWith(pattern + ':');
}

/**
 * Sort models within a family by version (highest first)
 */
function sortByVersion(models) {
  return models.sort((a, b) => extractVersion(b) - extractVersion(a));
}

/**
 * Resolve the best available model from Ollama
 * Priority:
 * 1. Match against MODEL_PRIORITIES list
 * 2. Pick highest version within matched family
 * 3. Fall back to first available model
 * 4. Fall back to hardcoded default
 *
 * @returns {Promise<string>} The resolved model name
 */
async function resolveModelName() {
  // Return cached result if available
  if (cachedModel) {
    return cachedModel;
  }

  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const availableModels = data.models?.map(m => m.name) || [];

    if (availableModels.length === 0) {
      console.warn('[ModelResolver] No models found in Ollama, using fallback');
      cachedModel = 'llama3.1:8b';
      return cachedModel;
    }

    console.log(`[ModelResolver] Available models: ${availableModels.join(', ')}`);

    // Try each priority pattern
    for (const pattern of MODEL_PRIORITIES) {
      const matchingModels = availableModels.filter(m => matchesPattern(m, pattern));

      if (matchingModels.length > 0) {
        // Sort by version and pick highest
        const sorted = sortByVersion(matchingModels);
        const bestMatch = sorted[0];

        console.log(`[ModelResolver] Pattern "${pattern}" matched: ${matchingModels.join(', ')}`);
        console.log(`[ModelResolver] Selected: ${bestMatch}`);

        cachedModel = bestMatch;
        return bestMatch;
      }
    }

    // No priority matched - use first available
    console.warn(`[ModelResolver] No priority match, using first available: ${availableModels[0]}`);
    cachedModel = availableModels[0];
    return availableModels[0];

  } catch (error) {
    console.error('[ModelResolver] Failed to resolve model:', error.message);
    console.warn('[ModelResolver] Using fallback model: llama3.1:8b');
    cachedModel = 'llama3.1:8b';
    return cachedModel;
  }
}

/**
 * Clear cached model (useful after installing new models)
 */
export function clearModelCache() {
  cachedModel = null;
  console.log('[ModelResolver] Model cache cleared');
}

/**
 * Load all 8 agents with dynamically resolved model
 * @returns {Promise<Object>} Map of agent name to agent instance
 */
export async function loadAgents() {
  const model = await resolveModelName();

  return {
    code: new CodeAgent(model),
    data: new DataAgent(model),
    clinical: new ClinicalAgent(model),
    test: new TestAgent(model),
    security: new SecurityAgent(model),
    api: new ApiAgent(model),
    db: new DbAgent(model),
    devops: new DevOpsAgent(model),
    kilo: kiloAgent  // Master orchestration agent
  };
}

/**
 * Get the currently resolved model name
 * @returns {Promise<string>}
 */
export async function getResolvedModel() {
  if (!cachedModel) {
    await resolveModelName();
  }
  return cachedModel;
}

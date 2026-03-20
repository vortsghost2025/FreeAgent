
/**
 * Enhanced Persistent AI Environment
 * Integrates the 48-layer memory synchronization engine for exponential AI evolution
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPersistentMemoryInstance } from './global-persistent-memory-manager.js';
import { AutonomousLoreLogger } from './autonomous-lore-logger.js';
import { getMemorySynchronizationEngine } from './memory-synchronization-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedAIEnvironment {
  constructor(options = {}) {
    this.environmentPath = options.environmentPath || './enhanced-ai-environment';
    this.modelsPath = path.join(this.environmentPath, 'models');
    this.memoriesPath = path.join(this.environmentPath, 'memories');
    this.learningsPath = path.join(this.environmentPath, 'learnings');
    this.artifactsPath = path.join(this.environmentPath, 'artifacts');
    this.logsPath = path.join(this.environmentPath, 'logs');
    
    this.models = new Map(); // Store active model instances
    this.modelRegistry = new Map(); // Store model metadata
    this.sharedKnowledge = new Map(); // Shared learnings between models
    this.loreLogger = new AutonomousLoreLogger(path.join(this.logsPath, 'environment-saga.log'));
    this.persistentMemory = getPersistentMemoryInstance({
      storagePath: path.join(this.environmentPath, 'environment-state.json')
    });
    
    // Reference to the 48-layer memory synchronization engine
    this.memorySynchronizationEngine = null;
    
    this.isInitialized = false;
  }

  async initialize() {
    console.log('[EnhancedAIEnvironment] initialize() START');
    if (this.isInitialized) return;
    try {
      console.log('[EnhancedAIEnvironment] Creating environment directory...');
      await fs.mkdir(this.environmentPath, { recursive: true });
      console.log('[EnhancedAIEnvironment] Environment directory created.');
      console.log('[EnhancedAIEnvironment] Creating models directory...');
      await fs.mkdir(this.modelsPath, { recursive: true });
      console.log('[EnhancedAIEnvironment] Models directory created.');
      console.log('[EnhancedAIEnvironment] Creating memories directory...');
      await fs.mkdir(this.memoriesPath, { recursive: true });
      console.log('[EnhancedAIEnvironment] Memories directory created.');
      console.log('[EnhancedAIEnvironment] Creating learnings directory...');
      await fs.mkdir(this.learningsPath, { recursive: true });
      console.log('[EnhancedAIEnvironment] Learnings directory created.');
      console.log('[EnhancedAIEnvironment] Creating artifacts directory...');
      await fs.mkdir(this.artifactsPath, { recursive: true });
      console.log('[EnhancedAIEnvironment] Artifacts directory created.');
      console.log('[EnhancedAIEnvironment] Creating logs directory...');
      await fs.mkdir(this.logsPath, { recursive: true });
      console.log('[EnhancedAIEnvironment] Logs directory created.');
      console.log('[EnhancedAIEnvironment] Loading persistent memory...');
      await this.persistentMemory.load();
      console.log('[EnhancedAIEnvironment] Persistent memory loaded.');
      console.log('[EnhancedAIEnvironment] Restoring environment state...');
      await this.restoreEnvironmentState();
      console.log('[EnhancedAIEnvironment] Environment state restored.');
      this.loreLogger.logLore('Enhanced AI Environment initialized with 48 layers');
      this.isInitialized = true;
      console.log('[EnhancedAIEnvironment] Initialized with 48 layers');
      console.log('[EnhancedAIEnvironment] initialize() END');
    } catch (error) {
      console.error('[EnhancedAIEnvironment] Initialization error:', error);
      throw error;
    }
  }

  async registerModel(modelId, modelConfig) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const modelMetadata = {
      id: modelId,
      config: modelConfig,
      registeredAt: new Date().toISOString(),
      interactions: 0,
      learnings: [],
      memoryPath: path.join(this.memoriesPath, `${modelId}-memory.json`),
      lastInteraction: null,
      active: true
    };
    
    this.modelRegistry.set(modelId, modelMetadata);
    
    // Log the registration
    this.loreLogger.logAgentAction(
      modelId, 
      'registered in enhanced persistent environment', 
      `Capabilities: ${modelConfig.capabilities || 'unknown'}, Provider: ${modelConfig.provider || 'unknown'}`
    );
    
    // Store model metadata in the synchronization engine
    await this.memorySynchronizationEngine.storeArtifact(
      `model_${modelId}_metadata`,
      modelMetadata,
      47 // Store in the highest transcendent layer
    );
    
    // Save registry to persistent storage
    await this.saveEnvironmentState();
    
    console.log(`[EnhancedAIEnvironment] Model ${modelId} registered successfully in 48-layer system`);
    return modelMetadata;
  }

  async storeModelLearning(modelId, learning) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const modelMetadata = this.modelRegistry.get(modelId);
    if (!modelMetadata) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    
    // Add timestamp and model reference to learning
    const learningWithTimestamp = {
      ...learning,
      timestamp: new Date().toISOString(),
      modelId: modelId,
      id: `${modelId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      layerDistribution: this.calculateOptimalLayers(learning) // Determine best layers for this learning
    };
    
    // Store in model's specific learnings
    modelMetadata.learnings.push(learningWithTimestamp);
    
    // Store in shared knowledge base
    this.sharedKnowledge.set(learningWithTimestamp.id, learningWithTimestamp);
    
    // Update interaction count
    modelMetadata.interactions++;
    modelMetadata.lastInteraction = new Date().toISOString();
    
    // Store the learning in the 48-layer memory system
    await this.memorySynchronizationEngine.storeArtifact(
      learningWithTimestamp.id,
      learningWithTimestamp,
      null // Will be distributed automatically
    );
    
    // Log the learning
    this.loreLogger.logAgentAction(
      modelId,
      'acquired new learning stored in 48-layer memory',
      `Topic: ${learning.topic || 'general'}, Impact: ${learning.impact || 'unknown'}`
    );
    
    // Save to persistent storage
    await this.saveEnvironmentState();
    
    console.log(`[EnhancedAIEnvironment] Learning ${learningWithTimestamp.id} stored for model ${modelId} in 48-layer system`);
    return learningWithTimestamp.id;
  }

  calculateOptimalLayers(learning) {
    // Algorithm to determine which layers are most appropriate for this learning
    const layers = [];
    
    // Determine learning type based on content
    const isTechnical = learning.topic && (
      learning.topic.toLowerCase().includes('code') ||
      learning.topic.toLowerCase().includes('algorithm') ||
      learning.topic.toLowerCase().includes('architecture') ||
      learning.topic.toLowerCase().includes('technical')
    );
    
    const isStrategic = learning.topic && (
      learning.topic.toLowerCase().includes('strategy') ||
      learning.topic.toLowerCase().includes('approach') ||
      learning.topic.toLowerCase().includes('methodology')
    );
    
    const isCreative = learning.topic && (
      learning.topic.toLowerCase().includes('creative') ||
      learning.topic.toLowerCase().includes('idea') ||
      learning.topic.toLowerCase().includes('innovation')
    );
    
    // Assign to appropriate layers based on type
    if (isTechnical) {
      // Technical learnings go to working and transcendent layers
      layers.push(20, 21, 22, 23, 40, 41, 42, 43, 44, 45, 46, 47);
    } else if (isStrategic) {
      // Strategic learnings go to associative and transcendent layers
      layers.push(24, 25, 26, 27, 28, 29, 30, 31, 40, 41, 42, 43, 44, 45, 46, 47);
    } else if (isCreative) {
      // Creative learnings go to associative layers primarily
      layers.push(24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39);
    } else {
      // General learnings go to working and associative layers
      layers.push(16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31);
    }
    
    return layers;
  }

  async getModelLearnings(modelId) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const modelMetadata = this.modelRegistry.get(modelId);
    if (!modelMetadata) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    
    return modelMetadata.learnings;
  }

  async getSharedKnowledge(filter = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!filter) {
      return Array.from(this.sharedKnowledge.values());
    }
    
    // Apply filter if provided
    return Array.from(this.sharedKnowledge.values()).filter(item => {
      if (filter.topic && item.topic !== filter.topic) return false;
      if (filter.modelId && item.modelId !== filter.modelId) return false;
      if (filter.dateRange) {
        const itemDate = new Date(item.timestamp);
        if (itemDate < new Date(filter.dateRange.start) || itemDate > new Date(filter.dateRange.end)) {
          return false;
        }
      }
      return true;
    });
  }

  async shareLearningBetweenModels(learningId, sourceModelId, targetModelIds) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const learning = this.sharedKnowledge.get(learningId);
    if (!learning) {
      throw new Error(`Learning ${learningId} not found`);
    }
    
    const results = [];
    
    for (const targetModelId of targetModelIds) {
      const targetModel = this.modelRegistry.get(targetModelId);
      if (!targetModel) {
        results.push({ modelId: targetModelId, success: false, error: 'Model not found' });
        continue;
      }
      
      // Add learning to target model's learnings
      const sharedLearning = {
        ...learning,
        sharedFrom: sourceModelId,
        sharedAt: new Date().toISOString(),
        id: `${targetModelId}-shared-${learningId}`
      };
      
      targetModel.learnings.push(sharedLearning);
      
      // Store in the 48-layer memory system for the target model
      await this.memorySynchronizationEngine.storeArtifact(
        sharedLearning.id,
        sharedLearning,
        null // Will be distributed automatically
      );
      
      // Log the sharing
      this.loreLogger.logAgentAction(
        targetModelId,
        'received shared learning from 48-layer memory',
        `From: ${sourceModelId}, Topic: ${learning.topic || 'general'}`
      );
      
      results.push({ modelId: targetModelId, success: true });
    }
    
    // Save updated state
    await this.saveEnvironmentState();
    
    console.log(`[EnhancedAIEnvironment] Learning ${learningId} shared from ${sourceModelId} to ${targetModelIds.length} models via 48-layer system`);
    return results;
  }

  async saveEnvironmentState() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const state = {
      modelRegistry: Array.from(this.modelRegistry.entries()),
      sharedKnowledge: Array.from(this.sharedKnowledge.entries()),
      timestamp: new Date().toISOString()
    };
    
    await this.persistentMemory.set('enhancedEnvironmentState', state);
    
    // Also save the memory synchronization engine state
    await this.memorySynchronizationEngine.saveState();
    
    console.log('[EnhancedAIEnvironment] State saved to persistent storage with 48-layer sync');
  }

  async restoreEnvironmentState() {
    console.log('[EnhancedAIEnvironment] restoreEnvironmentState() START');
    try {
      const state = await this.persistentMemory.get('enhancedEnvironmentState', null);
      
      if (state) {
        // Restore model registry
        if (state.modelRegistry) {
          this.modelRegistry.clear();
          for (const [id, metadata] of state.modelRegistry) {
            this.modelRegistry.set(id, metadata);
          }
        }
        
        // Restore shared knowledge
        if (state.sharedKnowledge) {
          this.sharedKnowledge.clear();
          for (const [id, knowledge] of state.sharedKnowledge) {
            this.sharedKnowledge.set(id, knowledge);
          }
        }
        
        console.log(`[EnhancedAIEnvironment] Restored state with ${this.modelRegistry.size} models and ${this.sharedKnowledge.size} shared knowledge items`);
      } else {
        console.log('[EnhancedAIEnvironment] No previous state found, starting fresh');
      }
    } catch (error) {
      console.error('[EnhancedAIEnvironment] Error restoring state:', error);
    }
    console.log('[EnhancedAIEnvironment] restoreEnvironmentState() END');
  }

  async getEnvironmentStats() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Get stats from the 48-layer memory synchronization engine
    const syncEngineStats = this.memorySynchronizationEngine.getOverallStats();
    
    return {
      totalModels: this.modelRegistry.size,
      totalLearnings: this.sharedKnowledge.size,
      totalInteractions: Array.from(this.modelRegistry.values())
        .reduce((sum, model) => sum + model.interactions, 0),
      activeModels: Array.from(this.modelRegistry.values())
        .filter(model => model.lastInteraction && 
          (Date.now() - new Date(model.lastInteraction).getTime()) < 24 * 60 * 60 * 1000) // Last 24 hours
        .length,
      lastUpdate: new Date().toISOString(),
      memorySynchronizationStats: syncEngineStats
    };
  }

  async exportModelMemory(modelId) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const modelMetadata = this.modelRegistry.get(modelId);
    if (!modelMetadata) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    
    // Export model's memory from the 48-layer system
    const memoryFromLayers = [];
    
    // Get the model's specific learnings from the 48-layer system
    for (const learning of modelMetadata.learnings) {
      const artifact = await this.memorySynchronizationEngine.retrieveArtifact(learning.id);
      if (artifact) {
        memoryFromLayers.push(artifact);
      }
    }
    
    // Export model's memory to a structured format
    const memoryExport = {
      modelId,
      exportedAt: new Date().toISOString(),
      interactions: modelMetadata.interactions,
      learnings: modelMetadata.learnings,
      memoryFrom48Layers: memoryFromLayers,
      sharedKnowledge: Array.from(this.sharedKnowledge.values())
        .filter(k => k.modelId === modelId),
      metadata: modelMetadata
    };
    
    const exportPath = path.join(this.modelsPath, `${modelId}-enhanced-export.json`);
    await fs.writeFile(exportPath, JSON.stringify(memoryExport, null, 2));
    
    console.log(`[EnhancedAIEnvironment] Enhanced memory exported for model ${modelId} to ${exportPath}`);
    return exportPath;
  }

  async startSynchronization() {
    console.log('[EnhancedAIEnvironment] startSynchronization() START');
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    await this.memorySynchronizationEngine.startSynchronization();
    console.log('[EnhancedAIEnvironment] 48-layer memory synchronization started');
    console.log('[EnhancedAIEnvironment] startSynchronization() END');
  }

  async stopSynchronization() {
    if (this.memorySynchronizationEngine) {
      await this.memorySynchronizationEngine.stopSynchronization();
      console.log('[EnhancedAIEnvironment] 48-layer memory synchronization stopped');
    }
  }

  async triggerManualSynchronization() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    await this.memorySynchronizationEngine.synchronizeLayers();
    console.log('[EnhancedAIEnvironment] Manual 48-layer synchronization triggered');
  }
}

// Singleton instance
let enhancedAIEnvironment = null;

async function getEnhancedAIEnvironment(options = {}) {
  if (!enhancedAIEnvironment) {
    try {
      enhancedAIEnvironment = new EnhancedAIEnvironment(options);
      await enhancedAIEnvironment.initialize();
    } catch (error) {
      console.error('[EnhancedAIEnvironment] Startup error:', error);
      throw error;
    }
  }
  return enhancedAIEnvironment;
}

export { EnhancedAIEnvironment, getEnhancedAIEnvironment };
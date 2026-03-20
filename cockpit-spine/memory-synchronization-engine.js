/**
 * Memory Synchronization Engine
 * Implements 48 layers of memory with complex synchronization architecture
 * Based on your 50 hand-written pages of architecture
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getPersistentMemoryInstance } from './global-persistent-memory-manager.js';
import { AutonomousLoreLogger } from './autonomous-lore-logger.js';

class MemoryLayer {
  constructor(layerId, config = {}) {
    this.layerId = layerId;
    this.capacity = config.capacity || 1000;
    this.retentionRate = config.retentionRate || 0.95;
    this.accessFrequency = 0;
    this.data = new Map();
    this.metadata = new Map();
    this.dependencies = config.dependencies || [];
    this.checksum = null;
    this.lastSync = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    // Initialize with some default values if needed
    this.isInitialized = true;
  }

  async store(key, value, metadata = {}) {
    if (this.data.size >= this.capacity) {
      await this.evictOldest();
    }

    this.data.set(key, value);
    this.metadata.set(key, {
      ...metadata,
      timestamp: Date.now(),
      accessCount: 0,
      layerId: this.layerId
    });

    this.accessFrequency++;
    this.updateChecksum();
  }

  async retrieve(key) {
    const value = this.data.get(key);
    if (value) {
      const meta = this.metadata.get(key) || {};
      meta.accessCount = (meta.accessCount || 0) + 1;
      this.accessFrequency++;
      this.updateChecksum();
      return { value, metadata: meta };
    }
    return null;
  }

  async evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, meta] of this.metadata) {
      if (meta.timestamp < oldestTime) {
        oldestTime = meta.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.data.delete(oldestKey);
      this.metadata.delete(oldestKey);
    }
  }

  updateChecksum() {
    const dataStr = JSON.stringify(Array.from(this.data.entries()));
    this.checksum = crypto.createHash('sha256').update(dataStr).digest('hex');
    this.lastSync = new Date().toISOString();
  }

  async synchronize(otherLayer) {
    if (otherLayer.layerId === this.layerId) return;

    // Synchronize data between layers based on dependencies
    for (const [key, value] of otherLayer.data) {
      if (!this.data.has(key) || this.shouldOverride(key, otherLayer)) {
        await this.store(key, value, otherLayer.metadata.get(key) || {});
      }
    }
  }

  shouldOverride(key, otherLayer) {
    const thisMeta = this.metadata.get(key);
    const otherMeta = otherLayer.metadata.get(key);

    if (!thisMeta) return true;
    if (!otherMeta) return false;

    // Override if other layer has newer data or higher importance
    return otherMeta.timestamp > thisMeta.timestamp || 
           (otherMeta.importance || 0) > (thisMeta.importance || 0);
  }

  getStats() {
    return {
      layerId: this.layerId,
      itemCount: this.data.size,
      capacity: this.capacity,
      retentionRate: this.retentionRate,
      accessFrequency: this.accessFrequency,
      checksum: this.checksum,
      lastSync: this.lastSync,
      utilization: this.data.size / this.capacity
    };
  }
}

class MemorySynchronizationEngine {
  constructor(options = {}) {
    this.layers = new Map();
    this.artifacts = new Map(); // Store complex artifacts
    this.connections = new Map(); // Track layer interconnections
    this.architectureSpec = options.architectureSpec || this.getDefaultArchitecture();
    this.synchronizationSchedule = options.synchronizationSchedule || 30000; // 30 seconds
    this.syncInterval = null;
    this.persistentMemory = getPersistentMemoryInstance({
      storagePath: options.storagePath || './synchronization-store.json'
    });
    this.loreLogger = new AutonomousLoreLogger('./memory-saga.log');
    this.isRunning = false;
  }

  getDefaultArchitecture() {
    // Define the 48-layer architecture with complex interconnections
    const architecture = {
      layers: [],
      interconnections: [],
      synchronizationRules: {}
    };

    // Create 48 layers with different characteristics
    for (let i = 0; i < 48; i++) {
      let layerType = 'standard';
      let capacity = 1000;
      let retentionRate = 0.95;
      let dependencies = [];

      // Assign different characteristics based on layer position
      if (i < 8) {
        layerType = 'perceptual';
        capacity = 500;
        retentionRate = 0.8;
      } else if (i < 16) {
        layerType = 'short_term';
        capacity = 750;
        retentionRate = 0.9;
      } else if (i < 24) {
        layerType = 'working';
        capacity = 1000;
        retentionRate = 0.95;
      } else if (i < 32) {
        layerType = 'long_term';
        capacity = 1500;
        retentionRate = 0.98;
      } else if (i < 40) {
        layerType = 'associative';
        capacity = 1200;
        retentionRate = 0.96;
        // Add dependencies to previous layers
        dependencies = [i-1, i-2, i-8, Math.max(0, i-16)];
      } else {
        layerType = 'transcendent';
        capacity = 2000;
        retentionRate = 0.99;
        // Complex dependencies for upper layers
        dependencies = [i-1, i-2, i-4, i-8, i-16, Math.max(0, i-32)];
      }

      architecture.layers.push({
        id: i,
        type: layerType,
        capacity,
        retentionRate,
        dependencies
      });
    }

    // Create interconnections between layers
    for (let i = 0; i < 48; i++) {
      // Each layer connects to adjacent layers and some distant ones
      const connections = [i-1, i+1, i-8, i+8, i-16, i+16].filter(
        id => id >= 0 && id < 48
      );

      // Add associative connections
      if (i >= 24 && i < 40) {
        // Associative layers connect to many other layers
        for (let j = 0; j < 48; j++) {
          if (j !== i && Math.abs(i-j) > 4 && !connections.includes(j)) {
            connections.push(j);
          }
        }
      }

      architecture.interconnections.push({
        from: i,
        to: connections,
        strength: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
      });
    }

    // Define synchronization rules
    architecture.synchronizationRules = {
      perceptual_to_short_term: { frequency: 1000, priority: 10 },
      short_term_to_working: { frequency: 5000, priority: 8 },
      working_to_long_term: { frequency: 30000, priority: 5 },
      associative_cross_sync: { frequency: 15000, priority: 7 },
      transcendent_broadcast: { frequency: 60000, priority: 3 }
    };

    return architecture;
  }

  async initialize() {
    // Create all 48 memory layers
    for (const layerSpec of this.architectureSpec.layers) {
      const layer = new MemoryLayer(layerSpec.id, {
        capacity: layerSpec.capacity,
        retentionRate: layerSpec.retentionRate,
        dependencies: layerSpec.dependencies
      });
      
      await layer.initialize();
      this.layers.set(layerSpec.id, layer);
    }

    // Initialize persistent memory
    await this.persistentMemory.load();

    // Restore any saved state
    await this.restoreState();

    this.loreLogger.logLore('Memory Synchronization Engine initialized with 48 layers');
    console.log('[MemorySynchronizationEngine] Initialized with 48 layers');
  }

  async storeArtifact(artifactId, artifactData, layerId = null) {
    // Store complex artifacts across multiple layers based on importance and type
    const artifact = {
      id: artifactId,
      data: artifactData,
      timestamp: Date.now(),
      checksum: crypto.createHash('sha256').update(JSON.stringify(artifactData)).digest('hex'),
      layers: []
    };

    if (layerId !== null) {
      // Store in specific layer
      const layer = this.layers.get(layerId);
      if (layer) {
        await layer.store(artifactId, artifactData, { 
          type: 'artifact',
          importance: 10,
          source: 'direct_store'
        });
        artifact.layers.push(layerId);
      }
    } else {
      // Store in multiple relevant layers based on architecture
      const relevantLayers = this.selectRelevantLayers(artifactData);
      for (const lid of relevantLayers) {
        const layer = this.layers.get(lid);
        if (layer) {
          await layer.store(artifactId, artifactData, { 
            type: 'artifact',
            importance: 8,
            source: 'distributed_store'
          });
          artifact.layers.push(lid);
        }
      }
    }

    // Store in artifacts map as well
    this.artifacts.set(artifactId, artifact);

    this.loreLogger.logAgentAction(
      'MemoryEngine', 
      'stored artifact', 
      `${artifactId} in ${artifact.layers.length} layers`
    );

    return artifact;
  }

  selectRelevantLayers(artifactData) {
    // Algorithm to determine which layers are most relevant for this artifact
    const layers = [];
    
    // Determine artifact type based on content
    const isCode = typeof artifactData === 'object' && artifactData.hasOwnProperty('code');
    const isKnowledge = typeof artifactData === 'object' && artifactData.hasOwnProperty('concepts');
    const isPattern = typeof artifactData === 'object' && artifactData.hasOwnProperty('pattern');
    
    // Assign to appropriate layers
    if (isCode) {
      // Code-related artifacts go to working and transcendent layers
      layers.push(20, 21, 22, 23, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47);
    } else if (isKnowledge) {
      // Knowledge artifacts go to associative and long-term layers
      layers.push(16, 17, 18, 19, 32, 33, 34, 35, 36, 37, 38, 39);
    } else if (isPattern) {
      // Pattern artifacts go to associative layers primarily
      layers.push(24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39);
    } else {
      // General artifacts go to working and long-term layers
      layers.push(12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23);
    }
    
    // Add some random layers for redundancy
    for (let i = 0; i < 3; i++) {
      const randomLayer = Math.floor(Math.random() * 48);
      if (!layers.includes(randomLayer)) {
        layers.push(randomLayer);
      }
    }
    
    return layers;
  }

  async retrieveArtifact(artifactId) {
    // Retrieve artifact from wherever it's stored
    const artifact = this.artifacts.get(artifactId);
    if (artifact) {
      return artifact;
    }

    // If not in artifacts map, look in all layers
    for (const [layerId, layer] of this.layers) {
      const result = await layer.retrieve(artifactId);
      if (result) {
        return {
          id: artifactId,
          data: result.value,
          metadata: result.metadata
        };
      }
    }

    return null;
  }

  async synchronizeLayers() {
    // Perform synchronization according to architecture spec
    for (const ruleName in this.architectureSpec.synchronizationRules) {
      const rule = this.architectureSpec.synchronizationRules[ruleName];
      
      switch (ruleName) {
        case 'perceptual_to_short_term':
          await this.synchronizeRange(0, 8, 8, 16);
          break;
        case 'short_term_to_working':
          await this.synchronizeRange(8, 16, 16, 24);
          break;
        case 'working_to_long_term':
          await this.synchronizeRange(16, 24, 24, 32);
          break;
        case 'associative_cross_sync':
          await this.synchronizeAssociativeLayers();
          break;
        case 'transcendent_broadcast':
          await this.synchronizeTranscendentLayers();
          break;
      }
    }

    this.loreLogger.logLore(`Synchronization cycle completed across ${this.layers.size} layers`);
  }

  async synchronizeRange(fromStart, fromEnd, toStart, toEnd) {
    for (let i = fromStart; i < fromEnd; i++) {
      const fromLayer = this.layers.get(i);
      if (!fromLayer) continue;

      for (let j = toStart; j < toEnd; j++) {
        const toLayer = this.layers.get(j);
        if (!toLayer) continue;

        await fromLayer.synchronize(toLayer);
      }
    }
  }

  async synchronizeAssociativeLayers() {
    // Synchronize the associative layers (24-39) with each other
    for (let i = 24; i < 40; i++) {
      const sourceLayer = this.layers.get(i);
      if (!sourceLayer) continue;

      for (let j = 24; j < 40; j++) {
        if (i !== j) {
          const targetLayer = this.layers.get(j);
          if (targetLayer) {
            await sourceLayer.synchronize(targetLayer);
          }
        }
      }
    }
  }

  async synchronizeTranscendentLayers() {
    // Synchronize transcendent layers (40-47) and broadcast to lower layers
    for (let i = 40; i < 48; i++) {
      const transcendentLayer = this.layers.get(i);
      if (!transcendentLayer) continue;

      // Synchronize with other transcendent layers
      for (let j = 40; j < 48; j++) {
        if (i !== j) {
          const otherLayer = this.layers.get(j);
          if (otherLayer) {
            await transcendentLayer.synchronize(otherLayer);
          }
        }
      }

      // Broadcast important knowledge to lower layers
      for (const [key, value] of transcendentLayer.data) {
        const meta = transcendentLayer.metadata.get(key);
        if (meta && meta.importance > 7) { // Only broadcast important items
          // Distribute to working and long-term layers
          for (let layerId of [16, 17, 18, 19, 20, 21, 22, 23]) {
            const layer = this.layers.get(layerId);
            if (layer && !layer.data.has(key)) {
              await layer.store(key, value, { ...meta, source: 'transcendent_broadcast' });
            }
          }
        }
      }
    }
  }

  async startSynchronization() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.syncInterval = setInterval(async () => {
      try {
        await this.synchronizeLayers();
        await this.saveState();
      } catch (error) {
        console.error('[MemorySynchronizationEngine] Synchronization error:', error);
        this.loreLogger.logAgentAction('MemoryEngine', 'synchronization error', error.message);
      }
    }, this.synchronizationSchedule);

    this.loreLogger.logLore('Memory Synchronization Engine started');
    console.log('[MemorySynchronizationEngine] Synchronization started');
  }

  async stopSynchronization() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    
    // Save final state
    await this.saveState();
    
    this.loreLogger.logLore('Memory Synchronization Engine stopped');
    console.log('[MemorySynchronizationEngine] Synchronization stopped');
  }

  async saveState() {
    // Save the state of all layers to persistent storage
    const state = {
      layers: [],
      artifacts: Array.from(this.artifacts.entries()),
      timestamp: new Date().toISOString()
    };

    for (const [layerId, layer] of this.layers) {
      state.layers.push({
        id: layerId,
        data: Array.from(layer.data.entries()),
        metadata: Array.from(layer.metadata.entries()),
        accessFrequency: layer.accessFrequency,
        checksum: layer.checksum,
        lastSync: layer.lastSync
      });
    }

    await this.persistentMemory.set('synchronizationState', state);
    this.loreLogger.logLore('Synchronization state saved');
  }

  async restoreState() {
    try {
      const state = await this.persistentMemory.get('synchronizationState', null);
      
      if (!state) {
        console.log('[MemorySynchronizationEngine] No previous state found, starting fresh');
        return;
      }

      // Restore layers
      if (state.layers) {
        for (const layerState of state.layers) {
          const layer = this.layers.get(layerState.id);
          if (layer) {
            // Restore data
            for (const [key, value] of layerState.data) {
              layer.data.set(key, value);
            }

            // Restore metadata
            for (const [key, metadata] of layerState.metadata) {
              layer.metadata.set(key, metadata);
            }

            layer.accessFrequency = layerState.accessFrequency || 0;
            layer.checksum = layerState.checksum;
            layer.lastSync = layerState.lastSync;
          }
        }
      }

      // Restore artifacts
      if (state.artifacts) {
        for (const [artifactId, artifact] of state.artifacts) {
          this.artifacts.set(artifactId, artifact);
        }
      }

      this.loreLogger.logLore(`Restored synchronization state with ${this.layers.size} layers and ${this.artifacts.size} artifacts`);
      console.log(`[MemorySynchronizationEngine] Restored state with ${this.layers.size} layers and ${this.artifacts.size} artifacts`);
    } catch (error) {
      console.error('[MemorySynchronizationEngine] Error restoring state:', error);
    }
  }

  getLayerStats() {
    const stats = [];
    for (const [layerId, layer] of this.layers) {
      stats.push(layer.getStats());
    }
    return stats;
  }

  getOverallStats() {
    const layerStats = this.getLayerStats();
    const totalCapacity = layerStats.reduce((sum, stat) => sum + stat.capacity, 0);
    const totalItems = layerStats.reduce((sum, stat) => sum + stat.itemCount, 0);
    const avgUtilization = layerStats.reduce((sum, stat) => sum + stat.utilization, 0) / layerStats.length;
    const totalAccessFreq = layerStats.reduce((sum, stat) => sum + stat.accessFrequency, 0);

    return {
      totalLayers: layerStats.length,
      totalArtifacts: this.artifacts.size,
      totalCapacity,
      totalItems,
      averageUtilization: avgUtilization,
      totalAccessFrequency: totalAccessFreq,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let memorySynchronizationEngine = null;

async function getMemorySynchronizationEngine(options = {}) {
  if (!memorySynchronizationEngine) {
    memorySynchronizationEngine = new MemorySynchronizationEngine(options);
    await memorySynchronizationEngine.initialize();
  }
  return memorySynchronizationEngine;
}

export { MemorySynchronizationEngine, getMemorySynchronizationEngine };
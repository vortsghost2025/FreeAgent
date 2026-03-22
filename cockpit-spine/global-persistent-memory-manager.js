/**
 * Global Persistent Memory Manager
 * Ensures only one instance of PersistentMemory per file path to prevent duplicate loading messages
 */

import { PersistentMemory } from './persistent-memory.js';

// Global cache to store persistent memory instances
const memoryInstances = new Map();

/**
 * Gets or creates a PersistentMemory instance for the given storage path
 * Ensures that only one instance exists per storage path, preventing duplicate loading messages
 */
export function getPersistentMemoryInstance(options = {}) {
  const storagePath = options.storagePath || './memory-store.json';
  
  // Check if we already have an instance for this path
  if (memoryInstances.has(storagePath)) {
    return memoryInstances.get(storagePath);
  }
  
  // Create a new instance and store it in the cache
  const instance = new PersistentMemory(options);
  memoryInstances.set(storagePath, instance);
  
  return instance;
}

/**
 * Clears all cached persistent memory instances
 * Use only for testing purposes
 */
export function clearPersistentMemoryCache() {
  memoryInstances.clear();
}

/**
 * Gets all currently cached persistent memory instances
 */
export function getAllPersistentMemoryInstances() {
  return new Map(memoryInstances);
}
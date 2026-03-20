/**
 * Persistent Memory System for Autonomous Elasticsearch Evolution Agent
 * Maintains state between agent restarts to prevent data loss
 */

import fs from 'fs/promises';
import path from 'path';

export class PersistentMemory {
  constructor(options = {}) {
    this.storagePath = options.storagePath || './memory-store.json';
    this.data = {};
    this.isLoaded = false;
    // Add a loading guard to prevent duplicate messages
    this.loading = false;
    // Add retry configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    // Add backup path
    this.backupPath = `${this.storagePath}.backup`;
  }

  /**
   * Load memory from persistent storage with retry logic
   */
  async load() {
    // If already loaded, return early
    console.log('[PersistentMemory] load() START');
    if (this.isLoaded) {
      console.log('[PersistentMemory] load() END (already loaded)');
      return;
    }
    // If currently loading, return to prevent concurrent loads
    if (this.loading) {
      console.log('[PersistentMemory] load() END (already loading)');
      return;
    }

    // Set loading flag to prevent concurrent loads
    this.loading = true;
    let retries = 0;
    let lastError;

    // Ensure loading flag is always cleared even on early returns
    try {
      while (retries < this.maxRetries) {
        try {
          const data = await fs.readFile(this.storagePath, 'utf8');
          this.data = JSON.parse(data);
          this.isLoaded = true;
          console.log(`[PersistentMemory] Loaded from ${this.storagePath}`);
          console.log('[PersistentMemory] load() END (success)');
          return; // Exit successfully
        } catch (error) {
          lastError = error;
          if (error && error.code === 'ENOENT') {
            console.log(`[PersistentMemory] No existing memory file found at ${this.storagePath}, starting fresh`);
            // Try to recover from backup if it exists
            try {
              await fs.access(this.backupPath);
              console.log(`[PersistentMemory] Found backup file, attempting recovery...`);
              const backupData = await fs.readFile(this.backupPath, 'utf8');
              this.data = JSON.parse(backupData);
              this.isLoaded = true;
              console.log('[PersistentMemory] load() END (backup recovery success)');
              await this.save(); // Restore from backup to main file
              console.log(`[PersistentMemory] Recovered from backup and saved to main file`);
              return;
            } catch (backupError) {
              console.log(`[PersistentMemory] No backup file found or recovery failed, starting fresh`);
              this.data = {};
              this.isLoaded = true;
              console.log('[PersistentMemory] load() END (backup recovery failed)');
              await this.save(); // Create the file if it doesn't exist
              return;
            }
          } else if (error instanceof SyntaxError) {
            console.error(`[PersistentMemory] Corrupted JSON in ${this.storagePath}, attempting recovery...`);
            // Try to recover from backup
            try {
              await fs.access(this.backupPath);
              const backupData = await fs.readFile(this.backupPath, 'utf8');
              this.data = JSON.parse(backupData);
              this.isLoaded = true;
              console.log(`[PersistentMemory] Recovered from backup after corruption`);
              await this.save(); // Write recovered data back to main file
              return;
            } catch (backupError) {
              console.error(`[PersistentMemory] Recovery from backup also failed:`, backupError);
              this.data = {};
              this.isLoaded = true;
              await this.save(); // Create a fresh file
              return;
            }
          }

          // Increment retries and wait before next attempt with exponential backoff
          retries++;
          if (retries < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, retries - 1);
            console.log(`[PersistentMemory] Retry ${retries}/${this.maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // If we get here, all retries failed
      console.error(`[PersistentMemory] Failed to load after ${this.maxRetries} attempts:`, lastError);
      this.data = {};
      this.isLoaded = true;
      await this.save(); // Create a fresh file
      console.log('[PersistentMemory] load() END (failed after retries, created fresh file)');
    } finally {
      this.loading = false;
    }
  }

  get(key, defaultValue = undefined) {
    return this.data.hasOwnProperty(key) ? this.data[key] : defaultValue;
  }

  async set(key, value) {
    this.data[key] = value;
    await this.save();
  }

  async retrieveAgentState() {
    return this.get('agentState', null);
  }

  async storeAgentState(state) {
    await this.set('agentState', state);
  }

  async addToOptimizationHistory(entry) {
    const history = this.get('optimizationHistory', []);
    history.push(entry);
    await this.set('optimizationHistory', history);
  }

  async logError(error) {
    const errors = this.get('errorLog', []);
    errors.push({ message: error.message, stack: error.stack, timestamp: Date.now() });
    // Keep last 100 errors only
    if (errors.length > 100) errors.splice(0, errors.length - 100);
    await this.set('errorLog', errors);
  }

  /**
   * Save memory to persistent storage with atomic operations
   */
  async save() {
    if (!this.isLoaded) {
      console.warn('[PersistentMemory] Attempting to save before loading');
      return;
    }
    
    try {
      // Create a temporary file first
      const tempPath = `${this.storagePath}.tmp`;
      const data = JSON.stringify(this.data, null, 2);
      
      // Write to temporary file
      await fs.writeFile(tempPath, data);
      
      // Replace the original file with the temporary one
      await fs.rename(tempPath, this.storagePath);
      
      // Create backup of the current state
      await fs.copyFile(this.storagePath, this.backupPath);
      
      console.log(`[PersistentMemory] Saved to ${this.storagePath}`);
    } catch (error) {
      console.error('[PersistentMemory] Error saving:', error);
      // Try to recover from backup if possible
      try {
        await fs.access(this.backupPath);
        console.log(`[PersistentMemory] Attempting to restore from backup...`);
        await fs.copyFile(this.backupPath, this.storagePath);
        console.log('[PersistentMemory] Restored from backup');
      } catch (restoreError) {
        console.error('[PersistentMemory] Could not restore from backup:', restoreError);
      }
    }
  }
}
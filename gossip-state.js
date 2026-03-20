/**
 * WE4Free Gossip State Synchronization
 * 
 * CRDT-style (Conflict-free Replicated Data Type) shared state management.
 * Enables agents to maintain synchronized state without central coordinator.
 * 
 * Based on:
 * - Last-Write-Wins (LWW) for simple values
 * - Vector clocks for causality tracking
 * - Gossip protocol for propagation
 * 
 * This is Track 4: Distributed Agent Swarm Layer
 */

// STATE ENTRY (with vector clock)
class StateEntry {
  constructor(key, value, agentId, timestamp = Date.now()) {
    this.key = key;
    this.value = value;
    this.agentId = agentId; // Who wrote this
    this.timestamp = timestamp; // When they wrote it
    this.vectorClock = { [agentId]: 1 }; // Causality tracking
  }

  /**
   * Check if this entry is newer than another
   */
  isNewerThan(other) {
    if (!other) return true;
    
    // Last-Write-Wins: Higher timestamp wins
    if (this.timestamp !== other.timestamp) {
      return this.timestamp > other.timestamp;
    }
    
    // Tie-breaker: Lexicographically compare agent IDs
    return this.agentId > other.agentId;
  }

  /**
   * Merge vector clocks
   */
  mergeVectorClock(otherClock) {
    Object.keys(otherClock).forEach(agentId => {
      if (!this.vectorClock[agentId] || otherClock[agentId] > this.vectorClock[agentId]) {
        this.vectorClock[agentId] = otherClock[agentId];
      }
    });
  }

  /**
   * Clone this entry
   */
  clone() {
    const entry = new StateEntry(this.key, this.value, this.agentId, this.timestamp);
    entry.vectorClock = { ...this.vectorClock };
    return entry;
  }
}

// GOSSIP STATE MANAGER
class GossipState {
  constructor(agentId) {
    this.agentId = agentId;
    this.state = new Map(); // key -> StateEntry
    this.subscribers = new Map(); // key -> Set of callbacks
    this.gossipInterval = null;
    this.gossipPeers = new Set(); // Connected peer gossip instances
    this.metrics = {
      reads: 0,
      writes: 0,
      merges: 0,
      conflicts: 0,
      gossipsSent: 0,
      gossipsReceived: 0
    };
    
    console.log(`📊 Gossip State initialized for ${this.agentId}`);
  }

  /**
   * Set a value (local write)
   */
  set(key, value) {
    const timestamp = Date.now();
    const entry = new StateEntry(key, value, this.agentId, timestamp);
    
    // Increment our vector clock
    const oldEntry = this.state.get(key);
    if (oldEntry) {
      entry.mergeVectorClock(oldEntry.vectorClock);
    }
    entry.vectorClock[this.agentId] = (entry.vectorClock[this.agentId] || 0) + 1;
    
    this.state.set(key, entry);
    this.metrics.writes++;
    
    // Notify subscribers
    this._notifySubscribers(key, value);
    
    // Trigger immediate gossip to peers
    this.gossipNow();
    
    return entry;
  }

  /**
   * Get a value
   */
  get(key) {
    this.metrics.reads++;
    const entry = this.state.get(key);
    return entry ? entry.value : undefined;
  }

  /**
   * Get all keys
   */
  keys() {
    return Array.from(this.state.keys());
  }

  /**
   * Get all entries
   */
  entries() {
    return Array.from(this.state.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      agentId: entry.agentId,
      timestamp: entry.timestamp
    }));
  }

  /**
   * Merge incoming state from peer
   */
  merge(peerState) {
    let mergeCount = 0;
    let conflictCount = 0;

    peerState.forEach((peerEntry, key) => {
      const localEntry = this.state.get(key);
      
      if (!localEntry) {
        // New key, accept it
        this.state.set(key, peerEntry.clone());
        this._notifySubscribers(key, peerEntry.value);
        mergeCount++;
      } else if (peerEntry.isNewerThan(localEntry)) {
        // Peer has newer value, accept it
        const merged = peerEntry.clone();
        merged.mergeVectorClock(localEntry.vectorClock);
        this.state.set(key, merged);
        this._notifySubscribers(key, peerEntry.value);
        mergeCount++;
        conflictCount++;
      } else {
        // Local value is newer or equal, keep it (but merge vector clocks)
        localEntry.mergeVectorClock(peerEntry.vectorClock);
      }
    });

    this.metrics.merges++;
    this.metrics.conflicts += conflictCount;

    if (mergeCount > 0) {
      console.log(`🔄 Merged ${mergeCount} entries from peer (${conflictCount} conflicts resolved)`);
    }

    return { merged: mergeCount, conflicts: conflictCount };
  }

  /**
   * Connect to peer gossip instance
   */
  connectToPeer(peerGossipState) {
    this.gossipPeers.add(peerGossipState);
    console.log(`🔗 Connected to peer gossip state`);
  }

  /**
   * Disconnect from peer
   */
  disconnectFromPeer(peerGossipState) {
    this.gossipPeers.delete(peerGossipState);
    console.log(`🔌 Disconnected from peer gossip state`);
  }

  /**
   * Start periodic gossip
   */
  startGossip(intervalMs = 1000) {
    if (this.gossipInterval) {
      console.warn('Gossip already running');
      return;
    }

    this.gossipInterval = setInterval(() => {
      this.gossipNow();
    }, intervalMs);

    console.log(`🌐 Gossip started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop periodic gossip
   */
  stopGossip() {
    if (this.gossipInterval) {
      clearInterval(this.gossipInterval);
      this.gossipInterval = null;
      console.log('🛑 Gossip stopped');
    }
  }

  /**
   * Gossip to all peers immediately
   */
  gossipNow() {
    if (this.gossipPeers.size === 0) {
      return;
    }

    // Send our entire state to each peer
    this.gossipPeers.forEach(peer => {
      try {
        peer.merge(this.state);
        this.metrics.gossipsSent++;
      } catch (error) {
        console.error('Error gossiping to peer:', error);
      }
    });
  }

  /**
   * Subscribe to changes for a key
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Notify subscribers of change
   */
  _notifySubscribers(key, value) {
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(callback => {
        try {
          callback(value, key);
        } catch (error) {
          console.error(`Error in subscriber callback (${key}):`, error);
        }
      });
    }
  }

  /**
   * Export state for serialization
   */
  export() {
    const exported = {};
    this.state.forEach((entry, key) => {
      exported[key] = {
        value: entry.value,
        agentId: entry.agentId,
        timestamp: entry.timestamp,
        vectorClock: entry.vectorClock
      };
    });
    return exported;
  }

  /**
   * Import state from serialization
   */
  import(exported) {
    let importCount = 0;
    
    Object.keys(exported).forEach(key => {
      const data = exported[key];
      const entry = new StateEntry(key, data.value, data.agentId, data.timestamp);
      entry.vectorClock = data.vectorClock;
      
      const localEntry = this.state.get(key);
      if (!localEntry || entry.isNewerThan(localEntry)) {
        this.state.set(key, entry);
        importCount++;
      }
    });

    console.log(`📥 Imported ${importCount} entries`);
    return importCount;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      agentId: this.agentId,
      stateSize: this.state.size,
      connectedPeers: this.gossipPeers.size,
      ...this.metrics
    };
  }

  /**
   * Clear all state
   */
  clear() {
    this.state.clear();
    this.subscribers.clear();
    console.log('🗑️ Gossip state cleared');
  }

  /**
   * Persist gossip state to IndexedDB - Track 5
   */
  async persistToIndexedDB(dbName = 'we4free-swarm') {
    try {
      const db = await this._openDB(dbName);
      const transaction = db.transaction(['gossip-state'], 'readwrite');
      const store = transaction.objectStore('gossip-state');

      const stateData = {
        id: 'gossip-state',
        agentId: this.agentId,
        state: Array.from(this.state.entries()).map(([key, entry]) => [
          key,
          {
            value: entry.value,
            agentId: entry.agentId,
            timestamp: entry.timestamp,
            vectorClock: entry.vectorClock
          }
        ]),
        timestamp: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = store.put(stateData);
        request.onsuccess = () => {
          console.log('✅ Gossip state persisted to IndexedDB');
          resolve(true);
        };
        request.onerror = () => {
          console.error('❌ Failed to persist gossip state:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Failed to open IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load gossip state from IndexedDB - Track 5
   */
  async loadFromIndexedDB(dbName = 'we4free-swarm') {
    try {
      const db = await this._openDB(dbName);
      const transaction = db.transaction(['gossip-state'], 'readonly');
      const store = transaction.objectStore('gossip-state');

      return new Promise((resolve, reject) => {
        const request = store.get('gossip-state');
        
        request.onsuccess = () => {
          const stateData = request.result;
          if (stateData) {
            // Restore state
            this.agentId = stateData.agentId;
            this.state.clear();
            
            stateData.state.forEach(([key, entryData]) => {
              const entry = new StateEntry(
                key,
                entryData.value,
                entryData.agentId,
                entryData.timestamp
              );
              entry.vectorClock = entryData.vectorClock;
              this.state.set(key, entry);
            });
            
            console.log(`✅ Gossip state loaded from IndexedDB (${this.state.size} entries)`);
            resolve(true);
          } else {
            console.log('⚠️ No saved gossip state found');
            resolve(false);
          }
        };
        
        request.onerror = () => {
          console.error('❌ Failed to load gossip state:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Failed to open IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB connection - Track 5 helper
   */
  async _openDB(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create gossip-state object store if it doesn't exist
        if (!db.objectStoreNames.contains('gossip-state')) {
          db.createObjectStore('gossip-state', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Shutdown
   */
  shutdown() {
    this.stopGossip();
    this.gossipPeers.clear();
    this.clear();
    console.log('🛑 Gossip state shutdown');
  }
}

// DISTRIBUTED COUNTER (CRDT example)
class GCounter {
  constructor(agentId) {
    this.agentId = agentId;
    this.counts = { [agentId]: 0 }; // agentId -> count
  }

  /**
   * Increment local counter
   */
  increment(amount = 1) {
    this.counts[this.agentId] = (this.counts[this.agentId] || 0) + amount;
  }

  /**
   * Get total count (sum of all agents)
   */
  value() {
    return Object.values(this.counts).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Merge with another GCounter
   */
  merge(other) {
    Object.keys(other.counts).forEach(agentId => {
      if (!this.counts[agentId] || other.counts[agentId] > this.counts[agentId]) {
        this.counts[agentId] = other.counts[agentId];
      }
    });
  }

  /**
   * Clone
   */
  clone() {
    const counter = new GCounter(this.agentId);
    counter.counts = { ...this.counts };
    return counter;
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StateEntry,
    GossipState,
    GCounter
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.StateEntry = StateEntry;
  window.GossipState = GossipState;
  window.GCounter = GCounter;
}

console.log('✅ Gossip State Synchronization loaded');

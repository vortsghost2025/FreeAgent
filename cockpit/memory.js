// Vector Memory Store for Cloud Shell Cockpit
// Provides semantic memory storage and retrieval using embeddings

const path = require('path');
const fs = require('fs');

// Simple in-memory implementation with optional SQLite fallback
class VectorMemory {
  constructor(options = {}) {
    this.storePath = options.storePath || './data/memory.db';
    this.embeddingsUrl = options.embeddingsUrl || 'http://localhost:3847';
    this.collection = options.collection || 'default';
    this.memories = new Map();
    this.initialized = false;
    this.db = null;
  }

  async initialize() {
    if (this.initialized) return;

    console.log('[VectorMemory] Initializing...');

    // Try to load better-sqlite3 for persistent storage
    try {
      const Database = require('better-sqlite3');
      const dbDir = path.dirname(this.storePath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.db = new Database(this.storePath);
      
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          embedding TEXT NOT NULL,
          collection TEXT NOT NULL DEFAULT 'default',
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          INDEX idx_collection (collection),
          INDEX idx_created (created_at)
        );
      `);
      
      console.log('[VectorMemory] SQLite storage initialized');
    } catch (e) {
      console.log('[VectorMemory] Running in-memory only mode');
      this.db = null;
    }

    // Load existing memories into memory
    if (this.db) {
      try {
        const rows = this.db.prepare('SELECT * FROM memories').all();
        for (const row of rows) {
          this.memories.set(row.id, {
            id: row.id,
            content: row.content,
            embedding: JSON.parse(row.embedding),
            collection: row.collection,
            metadata: JSON.parse(row.metadata),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          });
        }
        console.log(`[VectorMemory] Loaded ${this.memories.size} memories`);
      } catch (e) {
        console.error('[VectorMemory] Failed to load memories:', e.message);
      }
    }

    this.initialized = true;
    console.log('[VectorMemory] Initialization complete');
  }

  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async embed(text) {
    // Try local embeddings endpoint first
    try {
      const response = await fetch(`${this.embeddingsUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model: 'nomic-embed-text' }),
        signal: AbortSignal.timeout(30000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return { embedding: data.embedding || data.vector || [], provider: 'local' };
      }
    } catch (e) {
      console.log('[VectorMemory] Local embeddings failed, trying Ollama');
    }

    // Try Ollama
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, model: 'nomic-embed-text' })
      });
      
      if (response.ok) {
        const data = await response.json();
        return { embedding: data.embedding, provider: 'ollama' };
      }
    } catch (e) {
      console.log('[VectorMemory] Ollama embeddings failed');
    }

    // Generate simple hash-based embedding as fallback
    return { embedding: this.simpleEmbedding(text), provider: 'fallback' };
  }

  // Simple hash-based embedding for fallback
  simpleEmbedding(text) {
    const dim = 384;
    const embedding = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      embedding[i % dim] += text.charCodeAt(i);
    }
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / (norm || 1));
  }

  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async add(content, options = {}) {
    await this.initialize();

    const id = this.generateId();
    const collection = options.collection || this.collection;
    const now = new Date().toISOString();

    let embedding = [];
    try {
      const result = await this.embed(content);
      embedding = result.embedding;
    } catch (e) {
      console.error('[VectorMemory] Failed to generate embedding:', e.message);
    }

    const entry = {
      id,
      content,
      embedding,
      collection,
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    // Store in memory
    this.memories.set(id, entry);

    // Store in database
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT INTO memories (id, content, embedding, collection, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, content, JSON.stringify(embedding), collection, JSON.stringify(options.metadata || {}), now, now);
      } catch (e) {
        console.error('[VectorMemory] Failed to store memory:', e.message);
      }
    }

    console.log(`[VectorMemory] Added memory: ${id} to "${collection}"`);
    return entry;
  }

  async search(query, options = {}) {
    await this.initialize();

    const collection = options.collection || this.collection;
    const limit = options.limit || 5;
    const threshold = options.threshold || 0.0;

    // Generate query embedding
    let queryEmbedding;
    try {
      const result = await this.embed(query);
      queryEmbedding = result.embedding;
    } catch (e) {
      console.error('[VectorMemory] Failed to generate query embedding:', e.message);
      return [];
    }

    const results = [];
    const collectionMemories = Array.from(this.memories.values())
      .filter(m => m.collection === collection)
      .slice(0, 100);

    for (const memory of collectionMemories) {
      if (!memory.embedding || memory.embedding.length !== queryEmbedding.length) continue;
      
      const score = this.cosineSimilarity(queryEmbedding, memory.embedding);
      
      if (score >= threshold) {
        results.push({
          id: memory.id,
          content: memory.content,
          collection: memory.collection,
          metadata: memory.metadata,
          score,
          createdAt: memory.createdAt
        });
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async get(id) {
    await this.initialize();
    return this.memories.get(id) || null;
  }

  async delete(id) {
    await this.initialize();
    this.memories.delete(id);
    
    if (this.db) {
      try {
        this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
      } catch (e) {
        console.error('[VectorMemory] Failed to delete memory:', e.message);
      }
    }
    
    return true;
  }

  async list(options = {}) {
    await this.initialize();
    const collection = options.collection || this.collection;
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    return Array.from(this.memories.values())
      .filter(m => m.collection === collection)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + limit);
  }

  async stats() {
    await this.initialize();
    
    const collections = new Set();
    for (const mem of this.memories.values()) {
      collections.add(mem.collection);
    }

    return {
      total: this.memories.size,
      collections: Array.from(collections)
    };
  }

  async clear(collection) {
    await this.initialize();

    if (collection) {
      for (const [id, mem] of this.memories) {
        if (mem.collection === collection) {
          this.memories.delete(id);
        }
      }
      if (this.db) {
        this.db.prepare('DELETE FROM memories WHERE collection = ?').run(collection);
      }
    } else {
      this.memories.clear();
      if (this.db) {
        this.db.prepare('DELETE FROM memories').run();
      }
    }

    return true;
  }

  async healthCheck() {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
  }
}

module.exports = VectorMemory;

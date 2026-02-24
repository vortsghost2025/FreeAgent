/**
 * PERSISTENT MEMORY DATABASE
 *
 * JSON-file backed persistent memory for ensemble:
 * - Conversations: store chat history per session
 * - Agent State: persistent agent state and preferences
 * - Learned Patterns: successful patterns/code snippets
 * - Task History: audit trail for learning
 *
 * Features:
 * - Zero-config (single JSON file)
 * - Fast queries for pattern retrieval
 * - Easy backup/restore
 * - Semantic search for similar problems
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default database path
const DEFAULT_DB_PATH = path.join(__dirname, '../../ensemble-memory.json');

/**
 * Memory Database Class
 */
export class MemoryDatabase {
  constructor(dbPath = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database and create schema
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️  Database already initialized');
      return;
    }

    console.log(`🔧 Initializing database: ${this.dbPath}`);

    try {
      // Create JSON file adapter
      const adapter = new JSONFile(this.dbPath);
      this.db = new Low(adapter, this._getDefaultData());

      // Read existing data or create default
      await this.db.read();
      this.db.data ||= this._getDefaultData();
      await this.db.write();

      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get default data structure
   */
  _getDefaultData() {
    return {
      version: '1.0',
      conversations: [],
      agentStates: [],
      patterns: [],
      tasks: []
    };
  }

  /**
   * Save a conversation
   */
  async saveConversation(conversationId, data) {
    await this.ensureInitialized();

    const now = new Date().toISOString();
    const existingIndex = this.db.data.conversations.findIndex(c => c.id === conversationId);

    const conversationData = {
      id: conversationId,
      createdAt: data.createdAt || now,
      updatedAt: now,
      summary: data.summary || null,
      context: data.context || {},
      tags: data.tags || []
    };

    if (existingIndex >= 0) {
      this.db.data.conversations[existingIndex] = conversationData;
    } else {
      this.db.data.conversations.push(conversationData);
    }

    await this.db.write();
    return conversationId;
  }

  /**
   * Load a conversation
   */
  async loadConversation(conversationId) {
    await this.ensureInitialized();

    const row = this.db.data.conversations.find(c => c.id === conversationId);
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      summary: row.summary,
      context: row.context,
      tags: row.tags
    };
  }

  /**
   * List conversations
   */
  async listConversations(limit = 50, offset = 0) {
    await this.ensureInitialized();

    const all = [...this.db.data.conversations]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(offset, offset + limit);

    return all.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      summary: row.summary,
      context: row.context,
      tags: row.tags
    }));
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(messageId, conversationId, role, content, metadata = {}) {
    await this.ensureInitialized();

    const now = new Date().toISOString();

    // Messages are stored in conversation context
    const conversation = await this.loadConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    if (!conversation.messages) {
      conversation.messages = [];
    }

    conversation.messages.push({
      id: messageId,
      conversationId,
      role,
      agentId: metadata.agentId || null,
      content,
      metadata,
      timestamp: now
    });

    // Update conversation timestamp
    conversation.updatedAt = now;
    await this.saveConversation(conversationId, conversation);

    return messageId;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId, limit = 100, offset = 0) {
    await this.ensureInitialized();

    const conversation = await this.loadConversation(conversationId);
    if (!conversation || !conversation.messages) {
      return [];
    }

    const all = [...conversation.messages]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(offset, offset + limit);

    return all.map(row => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      agentId: row.agentId,
      content: row.content,
      metadata: row.metadata || {},
      timestamp: row.timestamp
    }));
  }

  /**
   * Save agent state
   */
  async saveAgentState(agentId, state) {
    await this.ensureInitialized();

    const now = new Date().toISOString();

    const stateData = {
      agentId,
      role: state.role || 'unknown',
      preferences: state.preferences || {},
      metrics: state.metrics || {},
      lastUpdated: now
    };

    const existingIndex = this.db.data.agentStates.findIndex(s => s.agentId === agentId);
    if (existingIndex >= 0) {
      this.db.data.agentStates[existingIndex] = stateData;
    } else {
      this.db.data.agentStates.push(stateData);
    }

    await this.db.write();
    return agentId;
  }

  /**
   * Load agent state
   */
  async loadAgentState(agentId) {
    await this.ensureInitialized();

    const row = this.db.data.agentStates.find(s => s.agentId === agentId);
    if (!row) {
      return null;
    }

    return {
      agentId: row.agentId,
      role: row.role,
      preferences: row.preferences,
      metrics: row.metrics,
      lastUpdated: row.lastUpdated
    };
  }

  /**
   * List all agent states
   */
  async listAgentStates() {
    await this.ensureInitialized();

    return this.db.data.agentStates.map(row => ({
      agentId: row.agentId,
      role: row.role,
      preferences: row.preferences,
      metrics: row.metrics,
      lastUpdated: row.lastUpdated
    }));
  }

  /**
   * Store a learned pattern
   */
  async storePattern(pattern) {
    await this.ensureInitialized();

    const now = new Date().toISOString();
    const patternId = pattern.id || uuidv4();

    const existing = this.db.data.patterns.find(p => p.id === patternId);
    const createdAt = existing ? existing.createdAt : now;

    const patternData = {
      id: patternId,
      patternType: pattern.patternType || 'general',
      description: pattern.description || '',
      codeSnippet: pattern.codeSnippet || null,
      contextTags: pattern.contextTags || [],
      successCount: (existing?.successCount || 0) + (pattern.successIncrement || 0),
      failureCount: (existing?.failureCount || 0) + (pattern.failureIncrement || 0),
      lastUsed: pattern.lastUsed || null,
      createdAt,
      updatedAt: now
    };

    const existingIndex = this.db.data.patterns.findIndex(p => p.id === patternId);
    if (existingIndex >= 0) {
      this.db.data.patterns[existingIndex] = patternData;
    } else {
      this.db.data.patterns.push(patternData);
    }

    await this.db.write();
    return patternId;
  }

  /**
   * Query patterns by type
   */
  async queryPatternsByType(patternType, limit = 20) {
    await this.ensureInitialized();

    const all = this.db.data.patterns
      .filter(p => p.patternType === patternType)
      .sort((a, b) => (b.successCount - b.failureCount) - (a.successCount - a.failureCount))
      .slice(0, limit);

    return all.map(row => ({
      id: row.id,
      patternType: row.patternType,
      description: row.description,
      codeSnippet: row.codeSnippet,
      contextTags: row.contextTags,
      successCount: row.successCount,
      failureCount: row.failureCount,
      lastUsed: row.lastUsed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  /**
   * Search patterns by description and tags
   */
  async searchPatterns(query, limit = 20) {
    await this.ensureInitialized();

    const queryLower = query.toLowerCase();

    const all = this.db.data.patterns
      .filter(p =>
        p.description.toLowerCase().includes(queryLower) ||
        p.contextTags.some(tag => tag.toLowerCase().includes(queryLower))
      )
      .sort((a, b) => (b.successCount - b.failureCount) - (a.successCount - a.failureCount))
      .slice(0, limit);

    return all.map(row => ({
      id: row.id,
      patternType: row.patternType,
      description: row.description,
      codeSnippet: row.codeSnippet,
      contextTags: row.contextTags,
      successCount: row.successCount,
      failureCount: row.failureCount,
      lastUsed: row.lastUsed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  /**
   * Get most successful patterns
   */
  async getTopPatterns(limit = 20) {
    await this.ensureInitialized();

    const all = [...this.db.data.patterns]
      .sort((a, b) =>
        (b.successCount - b.failureCount) - (a.successCount - a.failureCount)
      )
      .slice(0, limit);

    return all.map(row => ({
      id: row.id,
      patternType: row.patternType,
      description: row.description,
      codeSnippet: row.codeSnippet,
      contextTags: row.contextTags,
      successCount: row.successCount,
      failureCount: row.failureCount,
      lastUsed: row.lastUsed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  /**
   * Record task in history
   */
  async recordTask(task) {
    await this.ensureInitialized();

    const taskId = task.id || uuidv4();
    const now = new Date().toISOString();

    const taskData = {
      id: taskId,
      taskType: task.taskType || 'unknown',
      inputSummary: task.inputSummary || '',
      resultSummary: task.resultSummary || '',
      success: !!task.success,
      processingTime: task.processingTime || 0,
      agentRoles: task.agentRoles || [],
      conversationId: task.conversationId || null,
      createdAt: now
    };

    this.db.data.tasks.push(taskData);
    await this.db.write();

    return taskId;
  }

  /**
   * Get task history
   */
  async getTaskHistory(limit = 50, offset = 0) {
    await this.ensureInitialized();

    const all = [...this.db.data.tasks]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + limit);

    return all.map(row => ({
      id: row.id,
      taskType: row.taskType,
      inputSummary: row.inputSummary,
      resultSummary: row.resultSummary,
      success: row.success,
      processingTime: row.processingTime,
      agentRoles: row.agentRoles,
      conversationId: row.conversationId,
      createdAt: row.createdAt
    }));
  }

  /**
   * Export database to JSON
   */
  exportToJson() {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      conversations: this.db.data.conversations,
      agentStates: this.db.data.agentStates,
      patterns: this.db.data.patterns,
      tasks: this.db.data.tasks
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import data from JSON
   */
  async importFromJson(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    console.log('📥 Importing data...');

    // Import conversations
    if (data.conversations) {
      for (const conv of data.conversations) {
        const existingIndex = this.db.data.conversations.findIndex(c => c.id === conv.id);
        if (existingIndex >= 0) {
          this.db.data.conversations[existingIndex] = conv;
        } else {
          this.db.data.conversations.push(conv);
        }
      }
      console.log(`   ✓ Imported ${data.conversations.length} conversations`);
    }

    // Import agent states
    if (data.agentStates) {
      for (const state of data.agentStates) {
        const existingIndex = this.db.data.agentStates.findIndex(s => s.agentId === state.agentId);
        if (existingIndex >= 0) {
          this.db.data.agentStates[existingIndex] = state;
        } else {
          this.db.data.agentStates.push(state);
        }
      }
      console.log(`   ✓ Imported ${data.agentStates.length} agent states`);
    }

    // Import patterns
    if (data.patterns) {
      for (const pattern of data.patterns) {
        const existingIndex = this.db.data.patterns.findIndex(p => p.id === pattern.id);
        if (existingIndex >= 0) {
          this.db.data.patterns[existingIndex] = pattern;
        } else {
          this.db.data.patterns.push(pattern);
        }
      }
      console.log(`   ✓ Imported ${data.patterns.length} patterns`);
    }

    await this.db.write();
    console.log('✅ Import complete');
  }

  /**
   * Cleanup old data
   */
  async cleanup(daysToKeep = 90) {
    await this.ensureInitialized();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffIso = cutoffDate.toISOString();

    console.log(`🧹 Cleaning up data older than ${daysToKeep} days...`);

    // Delete old conversations
    const oldConversations = this.db.data.conversations.filter(c => new Date(c.createdAt) < cutoffDate);
    this.db.data.conversations = this.db.data.conversations.filter(c => new Date(c.createdAt) >= cutoffDate);
    console.log(`   ✓ Deleted ${oldConversations.length} old conversations`);

    // Delete old tasks
    const oldTasks = this.db.data.tasks.filter(t => new Date(t.createdAt) < cutoffDate);
    this.db.data.tasks = this.db.data.tasks.filter(t => new Date(t.createdAt) >= cutoffIso);
    console.log(`   ✓ Deleted ${oldTasks.length} old tasks`);

    await this.db.write();
    console.log('✅ Cleanup complete');
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    if (!this.db || !this.db.data) {
      return {
        conversations: 0,
        messages: 0,
        agentStates: 0,
        patterns: 0,
        tasks: 0,
        dbPath: this.dbPath,
        fileSize: 0
      };
    }

    let fileSize = 0;
    try {
      const fsModule = await import('fs');
      fileSize = fsModule.statSync(this.dbPath).size;
    } catch (error) {
      // File doesn't exist yet
    }

    let messages = 0;
    for (const conv of this.db.data.conversations) {
      if (conv.messages) {
        messages += conv.messages.length;
      }
    }

    return {
      conversations: this.db.data.conversations.length,
      messages,
      agentStates: this.db.data.agentStates.length,
      patterns: this.db.data.patterns.length,
      tasks: this.db.data.tasks.length,
      dbPath: this.dbPath,
      fileSize
    };
  }

  /**
   * Close database connection
   */
  close() {
    this.db = null;
    this.isInitialized = false;
    console.log('✅ Database closed');
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    const fs = (await import('fs')).promises;

    const backupDbPath = backupPath || this.dbPath.replace('.json', '-backup.json');

    console.log(`💾 Creating backup: ${backupDbPath}`);

    // Copy database file
    await fs.copyFile(this.dbPath, backupDbPath);

    console.log('✅ Backup complete');
    return backupDbPath;
  }

  /**
   * Ensure database is initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Singleton instance
let memoryDatabaseInstance = null;

/**
 * Get singleton instance
 */
export function getMemoryDatabase(dbPath) {
  if (!memoryDatabaseInstance) {
    memoryDatabaseInstance = new MemoryDatabase(dbPath);
  }
  return memoryDatabaseInstance;
}

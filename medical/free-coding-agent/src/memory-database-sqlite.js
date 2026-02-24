/**
 * Persistent Memory Database - SQLite-backed storage for ensemble
 *
 * Stores:
 * - Conversations and messages
 * - Agent state and preferences
 * - Learned patterns and code snippets
 * - Fixed code patterns for reuse
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';

export class MemoryDatabase {
  constructor(config = {}) {
    this.dbPath = config.path || path.join(process.cwd(), 'ensemble-memory.db');
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize database and create tables
   */
  async initialize() {
    if (this.initialized) {
      console.log('⚠️  Database already initialized');
      return;
    }

    console.log(`💾 Initializing memory database: ${this.dbPath}`);

    try {
      // Create database directory if needed
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Initialize SQLite database
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrent access
      this.db.pragma('journal_mode = WAL');

      // Create tables
      this.createTables();

      // Create indexes for performance
      this.createIndexes();

      this.initialized = true;
      console.log('✅ Memory database initialized');

    } catch (error) {
      console.error(`❌ Failed to initialize database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create all database tables
   */
  createTables() {
    this.db.exec(`
      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        summary TEXT,
        context_json TEXT,
        task_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        agent_id TEXT,
        content TEXT NOT NULL,
        metadata_json TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      -- Agent state table
      CREATE TABLE IF NOT EXISTS agent_state (
        agent_id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        preferences_json TEXT,
        metrics_json TEXT,
        last_used TEXT,
        tasks_completed INTEGER DEFAULT 0,
        tasks_failed INTEGER DEFAULT 0,
        total_requests INTEGER DEFAULT 0
      );

      -- Learned patterns table
      CREATE TABLE IF NOT EXISTS learned_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        description TEXT NOT NULL,
        code_snippet TEXT,
        context_tags TEXT,
        success_count INTEGER DEFAULT 1,
        failure_count INTEGER DEFAULT 0,
        last_used TEXT,
        created_at TEXT NOT NULL
      );

      -- Fixed code patterns table (for error fixer)
      CREATE TABLE IF NOT EXISTS fixed_patterns (
        id TEXT PRIMARY KEY,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        original_code TEXT NOT NULL,
        fixed_code TEXT NOT NULL,
        fix_description TEXT NOT NULL,
        file_path TEXT,
        success_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        last_used TEXT
      );

      -- Task history table
      CREATE TABLE IF NOT EXISTS task_history (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        task_text TEXT NOT NULL,
        agents_used TEXT NOT NULL,
        mode TEXT NOT NULL,
        duration_ms INTEGER,
        results_json TEXT,
        success BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Create indexes for performance
   */
  createIndexes() {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON learned_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_success ON learned_patterns(success_count);
      CREATE INDEX IF NOT EXISTS idx_fixed_errors ON fixed_patterns(error_type);
      CREATE INDEX IF NOT EXISTS idx_tasks_created ON task_history(created_at);
    `);
  }

  // ==================== Conversation Methods ====================

  /**
   * Create a new conversation
   */
  createConversation(summary = '', context = {}) {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO conversations (id, created_at, updated_at, summary, context_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, now, now, summary, JSON.stringify(context));

    return id;
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId) {
    const row = this.db.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `).get(conversationId);

    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      summary: row.summary,
      context: JSON.parse(row.context_json || '{}'),
      taskCount: row.task_count,
      status: row.status
    };
  }

  /**
   * Get all conversations
   */
  getAllConversations(limit = 100, offset = 0) {
    const rows = this.db.prepare(`
      SELECT * FROM conversations
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      summary: row.summary,
      context: JSON.parse(row.context_json || '{}'),
      taskCount: row.task_count,
      status: row.status
    }));
  }

  /**
   * Update conversation
   */
  updateConversation(conversationId, updates) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (updates.summary !== undefined) {
      fields.push('summary = ?');
      values.push(updates.summary);
    }
    if (updates.context !== undefined) {
      fields.push('context_json = ?');
      values.push(JSON.stringify(updates.context));
    }
    if (updates.taskCount !== undefined) {
      fields.push('task_count = ?');
      values.push(updates.taskCount);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    fields.push('updated_at = ?');
    values.push(now);

    values.push(conversationId);

    this.db.prepare(`
      UPDATE conversations SET ${fields.join(', ')} WHERE id = ?
    `).run(...values, conversationId);
  }

  /**
   * Delete conversation
   */
  deleteConversation(conversationId) {
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
  }

  // ==================== Message Methods ====================

  /**
   * Add message to conversation
   */
  addMessage(conversationId, role, content, agentId = null, metadata = {}) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, agent_id, content, metadata_json, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, conversationId, role, agentId, content, JSON.stringify(metadata), timestamp);

    // Update conversation task count
    this.db.prepare(`
      UPDATE conversations
      SET task_count = task_count + 1, updated_at = ?
      WHERE id = ?
    `).run(timestamp, conversationId);

    return id;
  }

  /**
   * Get conversation messages
   */
  getConversationMessages(conversationId) {
    const rows = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `).all(conversationId);

    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      agentId: row.agent_id,
      content: row.content,
      metadata: JSON.parse(row.metadata_json || '{}'),
      timestamp: row.timestamp
    }));
  }

  // ==================== Agent State Methods ====================

  /**
   * Save agent state
   */
  saveAgentState(agentId, role, state) {
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT OR REPLACE INTO agent_state (agent_id, role, last_used)
      VALUES (?, ?, ?)
    `).run(agentId, role, now);
  }

  /**
   * Get agent state
   */
  getAgentState(agentId) {
    const row = this.db.prepare(`
      SELECT * FROM agent_state WHERE agent_id = ?
    `).get(agentId);

    if (!row) return null;

    return {
      agentId: row.agent_id,
      role: row.role,
      preferences: JSON.parse(row.preferences_json || '{}'),
      metrics: JSON.parse(row.metrics_json || '{}'),
      lastUsed: row.last_used,
      tasksCompleted: row.tasks_completed,
      tasksFailed: row.tasks_failed,
      totalRequests: row.total_requests
    };
  }

  /**
   * Update agent metrics
   */
  updateAgentMetrics(agentId, metrics) {
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE agent_state
      SET metrics_json = ?, last_used = ?,
          tasks_completed = tasks_completed + ?
      WHERE agent_id = ?
    `).run(
      JSON.stringify(metrics),
      now,
      metrics.tasksCompleted || 0,
      agentId
    );
  }

  /**
   * Record agent task completion
   */
  recordAgentTask(agentId, success) {
    const now = new Date().toISOString();

    if (success) {
      this.db.prepare(`
        UPDATE agent_state
        SET tasks_completed = tasks_completed + 1, last_used = ?
        WHERE agent_id = ?
      `).run(now, agentId);
    } else {
      this.db.prepare(`
        UPDATE agent_state
        SET tasks_failed = tasks_failed + 1, last_used = ?
        WHERE agent_id = ?
      `).run(now, agentId);
    }

    this.db.prepare(`
      UPDATE agent_state
      SET total_requests = total_requests + 1
      WHERE agent_id = ?
    `).run(agentId);
  }

  // ==================== Learned Patterns Methods ====================

  /**
   * Save a learned pattern
   */
  savePattern(patternType, description, codeSnippet, tags = []) {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Check if pattern already exists
    const existing = this.db.prepare(`
      SELECT id, success_count FROM learned_patterns
      WHERE pattern_type = ? AND code_snippet = ?
      LIMIT 1
    `).get(patternType, codeSnippet);

    if (existing) {
      // Update existing pattern
      this.db.prepare(`
        UPDATE learned_patterns
        SET success_count = success_count + 1, last_used = ?
        WHERE id = ?
      `).run(now, existing.id);
      return existing.id;
    }

    // Insert new pattern
    this.db.prepare(`
      INSERT INTO learned_patterns (id, pattern_type, description, code_snippet, context_tags, created_at, last_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, patternType, description, codeSnippet, JSON.stringify(tags), now, now);

    return id;
  }

  /**
   * Query patterns by type
   */
  queryPatterns(patternType, limit = 10) {
    const rows = this.db.prepare(`
      SELECT * FROM learned_patterns
      WHERE pattern_type = ?
      ORDER BY success_count DESC, last_used DESC
      LIMIT ?
    `).all(patternType, limit);

    return rows.map(row => ({
      id: row.id,
      patternType: row.pattern_type,
      description: row.description,
      codeSnippet: row.code_snippet,
      contextTags: JSON.parse(row.context_tags || '[]'),
      successCount: row.success_count,
      failureCount: row.failure_count,
      createdAt: row.created_at,
      lastUsed: row.last_used
    }));
  }

  /**
   * Search patterns by description/code
   */
  searchPatterns(searchTerm, limit = 10) {
    const rows = this.db.prepare(`
      SELECT * FROM learned_patterns
      WHERE description LIKE ? OR code_snippet LIKE ?
      ORDER BY success_count DESC
      LIMIT ?
    `).all(`%${searchTerm}%`, `%${searchTerm}%`, limit);

    return rows.map(row => ({
      id: row.id,
      patternType: row.pattern_type,
      description: row.description,
      codeSnippet: row.code_snippet,
      contextTags: JSON.parse(row.context_tags || '[]'),
      successCount: row.success_count,
      failureCount: row.failure_count,
      createdAt: row.created_at,
      lastUsed: row.last_used
    }));
  }

  // ==================== Fixed Patterns Methods ====================

  /**
   * Save a fixed code pattern
   */
  saveFixedPattern(errorType, errorMessage, originalCode, fixedCode, description, filePath = null) {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Check if similar fix already exists
    const existing = this.db.prepare(`
      SELECT id, success_count FROM fixed_patterns
      WHERE error_type = ? AND original_code = ? AND fixed_code = ?
      LIMIT 1
    `).get(errorType, originalCode.substring(0, 100), fixedCode.substring(0, 100));

    if (existing) {
      // Update existing fix
      this.db.prepare(`
        UPDATE fixed_patterns
        SET success_count = success_count + 1, last_used = ?
        WHERE id = ?
      `).run(now, existing.id);
      return existing.id;
    }

    // Insert new fixed pattern
    this.db.prepare(`
      INSERT INTO fixed_patterns (id, error_type, error_message, original_code, fixed_code, fix_description, file_path, created_at, last_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, errorType, errorMessage, originalCode.substring(0, 1000), fixedCode.substring(0, 1000), description, filePath, now, now);

    return id;
  }

  /**
   * Get fixed patterns by error type
   */
  getFixedPatterns(errorType, limit = 10) {
    const rows = this.db.prepare(`
      SELECT * FROM fixed_patterns
      WHERE error_type = ?
      ORDER BY success_count DESC, last_used DESC
      LIMIT ?
    `).all(errorType, limit);

    return rows.map(row => ({
      id: row.id,
      errorType: row.error_type,
      errorMessage: row.error_message,
      originalCode: row.original_code,
      fixedCode: row.fixed_code,
      fixDescription: row.fix_description,
      filePath: row.file_path,
      successCount: row.success_count,
      createdAt: row.created_at,
      lastUsed: row.last_used
    }));
  }

  /**
   * Search for similar errors to apply fixes
   */
  searchSimilarFixes(errorMessage, limit = 5) {
    // Extract error type from message
    const errorType = this.identifyErrorType(errorMessage);
    if (!errorType) return [];

    return this.getFixedPatterns(errorType, limit);
  }

  /**
   * Identify error type from message
   */
  identifyErrorType(errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('indent')) return 'indentation';
    if (lowerMessage.includes('token')) return 'syntax';
    if (lowerMessage.includes('module') || lowerMessage.includes('not defined')) return 'import';
    if (lowerMessage.includes('semicol')) return 'semicolon';
    if (lowerMessage.includes('bracket') || lowerMessage.includes('parenthesis')) return 'bracket';
    if (lowerMessage.includes('permission')) return 'permission';
    if (lowerMessage.includes('port')) return 'port';
    if (lowerMessage.includes('file') && lowerMessage.includes('exist')) return 'file_not_found';

    return 'unknown';
  }

  // ==================== Task History Methods ====================

  /**
   * Save task execution history
   */
  saveTask(task, agentsUsed, mode, results, duration, success) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const conversationId = task.conversationId || null;

    this.db.prepare(`
      INSERT INTO task_history (id, conversation_id, task_text, agents_used, mode, duration_ms, results_json, success, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, conversationId, JSON.stringify(task), JSON.stringify(agentsUsed), mode, duration, JSON.stringify(results), success ? 1 : 0, now);

    return id;
  }

  /**
   * Get task history
   */
  getTaskHistory(limit = 50) {
    const rows = this.db.prepare(`
      SELECT * FROM task_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      task: JSON.parse(row.task_text || '{}'),
      agentsUsed: JSON.parse(row.agents_used || '[]'),
      mode: row.mode,
      duration: row.duration_ms,
      results: JSON.parse(row.results_json || '[]'),
      success: row.success === 1,
      createdAt: row.created_at
    }));
  }

  // ==================== Maintenance Methods ====================

  /**
   * Get database statistics
   */
  getStats() {
    const stats = {};

    stats.conversations = this.db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
    stats.messages = this.db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    stats.patterns = this.db.prepare('SELECT COUNT(*) as count FROM learned_patterns').get().count;
    stats.fixedPatterns = this.db.prepare('SELECT COUNT(*) as count FROM fixed_patterns').get().count;
    stats.tasks = this.db.prepare('SELECT COUNT(*) as count FROM task_history').get().count;
    stats.successRate = this.db.prepare(`
      SELECT CAST(COUNT(CASE WHEN success = 1 THEN 1 END) AS FLOAT) / COUNT(*) * 100 as rate
      FROM task_history
    `).get().rate;

    return stats;
  }

  /**
   * Export data to JSON
   */
  async exportToJson(filePath) {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      conversations: this.getAllConversations(1000),
      patterns: this.queryPatterns('all', 1000),
      fixedPatterns: this.db.prepare('SELECT * FROM fixed_patterns ORDER BY success_count DESC LIMIT 500').all(),
      tasks: this.getTaskHistory(200)
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`📤 Exported memory to: ${filePath}`);
  }

  /**
   * Import data from JSON
   */
  async importFromJson(filePath) {
    const importData = JSON.parse(await fs.readFile(filePath, 'utf8'));

    // Import conversations
    for (const conv of importData.conversations || []) {
      if (!this.getConversation(conv.id)) {
        this.db.prepare(`
          INSERT INTO conversations (id, created_at, updated_at, summary, context_json, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(conv.id, conv.createdAt, conv.createdAt, conv.summary || '', JSON.stringify(conv.context || {}), conv.status || 'active');
      }
    }

    // Import patterns
    for (const pattern of importData.patterns || []) {
      this.db.prepare(`
        INSERT OR IGNORE INTO learned_patterns (id, pattern_type, description, code_snippet, context_tags, created_at, last_used)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(pattern.id, pattern.patternType, pattern.description, pattern.codeSnippet || '', JSON.stringify(pattern.contextTags || []), pattern.createdAt || new Date().toISOString(), pattern.lastUsed || new Date().toISOString());
    }

    console.log(`📥 Imported memory from: ${filePath}`);
  }

  /**
   * Clean up old data
   */
  cleanup(retentionDays = 90) {
    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000)).toISOString();

    // Delete old conversations
    const deletedConvos = this.db.prepare(`
      DELETE FROM conversations WHERE updated_at < ?
    `).run(cutoffDate).changes;

    // Delete old messages (cascades from conversation deletion)
    this.db.prepare('DELETE FROM messages WHERE timestamp < ?').run(cutoffDate);

    // Delete old patterns that haven't been used
    const deletedPatterns = this.db.prepare(`
      DELETE FROM learned_patterns WHERE last_used < ?
    `).run(cutoffDate).changes;

    console.log(`🧹 Cleaned up old data (${retentionDays} days retention)`);
    console.log(`   Conversations: ${deletedConvos}`);
    console.log(`   Patterns: ${deletedPatterns}`);
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('💾 Memory database closed');
    }
  }

  /**
   * Ensure database is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
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

export { MemoryDatabase, getMemoryDatabase };

// Session Store for Cloud Shell Cockpit
// Provides multi-session management for persistent agent interactions

const path = require('path');
const fs = require('fs');

class SessionStore {
  constructor(options = {}) {
    this.storePath = options.storePath || './data/sessions.db';
    this.sessions = new Map();
    this.messages = new Map();
    this.initialized = false;
    this.db = null;
  }

  async initialize() {
    if (this.initialized) return;

    console.log('[SessionStore] Initializing...');

    // Try to load better-sqlite3 for persistent storage
    try {
      const Database = require('better-sqlite3');
      const dbDir = path.dirname(this.storePath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.db = new Database(this.storePath);
      
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_active_at TEXT NOT NULL,
          message_count INTEGER DEFAULT 0,
          metadata TEXT DEFAULT '{}',
          agent_state TEXT DEFAULT '{}'
        );
        
        CREATE TABLE IF NOT EXISTS session_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          agent TEXT,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at);
      `);
      
      console.log('[SessionStore] SQLite storage initialized');
    } catch (e) {
      console.log('[SessionStore] Running in-memory only mode');
      this.db = null;
    }

    // Load existing sessions
    this.loadSessions();

    this.initialized = true;
    console.log(`[SessionStore] Initialization complete, ${this.sessions.size} sessions loaded`);
  }

  loadSessions() {
    if (!this.db) return;

    try {
      const rows = this.db.prepare('SELECT * FROM sessions ORDER BY last_active_at DESC').all();
      
      for (const row of rows) {
        const session = {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastActiveAt: row.last_active_at,
          messageCount: row.message_count,
          metadata: JSON.parse(row.metadata || '{}'),
          agentState: JSON.parse(row.agent_state || '{}')
        };
        this.sessions.set(session.id, session);

        // Load messages
        const msgRows = this.db.prepare(
          'SELECT * FROM session_messages WHERE session_id = ? ORDER BY timestamp ASC'
        ).all(session.id);
        
        this.messages.set(session.id, msgRows.map(m => ({
          id: m.id,
          sessionId: m.session_id,
          role: m.role,
          content: m.content,
          agent: m.agent,
          timestamp: m.timestamp
        })));
      }
    } catch (e) {
      console.error('[SessionStore] Failed to load sessions:', e.message);
    }
  }

  generateId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async create(name, options = {}) {
    await this.initialize();

    const id = this.generateId();
    const now = new Date().toISOString();

    const session = {
      id,
      name,
      description: options.description,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      messageCount: 0,
      metadata: options.metadata || {},
      agentState: options.agentState || {}
    };

    // Store in memory
    this.sessions.set(id, session);
    this.messages.set(id, []);

    // Store in database
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT INTO sessions (id, name, description, created_at, updated_at, last_active_at, message_count, metadata, agent_state)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, name, options.description || null, now, now, now, 0,
          JSON.stringify(options.metadata || {}),
          JSON.stringify(options.agentState || {})
        );
      } catch (e) {
        console.error('[SessionStore] Failed to save session:', e.message);
      }
    }

    console.log(`[SessionStore] Created session: ${id} - "${name}"`);
    return session;
  }

  async get(id) {
    await this.initialize();
    return this.sessions.get(id) || null;
  }

  async list() {
    await this.initialize();
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
  }

  async update(id, updates) {
    await this.initialize();

    const session = this.sessions.get(id);
    if (!session) return null;

    const now = new Date().toISOString();

    if (updates.name !== undefined) session.name = updates.name;
    if (updates.description !== undefined) session.description = updates.description;
    if (updates.metadata !== undefined) session.metadata = { ...session.metadata, ...updates.metadata };
    if (updates.agentState !== undefined) session.agentState = { ...session.agentState, ...updates.agentState };
    
    session.updatedAt = now;

    if (this.db) {
      try {
        this.db.prepare(`
          UPDATE sessions 
          SET name = ?, description = ?, metadata = ?, agent_state = ?, updated_at = ?
          WHERE id = ?
        `).run(
          session.name,
          session.description || null,
          JSON.stringify(session.metadata),
          JSON.stringify(session.agentState),
          now,
          id
        );
      } catch (e) {
        console.error('[SessionStore] Failed to update session:', e.message);
      }
    }

    return session;
  }

  async delete(id) {
    await this.initialize();

    if (!this.sessions.has(id)) return false;

    this.sessions.delete(id);
    this.messages.delete(id);

    if (this.db) {
      try {
        this.db.prepare('DELETE FROM session_messages WHERE session_id = ?').run(id);
        this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
      } catch (e) {
        console.error('[SessionStore] Failed to delete session:', e.message);
      }
    }

    console.log(`[SessionStore] Deleted session: ${id}`);
    return true;
  }

  async addMessage(sessionId, message) {
    await this.initialize();

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const id = this.generateId();
    const timestamp = new Date().toISOString();

    const newMessage = {
      id,
      sessionId,
      role: message.role,
      content: message.content,
      agent: message.agent,
      timestamp
    };

    // Store in memory
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(newMessage);
    this.messages.set(sessionId, sessionMessages);

    // Update session stats
    session.messageCount = sessionMessages.length;
    session.lastActiveAt = timestamp;

    // Store in database
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT INTO session_messages (id, session_id, role, content, agent, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, sessionId, message.role, message.content, message.agent || null, timestamp);

        this.db.prepare(`
          UPDATE sessions 
          SET message_count = ?, last_active_at = ?, updated_at = ?
          WHERE id = ?
        `).run(session.messageCount, timestamp, timestamp, sessionId);
      } catch (e) {
        console.error('[SessionStore] Failed to save message:', e.message);
      }
    }

    return newMessage;
  }

  async getMessages(sessionId, options = {}) {
    await this.initialize();

    const messages = this.messages.get(sessionId) || [];
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return messages.slice(offset, offset + limit);
  }

  async getHistory(sessionId, limit = 20) {
    const messages = await this.getMessages(sessionId, { limit });
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  async stats() {
    await this.initialize();

    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

    return {
      totalSessions: sessions.length,
      totalMessages,
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        messageCount: s.messageCount,
        lastActiveAt: s.lastActiveAt
      }))
    };
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

module.exports = SessionStore;

// Session Store for Cloud Shell Cockpit
// Full-featured multi-session management using sqlite3

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

    try {
      const sqlite3 = require('sqlite3').verbose();
      const dbDir = path.dirname(this.storePath);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.storePath);

      // Create tables
      await this.exec(`
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
      `);

      await this.exec(`
        CREATE TABLE IF NOT EXISTS session_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          agent TEXT,
          timestamp TEXT NOT NULL
        );
      `);

      await this.exec(`CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);`);
      await this.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at);`);

      console.log('[SessionStore] SQLite storage initialized');
    } catch (e) {
      console.error('[SessionStore] Failed to initialize sqlite3:', e.message);
      this.db = null;
    }

    await this.loadSessions();

    this.initialized = true;
    console.log(`[SessionStore] Initialization complete, ${this.sessions.size} sessions loaded`);
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
  }

  getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
  }

  async loadSessions() {
    if (!this.db) return;

    try {
      const rows = await this.all(`SELECT * FROM sessions ORDER BY last_active_at DESC`);

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

        const msgRows = await this.all(
          `SELECT * FROM session_messages WHERE session_id = ? ORDER BY timestamp ASC`,
          [session.id]
        );

        this.messages.set(
          session.id,
          msgRows.map((m) => ({
            id: m.id,
            sessionId: m.session_id,
            role: m.role,
            content: m.content,
            agent: m.agent,
            timestamp: m.timestamp
          }))
        );
      }
    } catch (e) {
      console.error('[SessionStore] Failed to load sessions:', e.message);
    }
  }

  generateId(prefix = 'session') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async create(name, options = {}) {
    await this.initialize();

    const id = this.generateId();
    const now = new Date().toISOString();

    const session = {
      id,
      name,
      description: options.description || null,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      messageCount: 0,
      metadata: options.metadata || {},
      agentState: options.agentState || {}
    };

    this.sessions.set(id, session);
    this.messages.set(id, []);

    if (this.db) {
      try {
        await this.run(
          `
          INSERT INTO sessions (id, name, description, created_at, updated_at, last_active_at, message_count, metadata, agent_state)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            id,
            name,
            session.description,
            now,
            now,
            now,
            0,
            JSON.stringify(session.metadata),
            JSON.stringify(session.agentState)
          ]
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
      (a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
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
        await this.run(
          `
          UPDATE sessions
          SET name = ?, description = ?, metadata = ?, agent_state = ?, updated_at = ?
          WHERE id = ?
        `,
          [
            session.name,
            session.description,
            JSON.stringify(session.metadata),
            JSON.stringify(session.agentState),
            now,
            id
          ]
        );
      } catch (e) {
        console.error('[SessionStore] Failed to update session:', e.message);
      }
    }

    return session;
  }

  async delete(id) {
    await this.initialize();

    this.sessions.delete(id);
    this.messages.delete(id);

    if (this.db) {
      try {
        await this.run(`DELETE FROM session_messages WHERE session_id = ?`, [id]);
        await this.run(`DELETE FROM sessions WHERE id = ?`, [id]);
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
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const id = this.generateId('msg');
    const timestamp = new Date().toISOString();

    const newMessage = {
      id,
      sessionId,
      role: message.role,
      content: message.content,
      agent: message.agent || null,
      timestamp
    };

    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(newMessage);
    this.messages.set(sessionId, sessionMessages);

    session.messageCount = sessionMessages.length;
    session.lastActiveAt = timestamp;

    if (this.db) {
      try {
        await this.run(
          `
          INSERT INTO session_messages (id, session_id, role, content, agent, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [id, sessionId, message.role, message.content, message.agent || null, timestamp]
        );

        await this.run(
          `
          UPDATE sessions
          SET message_count = ?, last_active_at = ?, updated_at = ?
          WHERE id = ?
        `,
          [session.messageCount, timestamp, timestamp, sessionId]
        );
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
    return messages.map((m) => ({
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
      sessions: sessions.map((s) => ({
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

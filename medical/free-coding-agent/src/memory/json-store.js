/**
 * JSON MEMORY STORE - Zero-Cost Persistent Memory
 * File-based memory system using JSON files
 */

import { MemoryStore } from '../local-agent-interface.js';
import fs from 'fs/promises';
import path from 'path';

const MEMORY_DIR = path.join(process.cwd(), 'memory');

export class JsonMemoryStore extends MemoryStore {
  constructor(type = 'json') {
    super(type);
    this.agentsDir = path.join(MEMORY_DIR, 'agents');
    this.conversationsDir = path.join(MEMORY_DIR, 'conversations');
    this.patternsDir = path.join(MEMORY_DIR, 'patterns');
    this.tasksDir = path.join(MEMORY_DIR, 'tasks');
  }

  async initialize() {
    await this._ensureDirectories();
    await this._ensureAgentFiles();
    await this._ensurePatternFiles();
    await this._ensureTaskFiles();
    console.log('[JsonMemoryStore] Initialized with directories:', {
      agents: this.agentsDir,
      conversations: this.conversationsDir,
      patterns: this.patternsDir,
      tasks: this.tasksDir
    });
  }

  async _ensureDirectories() {
    const dirs = [
      this.agentsDir,
      this.conversationsDir,
      this.patternsDir,
      this.tasksDir
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async _ensureAgentFiles() {
    const agentFiles = [
      { id: 'code', file: 'code.json', defaultData: { role: 'code_generation', status: 'idle', capabilities: ['write_code', 'refactor', 'debug'] } },
      { id: 'data', file: 'data.json', defaultData: { role: 'data_engineering', status: 'idle', capabilities: ['validate_schema', 'transform_data', 'query_data'] } },
      { id: 'clinical', file: 'clinical.json', defaultData: { role: 'clinical_analysis', status: 'idle', capabilities: ['medical_guidelines', 'hipaa_compliance', 'clinical_reasoning'] } },
      { id: 'test', file: 'test.json', defaultData: { role: 'testing', status: 'idle', capabilities: ['write_tests', 'run_tests', 'coverage_analysis'] } },
      { id: 'security', file: 'security.json', defaultData: { role: 'security', status: 'idle', capabilities: ['vulnerability_scan', 'security_audit', 'owasp_compliance'] } },
      { id: 'api', file: 'api.json', defaultData: { role: 'api_integration', status: 'idle', capabilities: ['api_design', 'openapi_spec', 'mock_server'] } },
      { id: 'db', file: 'db.json', defaultData: { role: 'database', status: 'idle', capabilities: ['sql_generation', 'schema_migration', 'query_optimization'] } },
      { id: 'devops', file: 'devops.json', defaultData: { role: 'devops', status: 'idle', capabilities: ['dockerfile', 'ci_cd', 'deployment'] } }
    ];

    for (const { id, file, defaultData } of agentFiles) {
      const filePath = path.join(this.agentsDir, file);
      try {
        await fs.readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
          console.log(`[JsonMemoryStore] Created agent file: ${file}`);
        }
      }
    }
  }

  async _ensurePatternFiles() {
    const patternFiles = [
      { id: 'code', file: 'code-patterns.json', defaultData: [] },
      { id: 'clinical', file: 'clinical-patterns.json', defaultData: [] },
      { id: 'data', file: 'data-patterns.json', defaultData: [] },
      { id: 'general', file: 'general-patterns.json', defaultData: [] }
    ];

    for (const { id, file, defaultData } of patternFiles) {
      const filePath = path.join(this.patternsDir, file);
      try {
        await fs.readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
          console.log(`[JsonMemoryStore] Created pattern file: ${file}`);
        }
      }
    }
  }

  async _ensureTaskFiles() {
    const taskFiles = [
      { id: 'task-0003', file: 'task-0003.json', defaultData: null }
    ];

    for (const { id, file, defaultData } of taskFiles) {
      const filePath = path.join(this.tasksDir, file);
      try {
        await fs.readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
          console.log(`[JsonMemoryStore] Created task file: ${file}`);
        }
      }
    }
  }

  /**
   * Store an entry in memory
   */
  async store(entry) {
    if (!entry.id) {
      entry.id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    switch (entry.type) {
      case 'conversation':
        await this._storeConversation(entry);
        break;
      case 'pattern':
        await this._storePattern(entry);
        break;
      case 'agent_state':
        await this._storeAgentState(entry);
        break;
      case 'task':
        await this._storeTask(entry);
        break;
      default:
        throw new Error(`Unknown memory type: ${entry.type}`);
    }
  }

  async _storeConversation(entry) {
    const filePath = path.join(this.conversationsDir, `session-${Date.now()}.json`);
    const data = {
      id: entry.id,
      type: entry.type,
      content: entry.content || [],
      tags: entry.tags || [],
      timestamp: entry.timestamp,
      agent_id: entry.agent_id
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[JsonMemoryStore] Stored conversation: ${entry.id}`);
  }

  async _storePattern(entry) {
    const typeToFile = {
      'code': 'code-patterns.json',
      'clinical': 'clinical-patterns.json',
      'data': 'data-patterns.json',
      'general': 'general-patterns.json'
    };

    const file = typeToFile[entry.agent_id] || 'general';
    const filePath = path.join(this.patternsDir, file);

    let patterns = [];
    try {
      const existing = await fs.readFile(filePath, 'utf8');
      patterns = JSON.parse(existing);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const newPattern = {
      id: entry.id,
      type: entry.type,
      content: entry.content || '',
      tags: entry.tags || [],
      timestamp: entry.timestamp,
      agent_id: entry.agent_id,
      success_count: entry.success_count || 0,
      last_used: entry.timestamp
    };

    patterns.push(newPattern);
    await fs.writeFile(filePath, JSON.stringify(patterns, null, 2), 'utf8');
    console.log(`[JsonMemoryStore] Stored pattern: ${entry.id}`);
  }

  async _storeAgentState(entry) {
    const agentToFile = {
      'code': 'code.json',
      'data': 'data.json',
      'clinical': 'clinical.json',
      'test': 'test.json',
      'security': 'security.json',
      'api': 'api.json',
      'db': 'db.json',
      'devops': 'devops.json'
    };

    const file = agentToFile[entry.agent_id];
    const filePath = path.join(this.agentsDir, file);

    let state = {};
    try {
      const existing = await fs.readFile(filePath, 'utf8');
      state = JSON.parse(existing);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Update state
    Object.assign(state, {
      status: entry.status || state.status,
      workload: entry.workload !== undefined ? entry.workload : state.workload,
      last_activity: entry.last_activity || new Date().toISOString()
    });

    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
    console.log(`[JsonMemoryStore] Updated agent state: ${entry.agent_id}`);
  }

  async _storeTask(entry) {
    const filePath = path.join(this.tasksDir, `${entry.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`}`);

    const data = {
      id: entry.id,
      type: entry.type || 'task',
      task_type: entry.task_type || 'unknown',
      priority: entry.priority || 5,
      routing_decision: entry.routing_decision || 'local_model',
      selected_agent: entry.selected_agent || 'all',
      selected_subsystem: entry.selected_subsystem || 'coding_ensemble',
      estimated_cost: entry.estimated_cost || 0,
      actual_cost: entry.actual_cost || 0,
      confidence: entry.confidence || 0.9,
      status: entry.status || 'pending',
      submitted_at: entry.submitted_at || new Date().toISOString(),
      started_at: entry.started_at,
      completed_at: entry.completed_at,
      execution_time: entry.execution_time,
      result: entry.result || null,
      error: entry.error || null
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[JsonMemoryStore] Stored task: ${entry.id}`);
  }

  /**
   * Query memory
   */
  async query(query, options = {}) {
    const {
      type,
      agent_id,
      tags,
      limit = 50,
      offset = 0
    } = options;

    if (type === 'pattern') {
      return await this._queryPatterns(query, agent_id, tags, limit, offset);
    } else if (type === 'agent_state') {
      return await this._queryAgentState(agent_id);
    } else if (type === 'task') {
      return await this._queryTasks(query, options);
    } else {
      return [];
    }
  }

  async _queryPatterns(query, agent_id, tags, limit, offset) {
    const agentToFile = {
      'code': 'code-patterns.json',
      'clinical': 'clinical-patterns.json',
      'data': 'data-patterns.json',
      'general': 'general-patterns.json'
    };

    const file = agentToFile[agent_id] || 'general'];
    const filePath = path.join(this.patternsDir, file);

    let patterns = [];
    try {
      const existing = await fs.readFile(filePath, 'utf8');
      patterns = JSON.parse(existing);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Filter by query, tags, and apply limit/offset
    let filtered = patterns.filter(p => {
      const content = JSON.stringify(p.content).toLowerCase();
      const matchesQuery = !query || content.includes(query.toLowerCase());
      const matchesAgent = !agent_id || p.agent_id === agent_id;
      const matchesTags = !tags || tags.length === 0 || tags.every(t => p.tags.includes(t));

      return matchesQuery && matchesAgent && matchesTags;
    });

    if (offset > 0) {
      filtered = filtered.slice(offset);
    }

    if (limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    // Sort by success count and last used
    filtered.sort((a, b) => {
      if (b.success_count !== a.success_count) {
        return b.success_count - a.success_count;
      }
      return new Date(b.last_used) - new Date(a.last_used);
    });

    return filtered;
  }

  async _queryAgentState(agent_id) {
    const agentToFile = {
      'code': 'code.json',
      'data': 'data.json',
      'clinical': 'clinical.json',
      'test': 'test.json',
      'security': 'security.json',
      'api': 'api.json',
      'db': 'db.json',
      'devops': 'devops.json'
    };

    const file = agentToFile[agent_id] || 'code.json';
    const filePath = path.join(this.agentsDir, file);

    try {
      const existing = await fs.readFile(filePath, 'utf8');
      return JSON.parse(existing);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return {
        agent_id: agent_id,
        role: 'code_generation',
        status: 'idle',
        capabilities: [],
        workload: 0
      };
    }
  }

  async _queryTasks(query, options) {
    const files = await fs.readdir(this.tasksDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    let allTasks = [];
    for (const file of jsonFiles) {
      const filePath = path.join(this.tasksDir, file);
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        allTasks.push(data);
      } catch (error) {
        console.error(`[JsonMemoryStore] Error reading task file ${file}:`, error);
      }
    }

    // Filter by query
    if (query) {
      const queryLower = query.toLowerCase();
      allTasks = allTasks.filter(t => {
        const dataStr = JSON.stringify(t).toLowerCase();
        return dataStr.includes(queryLower);
      });
    }

    // Sort by submitted_at desc
    allTasks.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    return allTasks;
  }

  /**
   * Get entry by ID
   */
  async get(id) {
    // Try tasks first
    const tasks = await this._queryTasks(id);
    const task = tasks.find(t => t.id === id);
    if (task) {
      return task;
    }

    // Try patterns
    const patterns = await this._queryPatterns(id);
    const pattern = patterns.find(p => p.id === id);
    if (pattern) {
      return pattern;
    }

    // Try agent states
    const agents = ['code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops'];
    for (const agent of agents) {
      const agentToFile = {
        'code': 'code.json',
        'data': 'data.json',
        'clinical': 'clinical.json',
        'test': 'test.json',
        'security': 'security.json',
        'api': 'api.json',
        'db': 'db.json',
        'devops': 'devops.json'
      };

      const file = agentToFile[agent];
      const filePath = path.join(this.agentsDir, file);
      try {
        const existing = await fs.readFile(filePath, 'utf8');
        const state = JSON.parse(existing);
        if (state.id === id || state.last_activity === id) {
          return state;
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return null;
  }

  /**
   * Delete entry by ID
   */
  async delete(id) {
    // Try tasks
    const tasks = await this._queryTasks('');
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      const filePath = path.join(this.tasksDir, tasks[taskIndex].file);
      await fs.unlink(filePath);
      console.log(`[JsonMemoryStore] Deleted task: ${id}`);
      return true;
    }

    // Try patterns
    const patterns = await this._queryPatterns('');
    const patternIndex = patterns.findIndex(p => p.id === id);
    if (patternIndex !== -1) {
      const agentId = patterns[patternIndex].agent_id;
      const agentToFile = {
        'code': 'code-patterns.json',
        'clinical': 'clinical-patterns.json',
        'data': 'data-patterns.json',
        'general': 'general-patterns.json'
      };
      const file = agentToFile[agentId] || 'general'];
      const filePath = path.join(this.patternsDir, file);

      let patternsList = [];
      try {
        const existing = await fs.readFile(filePath, 'utf8');
        patternsList = JSON.parse(existing);
        patternsList.splice(patternIndex, 1);
        await fs.writeFile(filePath, JSON.stringify(patternsList, null, 2), 'utf8');
        console.log(`[JsonMemoryStore] Deleted pattern: ${id}`);
        return true;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return false;
  }

  /**
   * Clear all entries of a type
   */
  async clear() {
    const { type } = options || {};

    if (type === 'conversations') {
      const files = await fs.readdir(this.conversationsDir);
      for (const file of files) {
        await fs.unlink(path.join(this.conversationsDir, file));
      }
    } else if (type === 'patterns') {
      const files = await fs.readdir(this.patternsDir);
      for (const file of files) {
        await fs.unlink(path.join(this.patternsDir, file));
      }
    } else if (type === 'tasks') {
      const files = await fs.readdir(this.tasksDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tasksDir, file));
      }
    } else if (type === 'all') {
      await fs.rm(MEMORY_DIR, { recursive: true, force: true });
    } else {
      throw new Error(`Unknown clear type: ${type}`);
    }
  }
}

export default JsonMemoryStore;

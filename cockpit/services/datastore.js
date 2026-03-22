/**
 * DataStore Service - Structured data persistence
 * Provides JSON-based table storage for structured data
 */
const fs = require('fs');
const path = require('path');

class DataStoreService {
  constructor(options = {}) {
    this.name = 'datastore';
    this.enabled = false;
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data', 'datastore');
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getTablePath(tableName) {
    // Sanitize table name to prevent path traversal
    const safeName = tableName.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.dataDir, safeName + '.json');
  }

  loadTable(tableName) {
    const tablePath = this.getTablePath(tableName);
    if (fs.existsSync(tablePath)) {
      return JSON.parse(fs.readFileSync(tablePath, 'utf8'));
    }
    return { _meta: { created: Date.now(), updated: Date.now() }, records: [] };
  }

  saveTable(tableName, data) {
    const tablePath = this.getTablePath(tableName);
    data._meta.updated = Date.now();
    fs.writeFileSync(tablePath, JSON.stringify(data, null, 2));
    return true;
  }

  // Create a new record
  async create(tableName, record) {
    const table = this.loadTable(tableName);
    const id = record.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRecord = { ...record, id, _created: Date.now(), _updated: Date.now() };
    table.records.push(newRecord);
    this.saveTable(tableName, table);
    return { success: true, id, record: newRecord };
  }

  // Read records with optional query
  async read(tableName, query = {}) {
    const table = this.loadTable(tableName);
    let results = table.records;
    
    if (query.where) {
      results = results.filter(record => {
        return Object.entries(query.where).every(([key, value]) => record[key] === value);
      });
    }
    
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return { success: true, count: results.length, records: results };
  }

  // Update records matching query
  async update(tableName, query, updates) {
    const table = this.loadTable(tableName);
    let count = 0;
    
    table.records = table.records.map(record => {
      const matches = !query.where || Object.entries(query.where).every(([key, value]) => record[key] === value);
      if (matches) {
        count++;
        return { ...record, ...updates, _updated: Date.now() };
      }
      return record;
    });
    
    this.saveTable(tableName, table);
    return { success: true, updated: count };
  }

  // Delete records matching query
  async delete(tableName, query) {
    const table = this.loadTable(tableName);
    const before = table.records.length;
    
    table.records = table.records.filter(record => {
      return !(!query.where || Object.entries(query.where).every(([key, value]) => record[key] === value));
    });
    
    this.saveTable(tableName, table);
    return { success: true, deleted: before - table.records.length };
  }

  // List all tables
  async listTables() {
    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    return { success: true, tables: files.map(f => f.replace('.json', '')) };
  }
}

// Factory function
function createDataStore(options) {
  return new DataStoreService(options);
}

module.exports = { DataStoreService, createDataStore };

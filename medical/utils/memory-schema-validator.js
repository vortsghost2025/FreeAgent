/**
 * MemorySchemaValidator - Self-Maintaining Memory for Autonomous Orchestration
 * Validates and repairs memory files to ensure data integrity.
 */

class MemorySchemaValidator {
  constructor() {
    this.schemas = new Map();
    this.repairLog = [];
    this.healthStats = { totalValidations: 0, passed: 0, failed: 0, repaired: 0 };
    this.initializeDefaultSchemas();
  }

  initializeDefaultSchemas() {
    this.registerSchema('working-memory', { version: 1, fields: { items: { type: 'array', required: true, default: [] }, maxSize: { type: 'number', required: false, default: 100 }, createdAt: { type: 'string', required: true }, updatedAt: { type: 'string', required: true } } });
    this.registerSchema('episodic-memory', { version: 1, fields: { sessions: { type: 'array', required: true, default: [] }, sessionIndex: { type: 'object', required: false, default: {} }, createdAt: { type: 'string', required: true }, updatedAt: { type: 'string', required: true } } });
    this.registerSchema('task-coordination', { version: 1, fields: { tasks: { type: 'array', required: true, default: [] }, activeTasks: { type: 'array', required: false, default: [] }, lastUpdated: { type: 'string', required: true } } });
    this.registerSchema('task-claims', { version: 1, fields: { claims: { type: 'object', required: true, default: {} }, lastUpdated: { type: 'string', required: true } } });
    this.registerSchema('task-completions', { version: 1, fields: { completions: { type: 'array', required: true, default: [] }, lastUpdated: { type: 'string', required: true } } });
    this.registerSchema('direct-messages', { version: 1, fields: { messages: { type: 'array', required: true, default: [] }, lastUpdated: { type: 'string', required: true } } });
    this.registerSchema('provider-scorer', { version: 1, fields: { providers: { type: 'object', required: true, default: {} }, lastUpdated: { type: 'string', required: true } } });
    this.registerSchema('warmup-controller', { version: 1, fields: { agents: { type: 'object', required: true, default: {} }, patterns: { type: 'object', required: false, default: {} }, lastUpdated: { type: 'string', required: true } } });
    this.registerSchema('drift-detector', { version: 1, fields: { agents: { type: 'object', required: true, default: {} }, lastUpdated: { type: 'string', required: true } } });
  }

  registerSchema(memoryType, schema) {
    this.schemas.set(memoryType, { ...schema, registeredAt: new Date().toISOString() });
  }

  getSchema(memoryType) {
    return this.schemas.get(memoryType) || null;
  }

  validate(memoryType, data) {
    const schema = this.schemas.get(memoryType);
    this.healthStats.totalValidations++;
    if (!schema) { this.healthStats.failed++; return { valid: false, errors: ['No schema: ' + memoryType] }; }
    const errors = [], warnings = [];
    for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
      if (fieldConfig.required && (data[fieldName] === undefined || data[fieldName] === null)) errors.push('Missing: ' + fieldName);
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        const actualType = Array.isArray(data[fieldName]) ? 'array' : typeof data[fieldName];
        if (fieldConfig.type !== actualType) warnings.push(fieldName + ' type mismatch');
      }
    }
    const valid = errors.length === 0;
    if (valid) this.healthStats.passed++; else this.healthStats.failed++;
    return { valid, errors, warnings, schemaVersion: schema.version };
  }

  repair(memoryType, data) {
    const schema = this.schemas.get(memoryType);
    if (!schema) return { repaired: false, data, errors: ['No schema: ' + memoryType] };
    const repaired = { ...data }, repairs = [];
    for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
      if (repaired[fieldName] === undefined || repaired[fieldName] === null) {
        if (fieldConfig.default !== undefined) { repaired[fieldName] = fieldConfig.default; repairs.push('Added ' + fieldName); }
      }
    }
    for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
      if (repaired[fieldName] !== undefined && fieldConfig.type === 'number' && typeof repaired[fieldName] === 'string') {
        const parsed = parseFloat(repaired[fieldName]);
        if (!isNaN(parsed)) { repaired[fieldName] = parsed; repairs.push('Converted ' + fieldName); }
      }
      if (repaired[fieldName] !== undefined && fieldConfig.type === 'array' && !Array.isArray(repaired[fieldName])) { repaired[fieldName] = [repaired[fieldName]]; repairs.push('Wrapped ' + fieldName); }
      if (repaired[fieldName] !== undefined && fieldConfig.type === 'object' && typeof repaired[fieldName] !== 'object') { repaired[fieldName] = {}; repairs.push('Init ' + fieldName); }
    }
    const result = { repaired: repairs.length > 0, data: repaired, repairs, timestamp: new Date().toISOString() };
    if (result.repaired) { this.healthStats.repaired++; this.repairLog.push({ memoryType, repairs, timestamp: result.timestamp }); if (this.repairLog.length > 100) this.repairLog.shift(); }
    return result;
  }

  checkHealth() {
    const memoryTypes = Array.from(this.schemas.keys());
    const health = { overall: 'healthy', schemasRegistered: memoryTypes.length, stats: { ...this.healthStats }, memoryTypes: {}, recentRepairs: this.repairLog.slice(-10) };
    if (health.stats.totalValidations > 0) {
      health.passRate = (health.stats.passed / health.stats.totalValidations * 100).toFixed(1);
      health.repairRate = (health.stats.repaired / health.stats.totalValidations * 100).toFixed(1);
      if (health.stats.failed > health.stats.passed) health.overall = 'degraded';
    } else { health.passRate = '0'; health.repairRate = '0'; }
    for (const mt of memoryTypes) health.memoryTypes[mt] = { schemaVersion: this.schemas.get(mt).version, status: 'registered' };
    return health;
  }

  getRepairLog(limit = 50) { return this.repairLog.slice(-limit); }

  validateAndRepair(memoryType, data) {
    const v = this.validate(memoryType, data);
    return v.valid ? { repaired: false, data, repairs: [], validation: v } : this.repair(memoryType, data);
  }

  resetStats() { this.healthStats = { totalValidations: 0, passed: 0, failed: 0, repaired: 0 }; }
}

const memorySchemaValidator = new MemorySchemaValidator();
module.exports = { MemorySchemaValidator, memorySchemaValidator };
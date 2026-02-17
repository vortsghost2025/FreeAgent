/**
 * Logger test - demonstrate logging features
 */

import { createLogger, LogLevel } from './utils/logger.js';

console.log('=== TESTING LOGGER ===\n');

// Test 1: Basic logging
console.log('1. Basic logging with all levels:');
const logger = createLogger({ level: LogLevel.DEBUG });
logger.debug('agent-001', 'This is a debug message');
logger.info('agent-001', 'Processing started');
logger.warn('agent-002', 'Low confidence classification', { confidence: 0.25 });
logger.error('agent-003', 'Validation failed', { field: 'data.content', reason: 'missing' });
logger.fatal('orchestrator', 'Pipeline failed');

console.log('\n2. Filtering by log level (INFO and above):');
logger.setLevel(LogLevel.INFO);
logger.debug('agent-001', 'This will NOT appear');
logger.info('agent-001', 'This WILL appear');
logger.warn('agent-002', 'This WILL appear');

console.log('\n3. Compact format:');
const compactLogger = createLogger({ format: 'compact', level: LogLevel.DEBUG });
compactLogger.info('agent-001', 'Compact format message', { key: 'value' });

console.log('\n4. JSON format:');
const jsonLogger = createLogger({ format: 'json', level: LogLevel.DEBUG });
jsonLogger.info('agent-001', 'JSON format message', { status: 'processing' });

console.log('\n5. With metadata:');
logger.addMetadata('pipelineId', 'pipeline-123');
logger.addMetadata('version', '1.0.0');
logger.info('agent-001', 'Message with metadata');

console.log('\n6. Agent-specific logger:');
const agentLogger = logger.forAgent('summarization-001');
agentLogger.info('Starting summarization');
agentLogger.warn('Partial data extracted', { completeness: 0.7 });

console.log('\n7. Without  colors:');
const plainLogger = createLogger({ enableColors: false, level: LogLevel.DEBUG });
plainLogger.info('agent-001', 'Plain text without colors');

console.log('\n8. Pattern filtering:');
const filteredLogger = createLogger({ level: LogLevel.DEBUG });
filteredLogger.addFilter(/memory/i);
filteredLogger.info('agent-001', 'This message appears');
filteredLogger.info('agent-002', 'Memory usage: 45%'); // Will be filtered

console.log('\n=== LOGGER TEST COMPLETE ===');

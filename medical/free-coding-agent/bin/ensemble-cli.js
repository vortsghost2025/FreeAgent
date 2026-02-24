#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { readFileSync } from "fs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import ensemble components
import { EnsembleCoordinator, AGENT_ROLES, COLLABORATION_MODE } from '../src/ensemble-core.js';
import { getMemoryDatabase } from '../src/memory-database.js';
import { createSimpleEnsemble } from '../src/swarm-integration.js';

const packageJson = require('../package.json');

// Load config
let config = {};
try {
  const configPath = join(__dirname, '../ensemble.config.json');
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.warn(chalk.yellow('⚠️  Could not load ensemble.config.json, using defaults'));
}

program
  .name("ensemble")
  .description("Medical coding ensemble - multi-agent collaborative system")
  .version(packageJson.version);

program
  .command('ensemble <task>')
  .description('Run ensemble of agents in parallel')
  .option('-a, --agents <roles>', 'Agent roles to use (comma-separated)', config.ensemble?.defaultAgents?.join(',') || 'code_generation,data_engineering')
  .option('-m, --mode <mode>', 'Execution mode (parallel|sequential|independent)', config.ensemble?.collaborationMode || 'parallel')
  .option('-c, --config <path>', 'Path to config file', './ensemble.config.json')
  .option('--no-memory', 'Disable persistent memory')
  .action(async (task, options) => {
    await runEnsemble(task, options);
  });

program
  .command('memory <action>')
  .description('Manage persistent memory')
  .option('--query <pattern>', 'Search learned patterns')
  .option('--type <patternType>', 'Filter patterns by type')
  .option('--export <file>', 'Export memory to file')
  .option('--import <file>', 'Import memory from file')
  .option('--stats', 'Show memory statistics')
  .option('--cleanup <days>', 'Clean up old data', '90')
  .action(async (action, options) => {
    await manageMemory(action, options);
  });

program
  .command('swarm-status')
  .description('Show SwarmCoordinator status')
  .action(async () => {
    await showSwarmStatus();
  });

program
  .command('list-roles')
  .description('List available agent roles')
  .action(async () => {
    listRoles();
  });

program
  .command('list-modes')
  .description('List available collaboration modes')
  .action(async () => {
    listModes();
  });

program
  .command('test')
  .description('Run ensemble test suite')
  .action(async () => {
    await runTests();
  });

program.parse();

async function runEnsemble(task, options) {
  console.log(chalk.cyan.bold('\n🎼 Medical Coding Ensemble\n'));
  console.log(chalk.gray(`Task: ${task}`));
  console.log(chalk.gray(`Agents: ${options.agents}`));
  console.log(chalk.gray(`Mode: ${options.mode}`));
  console.log(chalk.gray(`Memory: ${options.memory ? 'enabled' : 'disabled'}\n`));

  // Parse agent roles
  const agentRoles = options.agents.split(',').map(r => r.trim());

  // Validate roles
  const validRoles = Object.values(AGENT_ROLES);
  for (const role of agentRoles) {
    if (!validRoles.includes(role)) {
      console.error(chalk.red(`❌ Invalid agent role: ${role}`));
      console.log(chalk.gray(`Valid roles: ${validRoles.join(', ')}`));
      process.exit(1);
    }
  }

  // Validate mode
  const validModes = Object.values(COLLABORATION_MODE);
  if (!validModes.includes(options.mode)) {
    console.error(chalk.red(`❌ Invalid mode: ${options.mode}`));
    console.log(chalk.gray(`Valid modes: ${validModes.join(', ')}`));
    process.exit(1);
  }

  const spinner = ora('Initializing ensemble...').start();

  try {
    // Create ensemble
    const ensemble = await createSimpleEnsemble({
      ...config,
      defaultAgents: agentRoles,
      collaborationMode: options.mode
    });

    spinner.succeed('Ensemble initialized');

    // Initialize memory if enabled
    if (options.memory) {
      spinner.start('Connecting to memory database...');
      const memory = getMemoryDatabase();
      await memory.initialize();
      spinner.succeed('Memory database connected');
    }

    // Process task
    console.log(chalk.blue('\nProcessing task...\n'));

    let fullResponse = '';
    const agentResponses = new Map();

    for await (const event of ensemble.process(task, {
      agents: agentRoles,
      mode: options.mode
    })) {
      if (event.type === 'agent_chunk') {
        process.stdout.write(event.content);
        fullResponse += event.content;

        if (!agentResponses.has(event.agentId)) {
          agentResponses.set(event.agentId, '');
        }
        agentResponses.set(event.agentId, agentResponses.get(event.agentId) + event.content);
      } else if (event.type === 'agent_complete') {
        console.log(chalk.gray(`\n\n[${event.role}] completed in ${event.processingTime}ms`));
      } else if (event.type === 'ensemble_complete') {
        console.log(chalk.green(`\n\n✅ Ensemble completed in ${event.totalProcessingTime}ms`));
      }
    }

    console.log('\n');

    // Save to memory if enabled
    if (options.memory) {
      const memory = getMemoryDatabase();
      const conversationId = `conv-${Date.now()}`;
      await memory.saveConversation(conversationId, {
        createdAt: new Date().toISOString(),
        summary: task.substring(0, 100),
        context: { task, agents: agentRoles, mode: options.mode }
      });

      await memory.recordTask({
        taskType: 'ensemble',
        inputSummary: task.substring(0, 200),
        resultSummary: fullResponse.substring(0, 200),
        success: true,
        processingTime: 0,
        agentRoles: agentRoles,
        conversationId
      });

      console.log(chalk.gray('📝 Saved to memory\n'));
    }

    // Shutdown
    await ensemble.shutdown();

  } catch (error) {
    spinner.fail('Ensemble failed');
    console.error(chalk.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

async function manageMemory(action, options) {
  const spinner = ora().start();

  try {
    const memory = getMemoryDatabase();
    await memory.initialize();

    switch (action) {
      case 'stats':
        spinner.start('Getting statistics...');
        const stats = await memory.getStatistics();
        spinner.stop();

        console.log(chalk.cyan.bold('\n📊 Memory Statistics\n'));
        console.log(`Conversations: ${stats.conversations}`);
        console.log(`Messages: ${stats.messages}`);
        console.log(`Agent States: ${stats.agentStates}`);
        console.log(`Patterns: ${stats.patterns}`);
        console.log(`Tasks: ${stats.tasks}`);
        console.log(`Database Size: ${(stats.fileSize / 1024).toFixed(2)} KB`);
        console.log(`Database Path: ${stats.dbPath}`);
        break;

      case 'query':
        if (!options.query) {
          console.error(chalk.red('❌ --query is required'));
          process.exit(1);
        }

        spinner.start('Searching patterns...');
        const patterns = options.type
          ? await memory.queryPatternsByType(options.type, 20)
          : await memory.searchPatterns(options.query, 20);
        spinner.stop();

        console.log(chalk.cyan.bold(`\n🔍 Patterns matching: ${options.query}\n`));

        if (patterns.length === 0) {
          console.log(chalk.gray('No patterns found'));
        } else {
          patterns.forEach((p, i) => {
            console.log(`${chalk.blue(`${i + 1}.`)} ${chalk.cyan(p.patternType)}`);
            console.log(`   ${p.description}`);
            if (p.successCount > 0) {
              console.log(`   ${chalk.green(`✓ Used ${p.successCount} times successfully`)}`);
            }
            console.log();
          });
        }
        break;

      case 'export':
        if (!options.export) {
          console.error(chalk.red('❌ --export is required'));
          process.exit(1);
        }

        spinner.start('Exporting memory...');
        const jsonData = memory.exportToJson();

        const fsPromises = await import('fs/promises');
        await fsPromises.writeFile(options.export, jsonData);
        spinner.succeed(`Exported to ${options.export}`);

        console.log(chalk.gray(`Size: ${(jsonData.length / 1024).toFixed(2)} KB\n`));
        break;

      case 'import':
        if (!options.import) {
          console.error(chalk.red('❌ --import is required'));
          process.exit(1);
        }

        spinner.start('Importing memory...');
        const fsPromisesImport = await import('fs/promises');
        const importData = await fsPromisesImport.readFile(options.import, 'utf8');
        await memory.importFromJson(importData);
        spinner.succeed(`Imported from ${options.import}`);
        break;

      case 'cleanup':
        const days = parseInt(options.cleanup);
        spinner.start(`Cleaning up data older than ${days} days...`);
        await memory.cleanup(days);
        spinner.succeed(`Cleanup complete`);
        break;

      default:
        console.error(chalk.red(`❌ Unknown action: ${action}`));
        console.log(chalk.gray('Available actions: stats, query, export, import, cleanup'));
        process.exit(1);
    }

    await memory.close();
  } catch (error) {
    spinner.fail('Memory operation failed');
    console.error(chalk.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

async function showSwarmStatus() {
  console.log(chalk.cyan.bold('\n🐝 Swarm Coordinator Status\n'));

  console.log(chalk.gray('Note: Swarm integration requires the SwarmCoordinator'));
  console.log(chalk.gray('to be available in the environment.\n'));

  console.log(chalk.yellow('Ensemble agents:'));
  console.log(chalk.gray('  The ensemble runs independently without swarm'));
  console.log(chalk.gray('  coordination in CLI mode.\n'));

  console.log(chalk.gray('To use with SwarmCoordinator:'));
  console.log(chalk.gray('  1. Ensure swarm-coordinator.js is available'));
  console.log(chalk.gray('  2. Import EnsembleSwarmAdapter in your code'));
  console.log(chalk.gray('  3. Register ensemble with swarm\n'));
}

function listRoles() {
  console.log(chalk.cyan.bold('\n🤖 Available Agent Roles\n'));

  console.log(`${chalk.cyan('code_generation')}`);
  console.log('  Specializes in writing and modifying code');
  console.log('  - Coding best practices');
  console.log('  - Testing and TDD');
  console.log('  - Refactoring');
  console.log();

  console.log(`${chalk.cyan('data_engineering')}`);
  console.log('  Specializes in medical data validation and transformation');
  console.log('  - Schema design');
  console.log('  - Data quality checks');
  console.log('  - ETL pipelines');
  console.log();

  console.log(`${chalk.cyan('clinical_analysis')}`);
  console.log('  Specializes in medical reasoning and guidelines');
  console.log('  - Clinical context interpretation');
  console.log('  - CDC/WHO compliance');
  console.log('  - HIPAA privacy');
  console.log();
}

function listModes() {
  console.log(chalk.cyan.bold('\n⚡ Collaboration Modes\n'));

  console.log(`${chalk.cyan('parallel')}`);
  console.log('  Agents work simultaneously on different aspects');
  console.log('  - Fastest mode');
  console.log('  - Independent work');
  console.log('  - Results combined at end');
  console.log();

  console.log(`${chalk.cyan('sequential')}`);
  console.log('  Agents work in sequence, passing state');
  console.log('  - Agents build on each other\'s work');
  console.log('  - Slower but more coordinated');
  console.log('  - Good for multi-step tasks');
  console.log();

  console.log(`${chalk.cyan('independent')}`);
  console.log('  Each agent works independently without coordination');
  console.log('  - Maximum independence');
  console.log('  - No state sharing');
  console.log('  - Multiple perspectives on same input');
  console.log();
}

async function runTests() {
  console.log(chalk.cyan.bold('\n🧪 Running Ensemble Tests\n'));

  const tests = [
    { name: 'Ensemble Core Import', fn: async () => {
      const { EnsembleCoordinator } = await import('../src/ensemble-core.js');
      return EnsembleCoordinator !== undefined;
    }},
    { name: 'Memory Database Import', fn: async () => {
      const { MemoryDatabase } = await import('../src/memory-database.js');
      return MemoryDatabase !== undefined;
    }},
    { name: 'Specialized Agents Import', fn: async () => {
      const { CodeGenerationAgent, DataEngineeringAgent, ClinicalAnalysisAgent } = await import('../src/agents/specialized.js');
      return CodeGenerationAgent && DataEngineeringAgent && ClinicalAnalysisAgent;
    }},
    { name: 'Hybrid Provider Import', fn: async () => {
      const { HybridProviderManager } = await import('../src/providers/hybrid-manager.js');
      return HybridProviderManager !== undefined;
    }},
    { name: 'Swarm Integration Import', fn: async () => {
      const { EnsembleSwarmAdapter } = await import('../src/swarm-integration.js');
      return EnsembleSwarmAdapter !== undefined;
    }},
    { name: 'Schema Validator Import', fn: async () => {
      const { MedicalSchemaValidator } = await import('../src/agents/medical-schema-validator.js');
      return MedicalSchemaValidator !== undefined;
    }}
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const spinner = ora(`Running: ${test.name}`).start();
    try {
      const result = await test.fn();
      if (result) {
        spinner.succeed();
        passed++;
      } else {
        spinner.fail('Test returned false');
        failed++;
      }
    } catch (error) {
      spinner.fail(error.message);
      failed++;
    }
  }

  console.log(chalk.bold(`\nResults: ${chalk.green(`${passed} passed`) + (failed > 0 ? `, ${chalk.red(`${failed} failed`)}` : '')}\n`));

  if (failed > 0) {
    process.exit(1);
  }
}

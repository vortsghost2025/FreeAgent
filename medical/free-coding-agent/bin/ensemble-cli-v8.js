#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { CodingAgent } from "../src/agent.js";
import { EnsembleCoordinator, AGENT_ROLES } from "../src/ensemble-core-v8.js";
import { TerminalExecutor } from "../src/tools/terminal-executor.js";
import { ErrorFixer } from "../src/tools/error-fixer.js";
import { getMemoryDatabase } from "../src/memory-database.js";

const packageJson = require("../package.json");

program
  .name("free-coding-agent")
  .description("Free coding agent with multiple LLM backends - 8-Agent Medical Ensemble")
  .version(packageJson.version)
  .option(
    "-p, --provider <provider>",
    "LLM provider (ollama, groq, together)",
    "ollama"
  )
  .option("-m, --model <model>", "Model to use")
  .option("-w, --working-dir <dir>", "Working directory", process.cwd())
  .option("--no-approval", "Disable approval for commands")
  .action(async (options) => {
    await runInteractive(options);
  });

// ========== Single Agent Commands ==========

program
  .command("chat <message>")
  .description("Send a single message to an agent")
  .option("-p, --provider <provider>", "LLM provider", "ollama")
  .option("-m, --model <model>", "Model to use")
  .option("-w, --working-dir <dir>", "Working directory", process.cwd())
  .action(async (message, options) => {
    await runSingle(message, options);
  });

program
  .command("models")
  .description("List available models")
  .option("-p, --provider <provider>", "LLM provider", "ollama")
  .action(async (options) => {
    await listModels(options);
  });

// ========== 8-Agent Ensemble Commands ==========

program
  .command("ensemble <task>")
  .description("Run 8-agent medical coding ensemble")
  .option("-c, --count <number>", "Number of agents (1-8)", "2")
  .option("-a, --agents <roles>", `Agent roles (comma-separated)
    Available: ${Object.values(AGENT_ROLES).join(', ')}`, "code_generation,data_engineering")
  .option("-m, --mode <mode>", "Execution mode (parallel,sequential,independent)", "parallel")
  .option("--config <file>", "Path to ensemble config file", "./ensemble.config.json")
  .option("--no-approval", "Disable approval for commands", false)
  .action(async (task, options) => {
    await runEnsemble(task, options);
  });

program
  .command("powershell <command>")
  .description("Execute PowerShell command")
  .option("-s, --script <file>", "Run PowerShell script file (.ps1)")
  .action(async (command, options) => {
    await runPowerShell(command, options);
  });

program
  .command("bash <command>")
  .description("Execute bash/sh command")
  .action(async (command) => {
    await runBash(command);
  });

program
  .command("fix <file>")
  .description("Auto-fix errors in file")
  .option("--auto", "Auto-apply fixes without confirmation", false)
  .option("--dry-run", "Show fixes without applying", false)
  .action(async (file, options) => {
    await runErrorFixer(file, options);
  });

program
  .command("memory <action>")
  .description("Manage persistent memory")
  .option("--query <pattern>", "Search patterns by text", "")
  .option("--export <file>", "Export memory to JSON file", "")
  .option("--import <file>", "Import memory from JSON file", "")
  .option("--stats", "Show memory statistics")
  .action(async (action, options) => {
    await manageMemory(action, options);
  });

program
  .command("swarm-status")
  .description("Show ensemble and swarm metrics")
  .action(async () => {
    await showSwarmStatus();
  });

program.parse();

// ========== Command Implementations ==========

async function runInteractive(options) {
  console.log(chalk.cyan.bold("\n🤖 Free Coding Agent - 8-Agent Medical Ensemble\n"));
  console.log(chalk.gray(`Provider: ${options.provider}`));
  console.log(chalk.gray(`Working directory: ${options.workingDir}`));
  console.log(chalk.gray(`Type "exit" to quit, "clear" to reset conversation`));
  console.log(
    chalk.gray(`\n${'='.repeat(50)}\n`),
    chalk.cyan("  Available Commands:\n"),
    chalk.gray("  - chat <message>   : Single agent chat\n"),
    chalk.gray("  - ensemble <task>  : 8-agent parallel execution\n"),
    chalk.gray("  - powershell <cmd>: Execute PowerShell\n"),
    chalk.gray("  - bash <cmd>       : Execute bash command\n"),
    chalk.gray("  - fix <file>        : Auto-fix errors\n"),
    chalk.gray("  - memory <action>   : Manage memory\n"),
    chalk.gray("  - swarm-status    : Show metrics\n"),
    chalk.gray(`\n${'='.repeat(50)}`)
  );

  const agent = new CodingAgent({
    provider: options.provider,
    model: options.model,
    workingDir: options.workingDir,
    requiresApproval: !options.noApproval,
    onToolCall: (tool, params, result) => {
      console.log(chalk.yellow(`  🔧 Tool: ${tool}`));
      if (result.success) {
        console.log(chalk.green("    ✅ Success"));
      } else {
        console.log(chalk.red(`    ❌ ${result.error}`));
      }
    },
  });

  const available = await agent.isAvailable();
  if (!available) {
    console.log(
      chalk.red(`\n❌ Provider "${options.provider}" is not available.`),
    );
    if (options.provider === "ollama") {
      console.log(chalk.yellow("  Make sure Ollama is running: ollama serve"));
    } else if (options.provider === "groq") {
      console.log(chalk.yellow("  Set GROQ_API_KEY environment variable"));
    } else if (options.provider === "together") {
      console.log(chalk.yellow("  Set TOGETHER_API_KEY environment variable"));
    }
    process.exit(1);
  }

  // Main chat loop
  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: "input",
        name: "message",
        message: chalk.blue("You:"),
        prefix: "",
      },
    ]);

    if (message.toLowerCase() === "exit") {
      console.log(chalk.gray("\n👋 Goodbye!"));
      break;
    }

    if (message.toLowerCase() === "clear") {
      agent.reset();
      console.log(chalk.green("\n✅ Conversation cleared\n"));
      continue;
    }

    if (!message.trim()) continue;

    process.stdout.write(chalk.magenta("\n🤖 Assistant: "));

    try {
      for await (const event of agent.process(message)) {
        if (event.type === "chunk") {
          process.stdout.write(event.content);
        } else if (event.type === "approval_required") {
          console.log(
            chalk.yellow(
              `\n\n⚠️  Command requires approval: ${event.params.command}`,
            ),
          );
          const { approve } = await inquirer.prompt([
            {
              type: "confirm",
              name: "approve",
              message: "Approve this command?",
              default: false,
            },
          ]);
          if (approve) {
            process.stdout.write(chalk.magenta("\n🤖 Assistant: "));
            for await (const contEvent of agent.continue(true)) {
              if (contEvent.type === "chunk") {
                process.stdout.write(contEvent.content);
              }
            }
          } else {
            console.log(chalk.red("Command rejected."));
          }
        } else if (event.type === "input_required") {
          console.log(chalk.yellow(`\n\n❓ ${event.question}`));
          const { input } = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: "Your answer:",
            },
          ]);
          process.stdout.write(chalk.magenta("\n🤖 Assistant: "));
          for await (const contEvent of agent.continue(false, input)) {
            if (contEvent.type === "chunk") {
              process.stdout.write(contEvent.content);
            }
          }
        }
      }
      console.log("\n");
    } catch (error) {
      console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
    }
  }
}

async function runSingle(message, options) {
  const agent = new CodingAgent({
    provider: options.provider,
    model: options.model,
    workingDir: options.workingDir,
    requiresApproval: !options.noApproval,
  });

  try {
    for await (const event of agent.process(message)) {
      if (event.type === "chunk") {
        process.stdout.write(event.content);
      } else if (event.type === "tool") {
        console.log(chalk.yellow(`  🔧 [Tool: ${event.tool}]`));
        if (event.result.success) {
          console.log(chalk.green("    ✅ Success"));
        } else {
          console.log(chalk.red(`    ❌ ${event.result.error}`));
        }
      }
    }
    console.log();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function runEnsemble(task, options) {
  const spinner = ora(chalk.cyan("Initializing 8-Agent Ensemble...")).start();

  try {
    // Load config
    const configPath = options.config || "./ensemble.config.json";
    const { readFileSync } = await import("fs");
    let config = {};
    try {
      config = JSON.parse(readFileSync(configPath, "utf8"));
    } catch {
      console.log(chalk.yellow(`Using default config, ${configPath} not found`));
    }

    // Create ensemble coordinator
    const ensemble = new EnsembleCoordinator({
      ...config,
      workingDir: options.workingDir,
      requiresApproval: !options.noApproval
    });

    await ensemble.initialize();

    spinner.stop();

    // Parse agent roles
    const agentCount = options.count || config.ensemble?.maxParallelAgents || 2;
    const rolesInput = options.agents || null;
    const mode = options.mode || config.ensemble?.collaborationMode || "parallel";

    console.log(chalk.cyan.bold("\n🤖 8-Agent Medical Ensemble"));
    console.log(chalk.gray(`  Task: ${task}`));
    console.log(chalk.gray(`  Agents: ${agentCount}`));
    console.log(chalk.gray(`  Mode: ${mode}`));
    console.log(chalk.gray(`${'='.repeat(50)}\n`));

    // Execute with ensemble
    const startTime = Date.now();

    for await (const event of ensemble.executeParallel(task, {
      agentCount,
      roles: rolesInput ? rolesInput.split(',').map(r => r.trim()) : null,
      mode
    })) {
      if (event.type === "agent_chunk") {
        const roleColor = getRoleColor(event.role);
        process.stdout.write(`${chalk.gray(`[${event.agentId.slice(-4)}]`)} ${roleColor(`[AG${getAgentNumber(event.role)}]`)}: ${event.content}`);
      } else if (event.type === "agent_tool") {
        console.log(chalk.yellow(`  🔧 [${event.agentId}][${event.tool}]`));
      } else if (event.type === "agent_complete") {
        console.log(chalk.green(`  ✅ [${event.agentId}] Complete`));
      } else if (event.type === "agent_error") {
        console.log(chalk.red(`  ❌ [${event.agentId}] ${event.error}`));
      } else if (event.type === "ensemble_complete") {
        const duration = Date.now() - startTime;
        console.log(chalk.gray(`\n${'='.repeat(50)}\n`));
        console.log(chalk.cyan(`✅ Ensemble completed in ${duration}ms`));
        break;
      }
    }

    // Save metrics
    console.log(chalk.gray("\nMetrics:"));
    const metrics = ensemble.getMetrics();
    console.log(chalk.gray(`  Total agents: ${metrics.totalAgents}`));
    console.log(chalk.gray(`  Tasks completed: ${metrics.totalTasksCompleted}`));
    console.log(chalk.gray(`  Tasks failed: ${metrics.totalTasksFailed}`));
    console.log(chalk.gray(`  Avg workload: ${metrics.avgWorkload?.toFixed(2) || 0}%`));

  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function runPowerShell(command, options) {
  const spinner = ora(chalk.cyan("Executing PowerShell...")).start();

  const executor = new TerminalExecutor({
    workingDir: process.cwd(),
    timeout: 30000
  });

  try {
    if (options.script) {
      const result = await executor.execute({ command: '', script: options.script, shell: 'powershell' });
      spinner.stop();

      if (result.success) {
        console.log(chalk.green(`✅ Script executed successfully`));
        if (result.output) {
          console.log(chalk.gray(result.output));
        }
      } else {
        console.log(chalk.red(`❌ Script failed: ${result.error}`));
      }
    } else {
      const result = await executor.execute({ command, shell: 'powershell' });
      spinner.stop();

      if (result.success) {
        console.log(chalk.green(`✅ Command executed successfully`));
        if (result.output) {
          console.log(chalk.gray(result.output));
        }
      } else {
        console.log(chalk.red(`❌ Command failed: ${result.error}`));
      }
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function runBash(command) {
  const spinner = ora(chalk.cyan("Executing bash command...")).start();

  const executor = new TerminalExecutor({
    workingDir: process.cwd(),
    timeout: 30000
  });

  try {
    const result = await executor.execute({ command, shell: 'bash' });
    spinner.stop();

    if (result.success) {
      console.log(chalk.green(`✅ Command executed successfully`));
      if (result.output) {
        console.log(chalk.gray(result.output));
      }
    } else {
      console.log(chalk.red(`❌ Command failed: ${result.error}`));
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function runErrorFixer(file, options) {
  const spinner = ora(chalk.cyan("Analyzing and fixing errors...")).start();

  const fixer = new ErrorFixer({
    workingDir: process.cwd(),
    autoApply: options.auto
  });

  try {
    const fs = await import("fs");
    const code = await fs.promises.readFile(file, "utf8");
    const result = await fixer.execute({
      file,
      code,
      dryRun: options.dryRun
    });

    spinner.stop();

    if (result.success) {
      console.log(chalk.green(`✅ ${result.description}`));
      console.log(chalk.gray(`   Fix type: ${result.fixType}`));

      if (!options.dryRun && result.fixedCode) {
        await fs.promises.writeFile(file, result.fixedCode, "utf8");
        console.log(chalk.cyan(`   💾 Fixed: ${file}`));
      } else if (options.dryRun) {
        console.log(chalk.cyan(`   [Dry Run - Changes NOT applied]`));
        console.log(chalk.gray("\n" + result.fixedCode));
      }
    } else {
      console.log(chalk.red(`❌ ${result.error || result}`));
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function manageMemory(action, options) {
  const spinner = ora(chalk.cyan("Accessing memory...")).start();

  try {
    const memory = await getMemoryDatabase();
    await memory.initialize();

    spinner.stop();

    if (options.query) {
      console.log(chalk.cyan(`\n🔍 Searching patterns: "${options.query}"\n`));
      const patterns = await memory.searchPatterns(options.query);
      if (patterns.length === 0) {
        console.log(chalk.gray("No patterns found."));
      } else {
        patterns.forEach((p, i) => {
          console.log(chalk.cyan(`${i + 1}. ${p.description}`));
          console.log(chalk.gray(`   Type: ${p.patternType}`));
          if (p.codeSnippet) {
            console.log(chalk.gray(`   Code:\n${p.codeSnippet.substring(0, 200)}...`));
          }
        });
      }
    } else if (options.export) {
      console.log(chalk.cyan(`\n💾 Exporting memory to: ${options.export}\n`));
      await memory.exportToJson(options.export);
      console.log(chalk.green(`✅ Exported to: ${options.export}`));
    } else if (options.import) {
      console.log(chalk.cyan(`\n📥 Importing memory from: ${options.import}\n`));
      await memory.importFromJson(options.import);
      console.log(chalk.green("✅ Import complete"));
    } else if (options.stats) {
      const stats = memory.getStatistics();
      console.log(chalk.cyan("\n📊 Memory Statistics:\n"));
      console.log(chalk.gray(`  Conversations: ${stats.conversations}`));
      console.log(chalk.gray(`  Messages: ${stats.messages}`));
      console.log(chalk.gray(`  Patterns: ${stats.patterns}`));
      console.log(chalk.gray(`  Agent States: ${stats.agentStates}`));
      console.log(chalk.gray(`  Tasks: ${stats.tasks}`));
      console.log(chalk.gray(`  DB Size: ${(stats.fileSize / 1024).toFixed(2)} KB`));
    } else {
      console.log(chalk.cyan("\n💾 Memory Actions:\n"));
      console.log(chalk.gray("  --query <pattern>  Search patterns"));
      console.log(chalk.gray("  --export <file>    Export memory"));
      console.log(chalk.gray("  --import <file>    Import memory"));
      console.log(chalk.gray("  --stats              Show statistics"));
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function showSwarmStatus() {
  console.log(chalk.cyan.bold("\n🤖 8-Agent Ensemble Metrics\n"));

  try {
    const configPath = "./ensemble.config.json";
    const fs = await import("fs");
    let config = {};
    try {
      config = JSON.parse(await fs.promises.readFile(configPath, "utf8"));
    } catch {
      // Use defaults
    }

    // Create ensemble and get metrics
    const ensemble = new EnsembleCoordinator(config);
    const metrics = ensemble.getMetrics();

    console.log(chalk.gray(`${'='.repeat(50)}`));
    console.log(chalk.cyan("📊 Ensemble Metrics:"));
    console.log(chalk.gray(`  Session ID: ${metrics.sessionId}`));
    console.log(chalk.gray(`  Total Agents: ${metrics.totalAgents || 0}`));
    console.log(chalk.gray(`  Active Agents: ${metrics.activeAgents || 0}`));
    console.log(chalk.gray(`  Idle Agents: ${metrics.idleAgents || 0}`));
    console.log(chalk.gray(`  Tasks Completed: ${metrics.totalTasksCompleted || 0}`));
    console.log(chalk.gray(`  Tasks Failed: ${metrics.totalTasksFailed || 0}`));
    console.log(chalk.gray(`  Avg Workload: ${metrics.avgWorkload?.toFixed(2) || 0}%`));

    if (metrics.agentDetails && metrics.agentDetails.length > 0) {
      console.log(chalk.cyan("\n🤖 Agent Details:\n"));
      metrics.agentDetails.forEach((agent, i) => {
        const roleColor = getRoleColor(agent.role);
        console.log(
          chalk.gray(`  ${i + 1}. `) +
          roleColor(`${agent.role.toUpperCase()}`) +
          chalk.gray(`: ${agent.metrics?.tasksCompleted || 0} completed, `) +
          chalk.gray(`${agent.metrics?.tasksFailed || 0} failed`)
        );
      });
    }

    console.log(chalk.gray(`${'='.repeat(50)}\n`));

    // 8 Available Agent Roles:
    console.log(chalk.cyan("\n🎭 Available Agent Roles:\n"));
    const roles = [
      { key: 'code_generation', name: 'Code Generation', desc: 'Write clean, tested code' },
      { key: 'data_engineering', name: 'Data Engineering', desc: 'Schema validation & ETL' },
      { key: 'clinical_analysis', name: 'Clinical Analysis', desc: 'CDC/WHO guidelines' },
      { key: 'testing', name: 'Testing', desc: 'Test coverage & quality' },
      { key: 'security', name: 'Security', desc: 'OWASP & HIPAA compliance' },
      { key: 'api_integration', name: 'API Integration', desc: 'REST/HTTP & OpenAPI' },
      { key: 'database', name: 'Database', desc: 'SQL optimization & migrations' },
      { key: 'devops', name: 'DevOps', desc: 'CI/CD, Docker, Kubernetes' }
    ];

    roles.forEach((role) => {
      const roleColor = getRoleColor(role.key);
      console.log(
        chalk.gray(`  ${roleColor(`[${role.key.toUpperCase()}]`)} `) +
        chalk.white(role.name.padEnd(20)) +
        chalk.gray(` - ${role.desc}`)
      );
    });

  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

async function listModels(options) {
  const agent = new CodingAgent({ provider: options.provider });
  const spinner = ora("Fetching models...").start();

  try {
    const models = await agent.listModels();
    spinner.stop();

    if (models.length === 0) {
      console.log("No models found or provider not available.");
    } else {
      console.log("\nAvailable models:");
      models.forEach((model) => console.log(`  - ${model}`));
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
  }
}

function getAgentNumber(role) {
  const roleMap = {
    code_generation: 1,
    data_engineering: 2,
    clinical_analysis: 3,
    testing: 4,
    security: 5,
    api_integration: 6,
    database: 7,
    devops: 8
  };
  return roleMap[role] || 0;
}

function getRoleColor(role) {
  const colors = {
    code_generation: chalk.cyan,
    data_engineering: chalk.green,
    clinical_analysis: chalk.magenta,
    testing: chalk.yellow,
    security: chalk.red,
    api_integration: chalk.blue,
    database: chalk.gray,
    devops: chalk.whiteBright
  };
  return colors[role] || chalk.white;
}

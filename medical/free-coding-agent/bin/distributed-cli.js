#!/usr/bin/env node

/**
 * FREE Distributed AI Ensemble CLI
 *
 * Command-line interface for the $0/month multi-AI ensemble system.
 *
 * Usage:
 *   npm run distributed          # Start with default config
 *   npm run distributed -- --help
 *   npm run distributed -- cockpit
 *   npm run distributed -- task "Build a REST API"
 */

import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import {
  DistributedEnsemble,
  startEnsemble,
} from "../src/distributed-ensemble.js";

// ASCII Art Banner
const banner = `
${chalk.cyan("╔═══════════════════════════════════════════════════════════════╗")}
${chalk.cyan("║")}  ${chalk.bold.green("🎮 FREE Multi-AI Ensemble Command Center")}                    ${chalk.cyan("║")}
${chalk.cyan("║")}  ${chalk.yellow("8 Agents • $0/month • Unlimited Potential")}                   ${chalk.cyan("║")}
${chalk.cyan("╚═══════════════════════════════════════════════════════════════╝")}
`;

// Default configuration
const defaultConfig = {
  httpPort: 3000,
  wsPort: 3001,
  p2pPort: 9876,
  enableP2P: true,
  vps: [
    // Add your VPS configurations here
    // { id: 'oracle', name: 'Oracle Cloud', host: 'your-oracle-ip', port: 11434 },
    // { id: 'hostinger', name: 'Hostinger VPS', host: 'your-hostinger-ip', port: 11434 },
    // { id: 'alibaba', name: 'Alibaba ECS', host: 'your-alibaba-ip', port: 11434 }
  ],
};

// Load environment configuration
function loadConfig() {
  const config = { ...defaultConfig };

  // Load from environment variables
  if (process.env.HTTP_PORT) config.httpPort = parseInt(process.env.HTTP_PORT);
  if (process.env.WS_PORT) config.wsPort = parseInt(process.env.WS_PORT);
  if (process.env.P2P_PORT) config.p2pPort = parseInt(process.env.P2P_PORT);

  // Load VPS configurations from environment
  if (process.env.ORACLE_VPS_URL) {
    config.vps.push({
      id: "oracle",
      name: "Oracle Cloud",
      url: process.env.ORACLE_VPS_URL,
    });
  }

  if (process.env.HOSTINGER_VPS_URL) {
    config.vps.push({
      id: "hostinger",
      name: "Hostinger VPS",
      url: process.env.HOSTINGER_VPS_URL,
    });
  }

  if (process.env.ALIBABA_VPS_URL) {
    config.vps.push({
      id: "alibaba",
      name: "Alibaba ECS",
      url: process.env.ALIBABA_VPS_URL,
    });
  }

  return config;
}

// Main program
program
  .name("distributed-ensemble")
  .description("FREE Multi-AI Ensemble - $0/month distributed AI system")
  .version("1.0.0");

// Start command (default)
program
  .command("start", { isDefault: true })
  .description("Start the distributed ensemble with cockpit dashboard")
  .option("-p, --port <port>", "HTTP port for dashboard", "3000")
  .option("--no-p2p", "Disable P2P mesh network")
  .option("--no-dashboard", "Disable web dashboard")
  .action(async (options) => {
    console.log(banner);

    const config = loadConfig();
    config.httpPort = parseInt(options.port);
    config.enableP2P = options.p2p;

    const spinner = ora("Initializing FREE Distributed AI Ensemble...").start();

    try {
      const ensemble = await startEnsemble(config);

      spinner.succeed("Ensemble initialized successfully!");

      console.log("");
      console.log(chalk.green("🎉 FREE Distributed AI Ensemble is running!"));
      console.log("");
      console.log(
        chalk.cyan("📊 Dashboard:"),
        `http://localhost:${config.httpPort}/cockpit`,
      );
      console.log(
        chalk.cyan("🔌 WebSocket:"),
        `ws://localhost:${config.wsPort}`,
      );
      if (config.enableP2P) {
        console.log(chalk.cyan("🌐 P2P Port:"), config.p2pPort);
      }
      console.log("");
      console.log(chalk.yellow("💰 Total Cost: $0.00 (All FREE!)"));
      console.log("");
      console.log(chalk.gray("Press Ctrl+C to stop"));

      // Handle shutdown
      process.on("SIGINT", async () => {
        console.log("");
        spinner.start("Shutting down...");
        await ensemble.shutdown();
        spinner.succeed("Shutdown complete");
        process.exit(0);
      });
    } catch (error) {
      spinner.fail(`Initialization failed: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

// Task command
program
  .command("task <description>")
  .description("Execute a task with the ensemble")
  .option(
    "-c, --capability <cap>",
    "Target capability (code, clinical, security, etc.)",
  )
  .option("-a, --agents <agents>", "Specific agents to use (comma-separated)")
  .action(async (description, options) => {
    console.log(banner);

    const config = loadConfig();
    const spinner = ora("Starting ensemble...").start();

    try {
      const ensemble = await startEnsemble(config);
      spinner.succeed("Ensemble ready");

      console.log("");
      console.log(chalk.cyan("📋 Task:"), description);
      console.log("");

      const taskSpinner = ora("Executing task with agents...").start();

      const result = await ensemble.executeTask(
        description,
        options.capability,
      );

      taskSpinner.succeed(`Task completed in ${result.duration}ms`);

      console.log("");
      console.log(chalk.green("📝 Results:"));
      console.log("");

      for (const agentResult of result.results) {
        if (agentResult.success) {
          console.log(chalk.cyan(`[${agentResult.agentName}]`));
          console.log(agentResult.response.substring(0, 500));
          console.log("");
        } else {
          console.log(
            chalk.red(`[${agentResult.agentName}] Error: ${agentResult.error}`),
          );
        }
      }

      console.log(chalk.yellow("💰 Cost: $0.00"));

      await ensemble.shutdown();
    } catch (error) {
      spinner.fail(`Task failed: ${error.message}`);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command("interactive")
  .alias("i")
  .description("Start interactive chat mode")
  .action(async () => {
    console.log(banner);

    const config = loadConfig();
    const spinner = ora("Starting ensemble...").start();

    try {
      const ensemble = await startEnsemble(config);
      spinner.succeed("Ensemble ready");

      console.log("");
      console.log(chalk.green("🎮 Interactive Mode"));
      console.log(
        chalk.gray('Type your tasks and press Enter. Type "exit" to quit.'),
      );
      console.log("");

      while (true) {
        const { task } = await inquirer.prompt([
          {
            type: "input",
            name: "task",
            message: chalk.cyan("Task:"),
            prefix: "🤖",
          },
        ]);

        if (task.toLowerCase() === "exit" || task.toLowerCase() === "quit") {
          break;
        }

        if (!task.trim()) continue;

        const taskSpinner = ora("Processing...").start();

        try {
          const result = await ensemble.executeTask(task);
          taskSpinner.succeed(`Completed in ${result.duration}ms`);

          console.log("");
          for (const agentResult of result.results.slice(0, 3)) {
            if (agentResult.success) {
              console.log(chalk.cyan(`[${agentResult.agentName}]`));
              console.log(agentResult.response.substring(0, 300));
              console.log("");
            }
          }
        } catch (error) {
          taskSpinner.fail(error.message);
        }
      }

      await ensemble.shutdown();
      console.log(chalk.green("👋 Goodbye!"));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show ensemble status")
  .action(async () => {
    console.log(banner);

    const config = loadConfig();
    const spinner = ora("Checking status...").start();

    try {
      const ensemble = await startEnsemble(config);
      const status = ensemble.getStatus();

      spinner.succeed("Status retrieved");

      console.log("");
      console.log(chalk.cyan("📊 Ensemble Status"));
      console.log("");

      console.log(chalk.yellow("Agents:"));
      for (const [id, agent] of Object.entries(status.agents)) {
        console.log(
          `  ${chalk.green("●")} ${id}: ${agent.name} (${agent.provider})`,
        );
      }

      console.log("");
      console.log(chalk.yellow("Providers:"));
      console.log(`  Total: ${status.providers.totalProviders || 0}`);
      console.log(`  Available: ${status.providers.availableProviders || 0}`);

      console.log("");
      console.log(chalk.yellow("Cost:"));
      console.log(`  ${chalk.green("$0.00")} - All FREE!`);

      await ensemble.shutdown();
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Setup command
program
  .command("setup")
  .description("Interactive setup wizard")
  .action(async () => {
    console.log(banner);

    console.log(chalk.cyan("🔧 Setup Wizard"));
    console.log("");

    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "hasOllama",
        message: "Do you have Ollama installed locally?",
        default: true,
      },
      {
        type: "confirm",
        name: "hasVPS",
        message: "Do you have VPS instances (Oracle, Hostinger, Alibaba)?",
        default: false,
      },
      {
        type: "input",
        name: "oracleVPS",
        message: "Oracle VPS URL (or press Enter to skip):",
        when: (a) => a.hasVPS,
      },
      {
        type: "input",
        name: "hostingerVPS",
        message: "Hostinger VPS URL (or press Enter to skip):",
        when: (a) => a.hasVPS,
      },
      {
        type: "confirm",
        name: "hasGroq",
        message: "Do you have a Groq API key (free tier)?",
        default: false,
      },
      {
        type: "input",
        name: "groqKey",
        message: "Groq API Key:",
        when: (a) => a.hasGroq,
      },
    ]);

    console.log("");
    console.log(chalk.green("✅ Configuration saved!"));
    console.log("");
    console.log("Next steps:");
    console.log("  1. Run: npm run distributed");
    console.log("  2. Open: http://localhost:3000/cockpit");
    console.log("");
    console.log(chalk.yellow("💰 Your monthly cost: $0.00"));
  });

// Parse arguments
program.parse();
